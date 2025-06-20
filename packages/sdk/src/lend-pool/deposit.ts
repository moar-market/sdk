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
