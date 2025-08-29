import type { EntryPayload } from '@thalalabs/surf'
import type { Address, MoveStructId } from '../types'
import { createEntryPayload } from '@thalalabs/surf'
import { moar_pool_abi } from './../abis'
import { getModuleAddress } from './../config'

export interface DepositParams {
  poolId: number
  asset: {
    address: Address
    coinType: MoveStructId
    amount: bigint | number | string
  }
  receiver: Address
}

/**
 * Creates a deposit entry function payload for depositing assets into a lending pool
 *
 * @param {DepositParams} params - The deposit entry parameters
 * @param {number} params.poolId - The ID of the pool to deposit into
 * @param {object} params.asset - The asset details
 * @param {Address} params.asset.address - The address of the asset
 * @param {MoveStructId} params.asset.coinType - The Move struct ID of the coin type
 * @param {bigint|number|string} params.asset.amount - The amount to deposit
 * @param {Address} params.receiver - The address that will receive the deposit
 * @returns {object} The deposit entry function payload
 */
export function getDepositPayload({
  poolId,
  asset: { address, coinType, amount },
  receiver,
}: DepositParams): EntryPayload {
  const moduleAddress = getModuleAddress('moar_pool')

  return createEntryPayload(moar_pool_abi, {
    address: moduleAddress,
    function: 'deposit_entry',
    typeArguments: [coinType],
    functionArguments: [poolId, address, amount, receiver],
  })
}

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
