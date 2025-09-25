import type {
  Address,
  ChainConfig,
  GoblinVaultConfig,
  HyperionPoolConfig,
  LendPoolConfig,
  Modules,
  StrategyIdentifier,
  ThalaV2PoolConfig,
  TokenConfig,
} from '../types'
import { config as aptosMainnetConfig } from '../configs/aptos-mainnet.config'

export * from './view-cache'

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
    // this is required for sdk to work
    throw new Error(
      'Configuration not found: config must be initialized by calling setConfig() before accessing configuration values',
    )
  }

  return config
}

export function isDebugEnabled(): boolean {
  return getConfig().DEBUG ?? false // defaults to false
}

export function isCacheViewEnabled(): boolean {
  return getConfig().APTOS_VIEW_FN_CACHE ?? false // defaults to false
}

export function isRouteViewEnabled(): boolean {
  return getConfig().APTOS_ALL_VIEW_FN_ROUTE ?? false // defaults to false
}

export function useMoarApi(): string {
  const api = getConfig().MOAR_API
  if (!api) {
    // this is required for api calls to work
    throw new Error('MOAR_API is not set in the config')
  }

  return api
}

export function setPanoraApiKey(apiKey: string): void {
  getConfig().PANORA_API_KEY = apiKey
}
export function usePanoraApiKey(): string {
  const apiKey = getConfig().PANORA_API_KEY
  if (!apiKey) {
    // this is optional, but recommended, panora api calls works without it
    console.warn('PANORA_API_KEY is not set in the config')
  }
  return apiKey || ''
}

export function setAptosApiKey(apiKey: string): void {
  getConfig().CHAIN.apiKey = apiKey
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
    // this is required for sdk to work
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

export function useTokenConfig(): TokenConfig[] {
  return getConfig().TOKENS
}

/**
 * Get the token config by searching multiple properties
 * @param value - The value to search for
 * @returns The token config or undefined if not found
 */
export function findTokenConfig(value: string): TokenConfig | undefined {
  const lowerValue = value.toLowerCase()
  return getConfig().TOKENS.find(token =>
    token.address.toLowerCase() === lowerValue
    || token.coinType?.toLowerCase() === lowerValue
    || token.symbol.toLowerCase() === lowerValue
    || token.name.toLowerCase() === lowerValue,
  )
}

// aptos only
export function useThalaV2Pools(): ThalaV2PoolConfig[] {
  return getConfig().THALA_V2_POOLS
}

/**
 * Find a thala v2 pool config by asset in and asset out
 * @param assetIn - The asset in
 * @param assetOut - The asset out
 * @returns The matching thala v2 pool or undefined if not found
 */
export function findThalaV2PoolConfig(assetIn: Address, assetOut: Address): ThalaV2PoolConfig | undefined {
  const pools = useThalaV2Pools()
  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]
    if (pool && pool.coinAddresses.includes(assetIn) && pool.coinAddresses.includes(assetOut)) {
      return pool
    }
  }
  return undefined
}

// hyperion
export function useHyperionPools(): HyperionPoolConfig[] {
  return getConfig().HYPERION_POOLS
}

/**
 * Find a hyperion pool config by asset in and asset out
 * @param assetIn - The asset in
 * @param assetOut - The asset out
 * @returns The matching hyperion pool or undefined if not found
 */
export function findHyperionPoolConfig(assetIn: Address, assetOut: Address): HyperionPoolConfig | undefined {
  const pools = useHyperionPools()
  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]
    if (pool && pool.coinAddresses.includes(assetIn) && pool.coinAddresses.includes(assetOut)) {
      return pool
    }
  }
  return undefined
}

// goblin
export function useGoblinVaults(): GoblinVaultConfig[] {
  return getConfig().GOBLIN_VAULTS
}

/**
 * Find a goblin vault config by asset in and asset out
 */
export function findGoblinVaultConfig(assetIn: Address, assetOut: Address): GoblinVaultConfig | undefined {
  const vaults = useGoblinVaults()
  for (let i = 0; i < vaults.length; i++) {
    const vault = vaults[i]
    if (
      vault
      && vault.poolConfig.coinAddresses.includes(assetIn)
      && vault.poolConfig.coinAddresses.includes(assetOut)
    ) {
      return vault
    }
  }
  return undefined
}

export interface ModuleSettings {
  min_borrow_usd: string // usd price in oracle decimals 8
  min_debt_usd: string // usd price in oracle decimals 8
}

export interface Config {
  DEBUG?: boolean
  MOAR_API?: string
  PANORA_API_KEY?: string
  /**
   * Enables caching for certain configured Aptos view functions.
   * When true, view functions specified in the configuration will use cache rules to optimize performance.
   */
  APTOS_VIEW_FN_CACHE?: boolean

  /**
   * When enabled, route all Aptos view() calls through the Moar `/view` API.
   * If a specific function has no cache rule, the caller should set `{ ttl: 0 }`.
   */
  APTOS_ALL_VIEW_FN_ROUTE?: boolean

  CHAIN: ChainConfig

  readonly PKGS: Record<string, string>
  readonly MODULES: Modules

  readonly LEND_POOLS: LendPoolConfig[]

  readonly ADAPTERS: Record<string, number>
  readonly ADAPTER_STRATEGIES: Record<string, Omit<StrategyIdentifier, 'strategySubType'>>

  readonly TOKENS: TokenConfig[]
  readonly HYPERION_POOLS: HyperionPoolConfig[]
  readonly THALA_V2_POOLS: ThalaV2PoolConfig[]
  readonly GOBLIN_VAULTS: GoblinVaultConfig[]

  readonly MOAR_MODULE_SETTINGS: ModuleSettings
}
