import type {
  AccountAddressInput,
  AptosSettings,
  ClientConfig,
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
        // If no cache rule, set ttl: 0
        let cacheForRequest: CacheOptions | undefined
        if (options.ledgerVersion !== undefined) {
          cacheForRequest = { ttl: 0 } // don't cache specific ledger versions
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
