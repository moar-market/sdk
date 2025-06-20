import type { Address, StrategyIdentifier } from '../types'
import { moar_credit_manager_abi, moar_lens_abi } from './../abis'
import { useSurfClient } from './../clients'
import { getModuleAddress } from './../config'

function CreditManager() {
  return useSurfClient().useABI(moar_credit_manager_abi, getModuleAddress('moar_credit_manager'))
}

function MoarLens() {
  return useSurfClient().useABI(moar_lens_abi, getModuleAddress('moar_lens'))
}

/**
 * Gets all active credit accounts owned by a user
 * @param userAddress The user's address
 * @returns Array of credit account addresses owned by the user
 */
export async function getCreditAccounts(userAddress: Address): Promise<Address[]> {
  const [accounts] = await CreditManager().view.get_user_active_credit_accounts({
    typeArguments: [],
    functionArguments: [userAddress],
  })

  return accounts
}

/**
 * Gets all(active and inactive) credit accounts owned by a user
 * @param userAddress The user's address
 * @returns Array of credit account addresses owned by the user
 */
export async function getAllCreditAccounts(userAddress: Address): Promise<Address[]> {
  const [accounts] = await CreditManager().view.get_user_credit_accounts({
    typeArguments: [],
    functionArguments: [userAddress],
  })

  return accounts
}

/**
 * Checks if a credit account is healthy
 * @param creditAccount The credit account address
 * @returns True if the account is healthy, false otherwise
 */
export async function isAccountHealthy(creditAccount: Address): Promise<boolean> {
  const [isHealthy] = await CreditManager().view.is_position_healthy({
    typeArguments: [],
    functionArguments: [creditAccount],
  })

  return isHealthy
}

/**
 * Checks if a credit account is in bad debt
 * @param creditAccount The credit account address
 * @returns True if the account is in bad debt, false otherwise
 */
export async function isAccountInBadDebt(creditAccount: Address): Promise<boolean> {
  const [isInBadDebt] = await CreditManager().view.is_bad_debt({
    typeArguments: [],
    functionArguments: [creditAccount],
  })

  return isInBadDebt
}

interface AccountStrategyResponse {
  type: number
  adapter_id: number
  sub_type: Address
}

/**
 * Retrieves the strategies associated with a given credit account.
 * @param creditAccount The address of the credit account.
 * @returns An array of strategy objects, each containing adapterId, strategyId, and strategySubType.
 */
export async function getCreditAccountsStrategies(creditAccount: Address): Promise<StrategyIdentifier[]> {
  const [strategies] = await CreditManager().view.get_credit_account_strategies({
    typeArguments: [],
    functionArguments: [creditAccount],
  }) as unknown as [AccountStrategyResponse[]]

  return strategies.map(({ type, adapter_id, sub_type }): StrategyIdentifier => ({
    adapterId: Number(adapter_id),
    strategyId: Number(type),
    strategySubType: sub_type as Address,
  }))
}

/**
 * Gets the assets and debts associated with a credit account
 * @param creditAccount The credit account address
 * @returns Object containing arrays of asset addresses and debt asset addresses
 */
export async function getAccountAssets(creditAccount: Address): Promise<Address[]> {
  const [, assets] = await CreditManager().view.get_credit_account_debt_pools_and_assets({
    typeArguments: [],
    functionArguments: [creditAccount],
  })

  return assets.map(({ inner }) => inner) as Address[]
}

export interface AccountDebtAndAssetAmounts {
  debtValues: { poolId: number, amount: string }[]
  assetValues: { address: Address, amount: string }[]
}

/**
 * Gets the debt and asset amounts associated with a credit account
 * @param creditAccount The credit account address
 * @returns Object containing arrays of debt data (poolId and amount) and asset data (address and amount)
 */
export async function getAccountDebtAndAssetAmounts(creditAccount: Address): Promise<AccountDebtAndAssetAmounts> {
  const [debtData, assetData] = await MoarLens().view.get_credit_account_debt_and_asset_amounts({
    typeArguments: [],
    functionArguments: [creditAccount],
  }) as unknown as [
    [{ pool_id: number, debt: string }],
    [{ asset: { inner: Address }, amount: string }],
  ]

  return {
    debtValues: debtData.map(({ pool_id, debt }) => ({ poolId: Number(pool_id), amount: debt })),
    assetValues: assetData.map(({ asset: { inner }, amount }) => ({ address: inner, amount })),
  }
}

