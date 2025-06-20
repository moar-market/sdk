import type { EntryPayload } from '@thalalabs/surf'
import type { Address, MoveStructId } from '../types'
import { createEntryPayload } from '@thalalabs/surf'
import { moar_credit_manager_abi } from './../abis'
import { getModuleAddress } from './../config'

export interface DepositCollateralParams {
  creditAccount: Address
  asset: {
    address: Address
    coinType?: MoveStructId
    amount: bigint | number | string
  }
}

/**
 * Creates a deposit entry function payload for depositing collateral into a credit account
 *
 * @param {DepositCollateralParams} params - The deposit entry parameters
 * @param {Address} params.creditAccount - The credit account address to deposit into
 * @param {object} params.asset - The asset details
 * @param {Address} params.asset.address - The address of the asset
 * @param {MoveStructId} params.asset.coinType - The Move struct ID of the coin type (defaults to `0x1::string::String` if not provided)
 * @param {bigint|number|string} params.asset.amount - The amount to deposit
 * @returns {EntryPayload} The deposit entry function payload
 */
export function getCollateralDepositPayload(
  { creditAccount, asset: { address, coinType = '0x1::string::String', amount } }: DepositCollateralParams,
): EntryPayload {
  const moduleAddress = getModuleAddress('moar_credit_manager')

  return createEntryPayload(moar_credit_manager_abi, {
    address: moduleAddress,
    function: 'deposit_collateral_entry',
    typeArguments: [coinType],
    functionArguments: [creditAccount, address, amount],
  })
}
