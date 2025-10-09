import type { Address } from './common'

export interface TappPoolConfig {
  name: string
  address: Address
  coinAddresses: Address[]
  feeTierIndex: number
  isWeighted: boolean
}
