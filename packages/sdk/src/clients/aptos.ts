import type {
  AccountAddressInput,
  AptosSettings,
  ClientConfig,
  InputViewFunctionData,
  LedgerVersionArg,
  MoveStructId,
  MoveValue,
  Network,
} from '@aptos-labs/ts-sdk'
import type { CacheOptions } from './../config'
import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk'
import { getFunctionCacheOptions, isCacheViewEnabled, useChainConfig, useMoarApi } from './../config'

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
      let cache: CacheOptions | undefined
      if (isCacheViewEnabled()) {
        cache = args.cache || getFunctionCacheOptions(args.payload.function) // explicit or default cache
      }
      // use moar api if cache is enabled and ledger version is not set
      if (cache !== undefined && args.options?.ledgerVersion === undefined) {
        let response: Response | undefined
        delete args.payload.abi
        try {
          response = await fetch(`${useMoarApi()}/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ ...args, cache }),
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

          if (body.error) { // if view errored, throw error
            throw new Error(body.error)
          }

          return body.data
        }

        // continue to original view function if error or 500
        console.error('no moar view internal failed', response?.status)
      }

      // use original view function if ledger version is set or cache is not enabled
      return await originalAptosView({
        payload: args.payload,
        options: getLedgerVersionArg(args.options),
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
