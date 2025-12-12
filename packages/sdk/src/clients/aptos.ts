import type {
  AccountAddressInput,
  AptosSettings,
  ClientConfig,
  InputGenerateTransactionOptions,
  InputViewFunctionData,
  LedgerVersionArg,
  MoveStructId,
  MoveValue,
  Network,
  ViewFunctionABI,
} from '@aptos-labs/ts-sdk'
import type { CacheOptions } from './../config'
import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk'
import {
  getFunctionCacheOptions,
  isCacheViewEnabled,
  isRouteViewEnabled,
  useChainConfig,
  useMoarApi,
} from './../config'

const MICROS_PER_SECOND = 1_000_000
const DEFAULT_LEDGER_EXPIRATION_BUFFER_SEC = 120

declare module '@aptos-labs/ts-sdk' {
  interface Aptos {
    /**
     * Sets the global ledger version for all future view/getAccountResource calls.
     * This is a global setting and will be used only when you want to view data at a specific ledger version.
     * To reset to the latest version, set the value to undefined.
     *
     * @example
     * const aptos = useAptos();
     * aptos.setLedgerVersion(3151821422); // sets global ledger version
     * const balance = await fetchFungibleBalance(userAddress, aptosFA);
     * aptos.setLedgerVersion(undefined); // resets to latest version
     */
    setLedgerVersion?: (value: number | undefined) => void
    /**
     * Gets the global ledger version used for all the calls which does not set explicit ledger version on
     * view/getAccountResource calls.
     * To reset to the latest version, call setLedgerVersion with undefined.
     *
     * @example
     * const aptos = useAptos();
     * const ledgerVersion = aptos.getLedgerVersion();
     */
    getLedgerVersion?: () => number | undefined
    /**
     * Returns an expiration timestamp aligned with the latest on-chain ledger timestamp.
     * Falls back to the local clock if the ledger info request fails.
     *
     * @example
     * const aptos = useAptos();
     * const expireAt = await aptos.getLedgerAlignedExpirationTimestamp();
     */
    getLedgerAlignedExpirationTimestamp?: (bufferSec?: number) => Promise<number>
    /**
     * Returns transaction options that include a ledger-aligned expiration timestamp.
     * If the provided options already include an expiration timestamp, they are returned as-is.
     *
     * @example
     * const aptos = useAptos();
     * const options = await aptos.ensureLedgerExpirationOptions(existingOptions);
     */
    ensureLedgerExpirationOptions?: (
      options?: InputGenerateTransactionOptions,
      bufferSec?: number,
    ) => Promise<InputGenerateTransactionOptions>
  }
}

let aptosInstance: Aptos
let ledgerVersion: number | undefined
let originalAptosView: typeof Aptos.prototype.view
let originalAptosGetAccountResource: typeof Aptos.prototype.getAccountResource

function getLedgerVersionArg(options?: LedgerVersionArg): LedgerVersionArg {
  const ledgerVersionToUse = options?.ledgerVersion !== undefined
    ? options.ledgerVersion
    : ledgerVersion

  return { ledgerVersion: ledgerVersionToUse }
}

export async function getLedgerAlignedExpirationTimestamp(options?: {
  aptos?: Aptos
  config?: AptosConfig
  bufferSec?: number
}): Promise<number> {
  const bufferSec = options?.bufferSec ?? DEFAULT_LEDGER_EXPIRATION_BUFFER_SEC
  const client = options?.aptos
    ?? (options?.config ? new Aptos(options.config) : useAptos())
  try {
    const ledgerInfo = await client.getLedgerInfo()
    const ledgerTimestampSec = Math.ceil(Number(ledgerInfo.ledger_timestamp) / MICROS_PER_SECOND)
    return ledgerTimestampSec + bufferSec
  }
  catch {
    return Math.ceil(Date.now() / 1000) + bufferSec
  }
}

export async function ensureLedgerExpirationOptions(args?: {
  options?: InputGenerateTransactionOptions
  aptos?: Aptos
  config?: AptosConfig
  bufferSec?: number
}): Promise<InputGenerateTransactionOptions> {
  const options = args?.options
  if (options?.expireTimestamp !== undefined) {
    return options
  }

  const expireTimestamp = await getLedgerAlignedExpirationTimestamp({
    aptos: args?.aptos,
    config: args?.config,
    bufferSec: args?.bufferSec,
  })

  if (options) {
    return {
      ...options,
      expireTimestamp,
    }
  }

  return { expireTimestamp }
}

