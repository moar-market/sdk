import type { ChainConfig, LendPoolConfig, Modules, StrategyIdentifier } from '../types'
import { config as aptosMainnetConfig } from '../configs/aptos-mainnet.config'

// Store the configuration
let config: Config | null = aptosMainnetConfig

/**
 * Set the blockchain configuration
 * @param newConfig The configuration to set
 */
export function setConfig(newConfig: Config): void {
  config = newConfig
}

/**
 * Get the current blockchain configuration
 * @returns The current configuration or null if not set
 */
export function getConfig(): Config {
  if (!config) {
    throw new Error(
      'Configuration not found: config must be initialized by calling setConfig() before accessing configuration values',
    )
  }

  return config
}

export function isDebugEnabled(): boolean {
  return getConfig().DEBUG || false
}

export function usePanoraApiKey(): string {
  return getConfig().PANORA_API_KEY || ''
}

export function useChainConfig(): ChainConfig {
  return getConfig().CHAIN
}

export function useModuleSettings(): ModuleSettings {
  return getConfig().MOAR_MODULE_SETTINGS
}

export function usePkgsConfig() {
  return getConfig().PKGS
}

export function useModulesConfig() {
  return getConfig().MODULES
}

export function getModuleAddress(moduleName: string) {
  const modules = useModulesConfig()
  const address = modules[moduleName as keyof typeof modules]
  if (!address) {
    throw new Error(`Module address for ${moduleName} is not set`)
  }
  return address
}

export function useLendPoolConfig(): LendPoolConfig[] {
  return getConfig().LEND_POOLS
}

export function useAdaptersConfig(): Record<string, number> {
  return getConfig().ADAPTERS
}

export function useAdapterStrategiesConfig(): Record<string, Omit<StrategyIdentifier, 'strategySubType'>> {
  return getConfig().ADAPTER_STRATEGIES
}

export interface ModuleSettings {
  min_borrow_usd: string // usd price in oracle decimals 8
  min_debt_usd: string // usd price in oracle decimals 8
}

export interface Config {
  DEBUG: boolean
  PANORA_API_KEY: string

  CHAIN: ChainConfig

  readonly PKGS: Record<string, string>
  readonly MODULES: Modules

  readonly LEND_POOLS: LendPoolConfig[]

  readonly ADAPTERS: Record<string, number>
  readonly ADAPTER_STRATEGIES: Record<string, Omit<StrategyIdentifier, 'strategySubType'>>

  readonly MOAR_MODULE_SETTINGS: ModuleSettings
}
