import type { Address, LendPoolConfig, LendPoolResponse } from '../types'
import type { Kink } from '../utils'
import { unScale } from '@itsmnthn/big-utils'
import { moar_interest_rate_model_abi, moar_lens_abi, moar_pool_abi } from './../abis'
import { useSurfClient } from './../clients'
import { getModuleAddress } from './../config'

export interface UserPositionParams {
  poolId: number
  user: Address
}

export interface UserPositionResponse {
  shares: string
  shareAmount: string
  unbondingShares: string
  unbondingAmount: string
  unbondingTime: number
}

/**
 * Fetches a user's position details in a lending pool
 *
 * @param {UserPositionParams} params - Parameters for the query
 * @param {number} params.poolId - The ID of the lending pool to query
 * @param {Address} params.user - The address of the user whose position to query
 * @returns {Promise<UserPositionResponse>} A promise that resolves to the user's position details
 * @throws Will throw an error if the view function call fails - network request failure
 * @example
 * ```ts
 * const position = await getUserPosition({
 *   poolId: 1,
 *   user: "0x123..."
 * });
 * console.log(position.shares); // "1000000"
 * console.log(position.unbondingTime); // 1634567890
 * ```
 */
export async function getUserPosition({ poolId, user }: UserPositionParams): Promise<UserPositionResponse> {
  const moduleAddress = getModuleAddress('moar_lens')
  const data = await useSurfClient().useABI(
    moar_lens_abi,
    moduleAddress,
  ).view.get_lp_shares_and_deposited_amount({
    typeArguments: [],
    functionArguments: [poolId, user],
  })

  const res = {
    shares: data[0] ?? '0',
    shareAmount: data[1] ?? '0',
    unbondingShares: data[2] ?? '0',
    unbondingAmount: data[3] ?? '0',
    unbondingTime: Number(data[4] ?? '0'),
  }

  return res
}

export interface UnbondingInfo {
  shares: string
  amount: string
  unbondTime: number
}

/**
 * Retrieves the unbonding information for a user in a specific lending pool.
 *
 * @param {Address} userAddress - The address of the user.
 * @param {number|string} poolId - The ID of the lending pool.
 * @returns {Promise<UnbondingInfo>} An object containing the shares, amount, and unbond time.
 * @throws Will throw an error if the view function call fails - network request failure
 */
export async function getUnbondingInfo(
  userAddress: Address,
  poolId: number | string,
): Promise<UnbondingInfo> {
  const moduleAddress = getModuleAddress('moar_pool')
  const [shares, amount, unbondTime] = await useSurfClient().useABI(
    moar_pool_abi,
    moduleAddress,
  ).view.get_unbonding_info({
    typeArguments: [],
    functionArguments: [userAddress, poolId],
  })

  return {
    shares: shares ?? '0',
    amount: amount ?? '0',
    unbondTime: Number(unbondTime ?? '0'),
  }
}

/**
 * Retrieves all lending pools from the protocol
 * @returns {Promise<LendPoolConfig[]>} Array of lending pool configurations
 * @throws Will throw an error if the view function call fails - network request failure
 */
export async function getAllPools(): Promise<LendPoolConfig[]> {
  const moduleAddress = getModuleAddress('moar_pool')
  const [data] = await useSurfClient().useABI(
    moar_pool_abi,
    moduleAddress,
  ).view.get_all_pools({
    typeArguments: [],
    functionArguments: [],
  }) as [LendPoolResponse[]]
  const pools = await Promise.all(data.map(async (pool, index) => {
    const address = await getPoolById(index)
    return formatLendPoolConfig(pool, address, index)
  }))

  return pools
}

/**
 * Retrieves a lending pool configuration by its pool ID.
 *
 * @param {number|string} poolId - The ID of the lending pool to retrieve.
 * @returns {Promise<Address | undefined>} The lending pool configuration.
 * @throws Will throw an error if the view function call fails - network request failure
 */
export async function getPoolById(poolId: number | string): Promise<Address> {
  const moduleAddress = getModuleAddress('moar_pool')
  const [data] = await useSurfClient().useABI(
    moar_pool_abi,
    moduleAddress,
  ).view.get_pool_by_id({
    typeArguments: [],
    functionArguments: [poolId],
  })

  return data.inner
}

/**
 * Retrieves the total number of lending pools in the protocol.
 *
 * @returns {Promise<number>} The total number of pools.
 * @throws Will throw an error if the view function call fails - network request failure
 */
export async function getTotalNumberOfPools(): Promise<number> {
  const moduleAddress = getModuleAddress('moar_pool')
  const [totalPools] = await useSurfClient().useABI(
    moar_pool_abi,
    moduleAddress,
  ).view.total_number_of_pools({
    typeArguments: [],
    functionArguments: [],
  })

  return Number(totalPools)
}