export function useAptos(): Aptos {
  const chain = useChainConfig()
  // Recreate aptos client if not initialized or if RPC URL changed
  // Using RPC URL for comparison since chainId is async
  if (!aptosInstance || chain.rpc !== aptosInstance.config.fullnode) {
    aptosInstance = new Aptos(useAptosConfig())

    // override view to use instance level ledger version
    originalAptosView = aptosInstance.view.bind(aptosInstance)
    aptosInstance.view = async function <T extends Array<MoveValue>>(args: {
      payload: InputViewFunctionData
      options?: LedgerVersionArg
      cache?: CacheOptions
    }): Promise<T> {
      // Determine cache options
      let cache: CacheOptions | undefined
      if (isCacheViewEnabled()) {
        cache = args.cache || getFunctionCacheOptions(args.payload.function) // explicit or default cache
      }

      const options = getLedgerVersionArg(args.options)

      // if cache is enabled or route view is enabled, call Moar `/view`
      if (isRouteViewEnabled() || cache) {
        // If no cache rule, set ttl: 0 a default
        let cacheForRequest: CacheOptions = { ttl: 0 } // default to no caching
        if (options.ledgerVersion !== undefined) {
          cacheForRequest = { ttl: 60 * 60 * 24 } // cache specific ledger versions for 24 hours
        }
        else if (cache) {
          cacheForRequest = cache
        }

        let response: Response | undefined
        try {
          const abiString = args.payload.abi && viewFunctionAbiToString(args.payload.abi, args.payload.function)
          response = await fetch(`${useMoarApi()}/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              payload: { ...args.payload, abi: abiString },
              options,
              cache: cacheForRequest,
            }),
          })
        }
        catch (networkError) {
          console.error('no moar view network failed', networkError)
        }

        if (response && response.ok) {
          let body: any
          try {
            body = await response.json()
          }
          catch (jsonError) {
            console.error('no moar view parse failed', jsonError)
          }

          if (body?.error) {
            throw new Error(body.error)
          }

          if (body?.data !== undefined) {
            return body.data
          }
        }

        // continue to original view function if error or 500
        console.error('no moar view internal failed', response?.status)
      }

      // Fallback to original view
      return await originalAptosView({
        payload: args.payload,
        options,
      })
    }

    originalAptosGetAccountResource = aptosInstance.getAccountResource.bind(aptosInstance)
    aptosInstance.getAccountResource = async function <T extends object = any>(args: {
      accountAddress: AccountAddressInput
      resourceType: MoveStructId
      options?: LedgerVersionArg
    }): Promise<T> {
      return await originalAptosGetAccountResource({
        ...args,
        options: getLedgerVersionArg(args.options),
      })
    }

    // add helper for ledger version management
    Object.assign(aptosInstance, {
      setLedgerVersion: (value: number | undefined) => { ledgerVersion = value },
      getLedgerVersion: () => ledgerVersion,
      getLedgerAlignedExpirationTimestamp: (bufferSec?: number) =>
        getLedgerAlignedExpirationTimestamp({ aptos: aptosInstance, bufferSec }),
      ensureLedgerExpirationOptions: (options?: InputGenerateTransactionOptions, bufferSec?: number) =>
        ensureLedgerExpirationOptions({ aptos: aptosInstance, options, bufferSec }),
    })
  }

  return aptosInstance
}

let aptosConfig: AptosConfig
export function useAptosConfig(): AptosConfig {
  const chain = useChainConfig()
  // Recreate aptos config if not initialized or if RPC URL changed
  // Using RPC URL for comparison since chainId is async
  let clientConfig: ClientConfig | undefined
  if (chain.apiKey) {
    clientConfig = {
      API_KEY: chain.apiKey,
    }
  }

  if (!aptosConfig || chain.rpc !== aptosConfig.fullnode || chain.apiKey !== aptosConfig.clientConfig?.API_KEY) {
    const config: AptosSettings = {
      network: chain.name as Network,
      fullnode: chain.rpc,
      indexer: chain.indexer,
      clientConfig,
    }
    aptosConfig = new AptosConfig(config)
  }

  return aptosConfig
}

/**
 * Converts a ViewFunctionABI and function name into a JSON string representation
 * compatible with Aptos view function payloads.
 *
 * @param abi - The ABI object describing the view function, including type parameters, parameters, and return types.
 * @param function_name - The fully qualified Move function identifier in the format 'address::module::function'.
 * @returns The JSON string representation of the view function ABI.
 */
export function viewFunctionAbiToString(
  abi: ViewFunctionABI,
  function_name: MoveStructId,
): string {
  const [moduleAddress, moduleName, functionName] = function_name.split('::')

  return JSON.stringify({
    address: moduleAddress,
    name: moduleName,
    exposed_functions: [
      {
        name: functionName,
        visibility: 'public',
        is_entry: false,
        is_view: true,
        generic_type_params: abi.typeParameters.map(param => ({
          constraints: param.constraints.toString(),
        })),
        params: abi.parameters.map(param => param.toString()),
        return: abi.returnTypes.map(returnType => returnType.toString()),
      },
    ],
  })
}
