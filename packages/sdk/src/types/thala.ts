import type { Address, MoveStructId } from './common'

/**
 * Thala pool configuration
 */
export interface ThalaPoolConfig {
  name: string
  poolId: number
  poolType: string
  lptAddress: string
  coinAddresses: string[]
  isWeighted: boolean
  nullType: string
  weights: number[]
  minSlippage: number
}

/**
 * Thala V2 pool configuration
 */
export interface ThalaV2PoolConfig extends Omit<ThalaPoolConfig, 'coinAddresses'> {
  coinAddresses: Address[]
  address: Address
  lptCoinType: MoveStructId
  xlptAddress?: Address
  isMetastable?: boolean
  rewardIds: string[]
}