/**
 * Retrieves the current interest rate and interest fee for a given lending pool.
 *
 * @param {number|string} poolId - The ID of the lending pool to query.
 * @returns {Promise<{ interestRate: number, interestFee: number }>} An object containing the interest rate (APR for borrowers) and interest fee (APR for lenders = interestRate - interestFee).
 * @throws Will throw an error if the view function call fails - network request failure
 */
export async function getInterestRate(poolId: number | string): Promise<{ interestRate: string, interestFee: string }> {
  const moduleAddress = getModuleAddress('moar_pool')
  const [interestRate, interestFee] = await useSurfClient().useABI(
    moar_pool_abi,
    moduleAddress,
  ).view.get_interest_rate({
    typeArguments: [],
    functionArguments: [poolId],
  })

  return { interestRate, interestFee }
}

/**
 * Retrieves the piecewise linear interest rate model for a specific lending pool
 *
 * @param {number|string} poolId - The ID of the lending pool to query
 * @returns {Promise<Kink[]>} A promise that resolves to an array of rate points defining the interest rate model
 * @throws Will throw an error if the view function call fails - network request failure
 */
export async function getPiecewiseLinearModel(poolId: number | string): Promise<Kink[]> {
  const moduleAddress = getModuleAddress('moar_interest_rate_model')
  const data = await useSurfClient().useABI(
    moar_interest_rate_model_abi,
    moduleAddress,
  ).view.get_piecewise_linear_model({
    typeArguments: [],
    functionArguments: [poolId],
  })

  const rates = data.map(point => Number(unScale(point, 6))).splice(0, 5)
  const utilization = [0, ...data.map(point => Number(unScale(point, 6))).splice(5, 4)]

  return rates.map((rate, i): Kink => ({
    rate,
    util: utilization[i] === undefined ? 100 : utilization[i],
  }))
}

export interface GetBorrowsOfParams {
  poolId: number | string
  creditAccount: `0x${string}`
}

export interface GetBorrowsOfResponse {
  borrowAmount: string
  underlying: Address
}

/**
 * Retrieves the borrow amount and associated metadata for a given pool and credit account.
 *
 * @param {GetBorrowsOfParams} params - The parameters for the query.
 * @param {number|string} params.poolId - The ID of the lending pool to query.
 * @param {`0x${string}`} params.creditAccount - The address of the credit account.
 * @returns {Promise<GetBorrowsOfResponse>} An object containing the borrow amount and metadata.
 * @throws Will throw an error if the view function call fails - network request failure
 */
export async function getBorrowsOf(
  { poolId, creditAccount }: GetBorrowsOfParams,
): Promise<GetBorrowsOfResponse> {
  const moduleAddress = getModuleAddress('moar_pool')
  const [borrowAmount, metadata] = await useSurfClient().useABI(
    moar_pool_abi,
    moduleAddress,
  ).view.get_borrows_of({
    typeArguments: [],
    functionArguments: [poolId, creditAccount],
  })

  return { borrowAmount, underlying: metadata.inner }
}

/**
 * Retrieves the underlying asset address for a given pool.
 * @param {number|string} poolId - The ID of the lending pool to query.
 * @returns {Promise<Address>} The underlying asset address.
 * @throws Will throw an error if the view function call fails - network request failure
 */
export async function getPoolAsset(poolId: number | string): Promise<Address> {
  const moduleAddress = getModuleAddress('moar_pool')
  const [underlyingAsset] = await useSurfClient().useABI(
    moar_pool_abi,
    moduleAddress,
  ).view.get_pool_asset({
    typeArguments: [],
    functionArguments: [poolId],
  })

  return underlyingAsset.inner
}

/**
 * Retrieves the LP token supply for a given pool.
 *
 * @param {number|string} poolId - The ID of the lending pool to query.
 * @returns {Promise<string>} The LP token supply as a string.
 * @throws Will throw an error if the view function call fails - network request failure
 */
export async function lpTokenSupply(poolId: number | string): Promise<string> {
  const moduleAddress = getModuleAddress('moar_pool')
  const [supply] = await useSurfClient().useABI(
    moar_pool_abi,
    moduleAddress,
  ).view.lp_token_supply({
    typeArguments: [],
    functionArguments: [poolId],
  })

  return supply
}

/**
 * Retrieves the reserve balance for a given pool.
 *
 * @param {number|string} poolId - The ID of the lending pool to query.
 * @returns {Promise<string>} The reserve balance as a string.
 * @throws Will throw an error if the view function call fails - network request failure
 */
export async function poolReserve(poolId: number | string): Promise<string> {
  const moduleAddress = getModuleAddress('moar_pool')
  const [reserve] = await useSurfClient().useABI(
    moar_pool_abi,
    moduleAddress,
  ).view.pool_reserve({
    typeArguments: [],
    functionArguments: [poolId],
  })

  return reserve
}

/**
 * Retrieves the total borrows for a given pool.
 *
 * @param {number|string} poolId - The ID of the lending pool to query.
 * @returns {Promise<string>} The total borrows as a string.
 * @throws Will throw an error if the view function call fails - network request failure
 */
