/**
 * Common types for the Moar Market SDK
 */

// export other types here
import type { Address, MoveStructId } from './common'

export * from './common'
export * from './hyperion'
export * from './lend-pool'
export * from './swap'
export * from './thala'

/**
 * Base token configuration type
 */
export interface TokenConfig {
  readonly name: string
  readonly symbol: string
  readonly icon?: string
  readonly icons?: string[]
  readonly address: Address
  readonly decimals: number
  readonly coinType: MoveStructId
  readonly lendPoolId?: number
}

// token data for repay debts with balance and debt
export interface TokenData {
  symbol: string
  address: Address
  decimals: number
  balance: bigint
  debt: bigint
  extra: bigint
  effectiveBalance: bigint
  remainingDebt: bigint
  surplus: bigint
  estimatedInterest: bigint
}
