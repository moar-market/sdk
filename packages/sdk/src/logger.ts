import { isDebugEnabled } from './config'

/**
 * Manual debug override.
 * If set to true or false, overrides the default debug behavior.
 * If null, uses the value from isDebugEnabled().
 */
let debugOverride: boolean | null = null

/**
 * Determines if debug logging should be enabled.
 * @returns {boolean} True if debug logging is enabled, false otherwise.
 */
function shouldDebug(): boolean {
  if (debugOverride !== null) {
    return debugOverride
  }

  try {
    return isDebugEnabled()
  }
  catch {
    return false
  }
}

/**
 * Logger interface for debug logging and debug state management.
 */
export interface Logger {
  debug: (...data: any[]) => void
  warn: (...data: any[]) => void
  enableDebug: () => void
  disableDebug: () => void
  resetDebug: () => void
}

/**
 * Simple logger implementation for debug logging.
 */
export const logger: Logger = {
  /**
   * Logs debug information to the console if debug is enabled.
   * @param data - The data to log.
   */
  debug: (...data: any[]): void => {
    if (shouldDebug()) {
      // eslint-disable-next-line no-console
      console.log(...data)
    }
  },

  /**
   * Logs warning information to the console.
   * @param data - The data to log.
   */
  warn: (...data: any[]): void => {
    console.warn(...data)
  },

  /**
   * Enables debug logging, overriding the default behavior.
   */
  enableDebug: (): void => {
    debugOverride = true
  },

  /**
   * Disables debug logging, overriding the default behavior.
   */
  disableDebug: (): void => {
    debugOverride = false
  },

  /**
   * Resets debug override to use the default debug behavior.
   */
  resetDebug: (): void => {
    debugOverride = null
  },
}
