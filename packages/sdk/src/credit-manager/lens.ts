import type { Address } from '../types'
import { moar_lens_abi } from './../abis'
import { useSurfClient } from './../clients'
import { getModuleAddress } from './../config'

function MoarLens() {
  return useSurfClient().useABI(moar_lens_abi, getModuleAddress('moar_lens'))
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

export interface PnlWithComponents {
  netAssetValue: string
  unrealizedPnl: string
  totalAssetValue: string
  totalDebtValue: string
  totalCollateralValue: string
  principalBorrowed: Array<{ poolId: number, principal: string }>
}

/**
 * Fetches profit and loss (PnL) and asset components for a user's credit account.
 *
 * Corresponds to the on-chain `get_pnl_with_components` Move function which returns:
 * net_asset_value, abs(unrealized_pnl), is_negative(unrealized_pnl), total_asset_value,
 * total_debt_value, total_collateral_value, principal_borrowed.
 *
 * Includes pending rewards in total asset value calculation.
 *
 * @param creditAccount - The credit account address to query
 * @returns Promise resolving to an object containing:
 *   - `netAssetValue`: Net asset value as a string (USD/base currency, u64 as string)
 *   - `unrealizedPnl`: Unrealized profit and loss as a string (negative values prefixed with "-")
 *   - `totalAssetValue`: Total asset value including pending rewards as a string (USD/base currency, u64 as string)
 *   - `totalDebtValue`: Total debt value as a string (USD/base currency, u64 as string)
 *   - `totalCollateralValue`: Total collateral value as a string (USD/base currency, u64 as string)
 *   - `principalBorrowed`: Array of objects with poolId (string) and principal (bigint) for each debt pool
 */
export async function getPnlWithComponents(creditAccount: Address): Promise<PnlWithComponents> {
  const [
    netAssetValue,
    unrealizedPnlAbs,
    isUPnLNegative,
    totalAssetValue,
    totalDebtValue,
    totalCollateralValue,
    principalBorrowedArr,
  ] = await MoarLens().view.get_pnl_with_components({
    typeArguments: [],
    functionArguments: [creditAccount],
  }) as unknown as [
    string,
    string,
    boolean,
    string,
    string,
    string,
    Array<{ pool_id: number, principal: string }>,
  ]

  const principalBorrowed = principalBorrowedArr.map(({ pool_id, principal }) => ({ poolId: pool_id, principal }))

  return {
    netAssetValue,
    unrealizedPnl: isUPnLNegative ? `-${unrealizedPnlAbs}` : unrealizedPnlAbs,
    totalAssetValue,
    totalDebtValue,
    totalCollateralValue,
    principalBorrowed,
  }
}

export interface EstimatedHealthFactorClAMMParams {
  creditAccount: Address
  assets: Address[]
  assetAmounts: Array<bigint | string | number>
  poolIds: number[]
  debtAmounts: Array<bigint | string | number>
  adapterId: number | string
  liquidityPoolAddress: Address
  estimatedLiquidity: bigint | string | number
  tickLower: number | bigint | string
  tickUpper: number | bigint | string
  pendingFees: Array<bigint | string | number>
}

/**
 * Gets the estimated health factor for a credit account when considering a CLAMM position state
 *
 * @param params Object containing account state and CLAMM position parameters
 * @param params.creditAccount The credit account address
 * @param params.assets Array of asset addresses in the credit account
 * @param params.assetAmounts Array of asset amounts corresponding to assets
 * @param params.poolIds Array of debt pool ids
 * @param params.debtAmounts Array of debt amounts corresponding to poolIds
 * @param params.adapterId Adapter id of the CLAMM position
 * @param params.liquidityPoolAddress Address of the CLAMM liquidity pool
 * @param params.estimatedLiquidity Total position liquidity after the action
 * @param params.tickLower Lower tick of the CLAMM position
 * @param params.tickUpper Upper tick of the CLAMM position
 * @param params.pendingFees Pending fees of the exiting CLAMM position, empty if none
 * @returns Estimated health factor as string, or undefined if not computable
 */
export async function getEstimatedHealthFactorClAMM({
  creditAccount,
  assets,
  assetAmounts,
  poolIds,
  debtAmounts,
  adapterId,
  liquidityPoolAddress,
  estimatedLiquidity,
  tickLower,
  tickUpper,
  pendingFees,
}: EstimatedHealthFactorClAMMParams): Promise<string | undefined> {
  const [{ vec: [healthFactor] }] = await MoarLens().view.get_estimated_health_factor_clamm({
    typeArguments: [],
    functionArguments: [
      creditAccount,
      assets,
      assetAmounts,
      poolIds,
      debtAmounts,
      Number(adapterId),
      liquidityPoolAddress,
      estimatedLiquidity,
      Number(tickLower),
      Number(tickUpper),
      pendingFees,
    ],
  })

  return healthFactor
}
