import type { EntryPayload } from '@thalalabs/surf'
import type { Address } from '../types'
import { createEntryPayload } from '@thalalabs/surf'
import { moar_credit_manager_abi } from './../abis'
import { getModuleAddress } from './../config'

export interface WithdrawCollateralParams {
  creditAccount: Address
  asset: {
    address: Address
    amount: bigint | number | string
  }
  receiver: Address
}

/**
 * Creates a withdraw entry function payload for withdrawing collateral from a credit account.
 * The withdrawn collateral will be sent to the specified receiver address.
 *
 * @param {WithdrawCollateralParams} params - The withdraw entry parameters
 * @param {Address} params.creditAccount - The credit account address to withdraw from
 * @param {object} params.asset - The asset details to withdraw
 * @param {Address} params.asset.address - The address of the asset to withdraw
 * @param {bigint|number|string} params.asset.amount - The amount to withdraw
 * @param {Address} params.receiver - The address that will receive the withdrawn collateral
 * @returns {EntryPayload} The withdraw entry function payload that can be submitted to the blockchain
 */
export function getCollateralWithdrawPayload(
  { creditAccount, asset: { address, amount }, receiver }: WithdrawCollateralParams,
): EntryPayload {
  const moduleAddress = getModuleAddress('moar_credit_manager')

  return createEntryPayload(moar_credit_manager_abi, {
    address: moduleAddress,
    function: 'withdraw_entry',
    typeArguments: [],
    functionArguments: [creditAccount, receiver, amount, address],
  })
}