export async function poolTotalBorrows(poolId: number | string): Promise<string> {
  const moduleAddress = getModuleAddress('moar_pool')
  const [totalBorrows] = await useSurfClient().useABI(
    moar_pool_abi,
    moduleAddress,
  ).view.pool_total_borrows({
    typeArguments: [],
    functionArguments: [poolId],
  })

  return totalBorrows
}

/**
 * Retrieves the total deposited amount for a given pool.
 *
 * @param {number|string} poolId - The ID of the lending pool to query.
 * @returns {Promise<string>} The total deposited as a string.
 * @throws Will throw an error if the view function call fails - network request failure
 */
export async function poolTotalDeposited(poolId: number | string): Promise<string> {
  const moduleAddress = getModuleAddress('moar_pool')
  const [totalDeposited] = await useSurfClient().useABI(
    moar_pool_abi,
    moduleAddress,
  ).view.pool_total_deposited({
    typeArguments: [],
    functionArguments: [poolId],
  })

  return totalDeposited
}

export interface ConvertLpSharesToAmountParams {
  poolId: number | string
  shares: number | string
}

/**
 * Converts LP shares to the underlying asset amount for a given pool.
 *
 * @param {ConvertLpSharesToAmountParams} params - The parameters for the query.
 * @param {number|string} params.poolId - The ID of the lending pool to query.
 * @param {number|string} params.shares - The number of LP shares to convert.
 * @returns {Promise<string>} The underlying asset amount as a string.
 * @throws Will throw an error if the view function call fails - network request failure
 */
export async function convertLpSharesToAmount(
  { poolId, shares }: ConvertLpSharesToAmountParams,
): Promise<string> {
  const moduleAddress = getModuleAddress('moar_pool')
  const [amount] = await useSurfClient().useABI(
    moar_pool_abi,
    moduleAddress,
  ).view.convert_lp_shares_to_amount({
    typeArguments: [],
    functionArguments: [poolId, shares],
  })

  return amount
}

export interface ConvertAmountToLpSharesParams {
  poolId: number | string
  amount: number | string
}

/**
 * Converts an underlying asset amount to LP shares for a given pool.
 *
 * @param {ConvertAmountToLpSharesParams} params - The parameters for the query.
 * @param {number|string} params.poolId - The ID of the lending pool to query.
 * @param {number|string} params.amount - The amount of underlying asset to convert.
 * @returns {Promise<string>} The LP shares as a string.
 * @throws Will throw an error if the view function call fails - network request failure
 */
export async function convertAmountToLpShares(
  { poolId, amount }: ConvertAmountToLpSharesParams,
): Promise<string> {
  const moduleAddress = getModuleAddress('moar_pool')
  const [shares] = await useSurfClient().useABI(
    moar_pool_abi,
    moduleAddress,
  ).view.convert_amount_to_lp_shares({
    typeArguments: [],
    functionArguments: [poolId, amount],
  })

  return shares
}

/**
 * Gets the LP token price for a given pool.
 *
 * @param {number|string} poolId - The ID of the lending pool to query.
 * @returns {Promise<string>} The LP token price as a string.
 * @throws Will throw an error if the view function call fails - network request failure
 */
export async function getLpTokenPrice(poolId: number | string): Promise<string> {
  const moduleAddress = getModuleAddress('moar_pool')
  const [lpTokenPrice] = await useSurfClient().useABI(
    moar_pool_abi,
    moduleAddress,
  ).view.get_lp_token_price({
    typeArguments: [],
    functionArguments: [poolId],
  })

  return lpTokenPrice
}

export interface GetFarmingPoolApyParams {
  poolId: number | string
  rewardId: string
}

/**
 * Gets the farming pool APY for a given pool and reward.
 *
 * @param {GetFarmingPoolApyParams} params - The parameters for the query.
 * @param {number|string} params.poolId - The ID of the lending pool to query.
 * @param {string} params.rewardId - The reward identifier.
 * @returns {Promise<string>} The APY as a string.
 * @throws Will throw an error if the view function call fails - network request failure
 */
export async function getFarmingPoolApy(
  { poolId, rewardId }: GetFarmingPoolApyParams,
): Promise<string> {
  const moduleAddress = getModuleAddress('moar_pool')
  const [apy] = await useSurfClient().useABI(
    moar_pool_abi,
    moduleAddress,
  ).view.get_farming_pool_apy({
    typeArguments: [],
    functionArguments: [poolId, rewardId],
  })

  return apy
}

export function formatLendPoolConfig(pool: LendPoolResponse, address: Address, index: number): LendPoolConfig {
  return {
    ...pool,
    id: index,
    address,
    name: pool.name.split(' ')[1]?.trim() || '', // strip moar from name (e.g. 'moar usdc' -> 'usdc')
    underlying_asset: pool.underlying_asset.inner,
    unbond_period: Number(pool.unbond_period),
    withdraw_period: Number(pool.withdraw_period),
    kinks: [],
    ltvs: [],
  }
}
