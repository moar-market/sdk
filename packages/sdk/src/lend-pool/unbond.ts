import type { EntryPayload } from '@thalalabs/surf'
import { createEntryPayload } from '@thalalabs/surf'
import { moar_pool_abi } from './../abis'
import { getModuleAddress } from './../config'

export interface StartUnbondingParams {
  poolId: number
  amount: number | string | bigint | undefined
}

/**
 * Creates a start unbonding entry function payload for unbonding assets from a lending pool.
 * If amount is undefined, unbonds all available assets.
 *
 * @param {StartUnbondingParams} params - The start unbonding parameters
 * @param {number} params.poolId - The ID of the pool to unbond from
 * @param {number|string|bigint|undefined} params.amount - The amount to unbond. If undefined, unbonds all available assets
 * @returns {EntryPayload} The start unbonding entry function payload
 * @example
 * ```ts
 * const payload = getStartUnbondingPayload({
 *   poolId: 1,
 *   amount: 1000000, // or undefined for full unbonding
 * });
 * ```
 */
export function getStartUnbondingPayload({ poolId, amount }: StartUnbondingParams): EntryPayload {
  const moduleAddress = getModuleAddress('moar_pool')

  return createEntryPayload(moar_pool_abi, {
    address: moduleAddress,
    function: 'start_unbonding',
    typeArguments: [],
    functionArguments: [poolId, amount],
  })
}
