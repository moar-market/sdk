import type { MoveStructId } from '../types'

export interface CacheOptions {
  enabled?: boolean
  ttl?: number
  key?: string
}

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export const CACHED_CALLS = new Map<string, number>([
  // lend pool
  ['get_pool_by_id', DAY * 30], // 30 days
  ['get_all_pools', MINUTE * 2], // 2 minute
  ['get_lp_token_price', MINUTE * 5], // 5 minute
  ['get_farming_pool_apy', MINUTE * 5], // 5 minute
  ['get_lp_shares_and_deposited_amount', MINUTE * 5], // 5 minute

  // farming
  ['claimable_reward_amount', MINUTE * 2], // 2 minute
  ['is_stake_initialized', MINUTE * 2], // 2 minute
  ['isReconcileNeeded', MINUTE * 1], // 2 minute

  // credit manager
  ['get_user_active_credit_accounts', MINUTE * 2], // 2 minute
  ['is_position_healthy', MINUTE * 2], // 2 minute
  ['is_bad_debt', MINUTE * 2], // 2 minute
  ['get_credit_account_strategies', MINUTE * 10], // 10 minute
  ['get_credit_account_debt_pools_and_assets', MINUTE],
  ['get_credit_account_debt_and_asset_amounts', MINUTE],
  ['get_credit_account_debt_and_asset_values', MINUTE],
  ['get_min_asset_required', MINUTE],
  ['get_net_asset_value_and_unrealized_pnl', MINUTE],
  ['get_health_metrics', MINUTE / 2], // 30 seconds

  // hyperion
  ['get_all_positions', MINUTE * 2], // 2 minute
  ['get_amount_by_liquidity', MINUTE], // 1 minute
  ['get_position_info', MINUTE * 2], // 2 minute

  // fungible balance
  ['balance', MINUTE / 2], // 30 seconds

  // oracle
  ['get_price', MINUTE], // 1 minute
  ['get_prices', MINUTE], // 1 minute

  // router
  ['get_custom_token_price', MINUTE], // 1 minute
  ['get_custom_token_prices', MINUTE], // 1 minute

])

export function getFunctionCacheOptions(fn: MoveStructId): CacheOptions | undefined {
  const name = fn.split('::').pop()
  if (!name) {
    return
  }

  const ttl = CACHED_CALLS.get(name) || 0

  if (ttl === 0) {
    return
  }
  return { ttl } // key is optional, server takes care of it based on payload and params
}
