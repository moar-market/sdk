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
  unbond_period: number
  withdraw_period: number
}

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
}
