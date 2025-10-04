import type { Address } from './common'
import type { HyperionPoolConfig } from './hyperion'

export interface GoblinVaultConfig {
  name: string
  address: Address
  protocol: 'hyperion'
  poolConfig: HyperionPoolConfig
  performanceFeeRate: number
  reward?: {
    token: string | Address
    poolId: number
  }
}
