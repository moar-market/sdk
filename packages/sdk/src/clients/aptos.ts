import type { AptosSettings, ClientConfig, Network } from '@aptos-labs/ts-sdk'
import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk'
import { useChainConfig } from './../config'

let aptosInstance: Aptos

export function useAptos(): Aptos {
  const chain = useChainConfig()
  // Recreate aptos client if not initialized or if RPC URL changed
  // Using RPC URL for comparison since chainId is async
  if (!aptosInstance || chain.rpc !== aptosInstance.config.fullnode) {
    aptosInstance = new Aptos(useAptosConfig())
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