/**
 * Gets the minimum required account value for a credit account
 * @param creditAccount The credit account address
 * @returns The minimum required account value
 */
export async function getAccountMinRequiredValue(creditAccount: Address): Promise<string> {
  const [minRequiredValue] = await MoarLens().view.get_min_asset_required({
    typeArguments: [],
    functionArguments: [creditAccount],
  })

  return minRequiredValue
}

export interface AccountDebtAndAssetValues {
  debtValue: string
  assetValue: string
}

/**
 * Gets the total debt and total asset values for a credit account
 * @param creditAccount The credit account address
 * @returns Object containing the total debt value and total asset value
 */
export async function getAccountDebtAndAssetValues(creditAccount: Address): Promise<AccountDebtAndAssetValues> {
  const [debtValue, assetValue] = await MoarLens().view.get_credit_account_debt_and_asset_values({
    typeArguments: [],
    functionArguments: [creditAccount],
  })

  return { debtValue, assetValue }
}

export interface AccountHealthMetrics {
  healthFactor: string | undefined
  liquidationPrice: string | undefined
}

export interface AccountHealthMetricsParams {
  creditAccount: Address
  tradeToken: Address
  isLong: boolean
}

/**
 * Gets the health factor and liquidation price for a credit account
 * @param params Object containing the credit account address, trade token address, and long/short position flag
 * @param params.creditAccount The credit account address
 * @param params.tradeToken The trade token address
 * @param params.isLong Boolean indicating if the position is long (true) or short (false)
 * @returns Object containing the health factor and liquidation price
 */
export async function getAccountHealthFactorAndLiquidationPrice(
  { creditAccount, tradeToken, isLong }: AccountHealthMetricsParams,
): Promise<AccountHealthMetrics> {
  const [{ vec: [healthFactor] }, { vec: [liquidationPrice] }] = await MoarLens().view.get_health_metrics({
    typeArguments: [],
    functionArguments: [creditAccount, tradeToken, isLong],
  })

  return { healthFactor, liquidationPrice }
}

export interface EstimatedHealthMetricsParams extends AccountHealthMetricsParams {
  assets?: Address[]
  assetAmounts?: Array<bigint | string | number>
  poolIds?: number[]
  debtAmounts?: Array<bigint | string | number>
  tradeAmount?: bigint | string | number
}

/**
 * Gets the estimated health factor and liquidation price for a credit account with hypothetical changes
 *
 * @param params Object containing the credit account details and hypothetical changes
 * @param params.creditAccount The credit account address
 * @param params.tradeToken The trade token address
 * @param params.isLong Boolean indicating if the position is long (true) or short (false)
 * @param params.assets Array of asset addresses to be considered in the estimation
 * @param params.assetAmounts Array of asset amounts corresponding to the assets array
 * @param params.poolIds Array of pool IDs for debt pools
 * @param params.debtAmounts Array of debt amounts corresponding to the pool IDs
 * @param params.tradeAmount The amount of the trade to be considered
 * @returns Object containing the estimated health factor and liquidation price
 */
export async function getAccountEstHealthFactorAndLiquidationPrice({
  creditAccount,
  tradeToken,
  isLong = true,
  assets = [],
  assetAmounts = [],
  poolIds = [],
  debtAmounts = [],
  tradeAmount = BigInt(0),
}: EstimatedHealthMetricsParams): Promise<AccountHealthMetrics> {
  const [{ vec: [healthFactor] }, { vec: [liquidationPrice] }] = await MoarLens().view.get_estimated_health_metrics({
    typeArguments: [],
    functionArguments: [creditAccount, tradeToken, isLong, assets, assetAmounts, poolIds, debtAmounts, tradeAmount],
  })

  return { healthFactor, liquidationPrice }
}

/**
 * Retrieves all active credit accounts from the credit manager
 *
 * @returns Promise resolving to an array of credit account addresses
 */
export async function getAllActiveCreditAccounts(): Promise<Address[]> {
  const [accounts] = await CreditManager().view.get_all_credit_accounts({
    typeArguments: [],
    functionArguments: [],
  })

  return accounts
}

/**
 * Retrieves all users from the credit manager
 *
 * @returns Promise resolving to an array of user addresses
 */
export async function getAllUsers(): Promise<Address[]> {
  const [users] = await CreditManager().view.get_all_users({
    typeArguments: [],
    functionArguments: [],
  })

  return users
}
