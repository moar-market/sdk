/**
 * fetchCache.ts
 *
 * This file contains utility functions to enable and disable
 * fetch caching, as well as a helper to run code with fetch caching.
 */

/**
 * Represents the cached content for a particular request key.
 */
interface CacheEntry {
  data: ArrayBuffer
  status: number
  headers: [string, string][]
  expiresAt?: number // Used for optional TTL (if not provided, the cache will never expire)
}

/**
 * By default, we'll only cache GET requests.
 * If you need more granular control, pass your own implementation.
 */
export type ShouldCacheFn = (req: RequestInfo | URL, init?: RequestInit) => boolean

/**
 * ? The original fetch function. We need to store it so we can restore it later.
 */
let originalFetch: typeof fetch | null = null

/**
 * Simple in-memory cache. If you need more robust behavior, consider using
 * a more advanced caching library or an LRU-based approach.
 */
const cache = new Map<string, CacheEntry>()

/**
 * Generate a cache key from request + init.
 *
 * - Optionally incorporate additional factors (e.g., headers) if you need
 *   to differentiate responses by Accept, Authorization, etc.
 * - By default, we use `<method>:<url>`.
 */
function generateCacheKey(req: RequestInfo | URL, init?: RequestInit): string {
  let url: string
  if (typeof req === 'string') {
    url = req
  }
  else if (req instanceof URL) {
    url = req.toString()
  }
  else if (req instanceof Request) {
    url = req.url
  }
  else {
    url = String(req)
  }

  const method = init?.method ?? (req instanceof Request ? req.method : 'GET')
  // If you want to factor in certain headers, do it here, e.g.:
  // const acceptHeader = init?.headers ? (init.headers as Record<string,string>)['Accept'] : ''
  // return `${method}:${url}:${acceptHeader}`
  return `${method}:${url}`
}

/**
 * Enables the fetch override.
 *
 * @param shouldCache - A function that decides which requests to cache.
 * @param defaultTTL  - If provided, each cached response will expire
 *                      `defaultTTL` milliseconds after retrieval.
 */
export function enableFetchCaching(
  shouldCache: ShouldCacheFn = defaultShouldCache,
  defaultTTL?: number,
) {
  if (originalFetch) {
    return
  }

  originalFetch = globalThis.fetch

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const key = generateCacheKey(input, init)

    if (shouldCache(input, init)) {
      // If we have a cached entry (and it's not expired), return it immediately
      const cachedEntry = cache.get(key)
      if (cachedEntry) {
        if (!isExpired(cachedEntry)) {
          return new CustomResponse(cachedEntry.data, {
            url: extractUrl(input),
            status: cachedEntry.status,
            headers: cachedEntry.headers,
          })
        }
        else {
          // If expired, remove from cache
          cache.delete(key)
        }
      }
    }

    // Otherwise, do the real fetch
    const response = await originalFetch!(input as any, init)

    // If OK and should be cached, store it
    if (response.ok && shouldCache(input, init)) {
      const cloned = response.clone()
      const data = await cloned.arrayBuffer()
      const entry: CacheEntry = {
        data,
        status: cloned.status,
        headers: Array.from((cloned.headers as any).entries()),
      }
      if (defaultTTL && defaultTTL > 0) {
        entry.expiresAt = Date.now() + defaultTTL
      }
      cache.set(key, entry)
    }

    return response
  }
}

/**
 * Disables the fetch override and restores the original fetch.
 */
export function disableFetchCaching(): void {
  if (!originalFetch) {
    return
  }

  globalThis.fetch = originalFetch
  originalFetch = null
}

/**
 * Clears the cached responses.
 */
export function clearCache() {
  cache.clear()
}

/**
 * Run a piece of code with fetch caching temporarily enabled,
 * then automatically disable it afterward.
 *
 * @param callback - the code to run with fetch caching
 * @param shouldCache - optional function to decide which requests to cache
 * @param defaultTTL  - optional TTL in ms for each cached response
 * @returns the result of your callback
 */
export async function withFetchCaching<T>(
  callback: () => Promise<T>,
  shouldCache?: ShouldCacheFn,
  defaultTTL?: number,
): Promise<T> {
  enableFetchCaching(shouldCache, defaultTTL)
  try {
    return await callback()
  }
  finally {
    disableFetchCaching()
  }
}

/**
 * Basic default logic: only cache GET requests.
 */
export function defaultShouldCache(req: RequestInfo | URL, init?: RequestInit) {
  const method = init?.method ?? (req instanceof Request ? req.method : 'GET')
  return method.toUpperCase() === 'GET'
}

/**
 * Helper: checks if the given cache entry is expired.
 */
function isExpired(entry: CacheEntry): boolean {
  if (entry.expiresAt == null) {
    return false
  }
  return Date.now() > entry.expiresAt
}

/**
 * Helper: extracts a URL string from the `input`.
 */
export function extractUrl(input: RequestInfo | URL) {
  if (typeof input === 'string')
    return input
  if (input instanceof URL)
    return input.toString()
  if (input instanceof Request)
    return input.url
  return String(input)
}

/**
 * A custom Response class that allows us to "force" the URL or other
 * read-only properties if needed.
 */
export class CustomResponse extends Response {
  private readonly _forcedUrl?: string

  constructor(
    body?: BodyInit | null,
    init?: ResponseInit & { url?: string },
  ) {
    super(body, init as any)
    if (init?.url) {
      this._forcedUrl = init.url
    }
  }

  override get ok(): boolean {
    return this.status >= 200 && this.status < 300
  }

  override get url(): string {
    return this._forcedUrl ?? super.url
  }
}
