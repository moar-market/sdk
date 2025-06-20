import type { Address } from '../types'
import { moar_lens_abi } from './../abis'
import { useSurfClient } from './../clients'
import { getModuleAddress } from './../config'

/**
 * Parameters for querying a user's position in a lending pool
 * @interface UserPositionParams
 * @property {number} poolId - The ID of the lending pool to query
 * @property {Address} user - The address of the user whose position to query
 */
export interface UserPositionParams {
  poolId: number
  user: Address
}

/**
 * Response containing details about a user's position in a lending pool
 * @interface UserPositionResponse
 * @property {string} shares - The total number of LP shares owned by the user
 * @property {string} shareAmount - The total amount of underlying tokens represented by the shares
 * @property {string} unbondingShares - The number of shares currently in the unbonding period
 * @property {string} unbondingAmount - The amount of underlying tokens represented by unbonding shares
 * @property {number} unbondingTime - Unix timestamp when the unbonding period completes
 */
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
 * @throws Will throw an error if the view function call fails
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
