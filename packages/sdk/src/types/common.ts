/**
 * Basic blockchain address type
 */
export type Address = `0x${string}`

/**
 * Move module structure ID format
 * The format is [address]::[module]::[struct]
 */
export type MoveStructId = `${string}::${string}::${string}`

/**
 * Any number type
 */
export type AnyNumber = number | bigint | string

/**
 * Module naming convention
 * First part is the protocol or abi directory name
 * Second part is the module name
 * @example 'moar_credit_manager' -> 'moar' is scope, 'credit_manager' is module name
 */
export type ModuleName = `${string}_${string}`

/**
 * Module address mapping
 */
export interface Modules {
  readonly [key: ModuleName]: Address
}

/**
 * Move objects address mapping
 */
export interface MoveObjects {
  readonly [key: ModuleName]: Address
}

/**
 * Chain configuration type
 */
export interface ChainConfig {
  readonly name: string
  readonly fullname: string
  readonly chainId: number
  readonly isMainnet: boolean
  readonly rpc: string
  readonly indexer: string
  readonly explorerBaseUrl: string
  readonly explorerSuffix: string
  apiKey?: string
}

export interface StrategyIdentifier {
  adapterId: number
  strategyId: number
  strategySubType: Address
}
