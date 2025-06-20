import type { EntryPayload } from '@thalalabs/surf'
import type { Address } from '../types'
import { createEntryPayload } from '@thalalabs/surf'
import { moar_pool_abi } from './../abis'
import { getModuleAddress } from './../config'

export interface WithdrawParams {
  poolId: number
  amount: number | string | bigint | undefined
  receiver: Address
}

/**
 * Creates a withdraw entry function payload for withdrawing assets from a lending pool.
 * If amount is undefined, withdraws all available assets.
 *
 * @param {WithdrawParams} params - The withdraw parameters
 * @param {number} params.poolId - The ID of the pool to withdraw from
 * @param {number|string|bigint|undefined} params.amount - The amount to withdraw. If undefined, withdraws all available assets
 * @param {Address} params.receiver - The address that will receive the withdrawn assets
 * @returns {EntryPayload} The withdraw entry function payload
 * @example
 * ```ts
 * const payload = getWithdrawPayload({
 *   poolId: 1,
 *   amount: 1000000, // or undefined for full withdrawal
 *   receiver: "0x123..."
 * });
 * ```
 */
export function getWithdrawPayload({ poolId, amount, receiver }: WithdrawParams): EntryPayload {
  const moduleAddress = getModuleAddress('moar_pool')

  return createEntryPayload(moar_pool_abi, {
    address: moduleAddress,
    function: 'withdraw',
    typeArguments: [],
    functionArguments: [poolId, amount, receiver],
  })
}
