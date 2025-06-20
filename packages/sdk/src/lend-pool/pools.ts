import type { Kink } from '@moar-market/utils'
import type { LendPoolConfig, LendPoolResponse } from '../types'
import { unScale } from '@itsmnthn/big-utils'
import { moar_interest_rate_model_abi, moar_pool_abi } from './../abis'
import { useSurfClient } from './../clients'
import { getModuleAddress } from './../config'

/**
 * Retrieves all lending pools from the protocol
 * @returns {Promise<LendPoolConfig[]>} Array of lending pool configurations
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

  const pools = data.map(formatLendPoolConfig)

  return pools
}

/**
 * Retrieves the piecewise linear interest rate model for a specific lending pool
 *
 * @param {number|string} poolId - The ID of the lending pool to query
 * @returns {Promise<Kink[]>} A promise that resolves to an array of rate points defining the interest rate model
 * @throws Will throw an error if the view function call fails
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

export function formatLendPoolConfig(pool: LendPoolResponse, index: number): LendPoolConfig {
  return {
    ...pool,
    id: index,
    name: pool.name.split(' ')[1]?.trim() || '', // strip moar from name (e.g. 'moar usdc' -> 'usdc')
    underlying_asset: pool.underlying_asset.inner,
    unbond_period: Number(pool.unbond_period),
    withdraw_period: Number(pool.withdraw_period),
    kinks: [],
    ltvs: [],
  }
}
