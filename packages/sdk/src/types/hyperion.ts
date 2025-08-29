import type { Address } from './common'

/**
 * Hyperion pool configuration
 */
export interface HyperionPoolConfig {
  name: string
  address: Address
  coinAddresses: string[]
  feeTierIndex: number
  weights: number[]
  isWeighted: boolean
  priceDecimals: number // for tokenA price in tokenB or vice versa
}
