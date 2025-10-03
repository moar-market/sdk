import type { Address } from './common'

/**
 * Pool response from API/blockchain
 */
export interface LendPoolResponse {
  name: string
  underlying_asset: { inner: Address }
  deposit_cap: string
  borrow_cap: string
  fee_on_interest_bps: string
  origination_fee_bps: string
  is_paused: boolean
  total_borrows: string
  total_borrow_shares: string
  total_deposited: string
  pool_owner: Address
  interest_accrued: string
  total_lp_token_supply: string
  interest_rate: string
}

export interface LendPoolIncentiveConfig {
  pool: string // pool underlying asset symbol
  rewards: { token: string, reward_id: string }[] // reward token symbols and ids
}

/**
 * A “knot” in a piecewise linear curve.
 * util: [0…100] (percent utilization) — 0 is the minimum utilization, 100 is the maximum utilization
 * rate: [0…∞) (APR in %, e.g. 10 = 10%) — 0 is the minimum rate, ∞ is the maximum rate
 */
export interface Kink {
  rate: number
  util: number
}

/**
 * Lend pool configuration
 */
export interface LendPoolConfig extends Omit<LendPoolResponse, 'underlying_asset'> {
  readonly id: number
  readonly underlying_asset: Address
  readonly address: Address
  ltvs: { address: Address, ltv: string }[]
  kinks: Kink[]
  reduceLeverage?: Record<Address, number>
  incentives?: LendPoolIncentiveConfig['rewards']
}
