import type { EntryPayload } from '@thalalabs/surf'
import type { Address } from '../types'
import { createEntryPayload } from '@thalalabs/surf'
import { moar_credit_manager_abi } from './../abis'
import { getModuleAddress } from './../config'

/**
 * Creates a close entry function payload for closing a credit account.
 * The account must have no outstanding debt and all the collateral or assets will be returned to the owner.
 * Call after a full liquidation or when the account is no longer needed.
 *
 * @param {Address} creditAccount - The credit account address to close
 * @returns {EntryPayload} The close entry function payload that can be submitted to the blockchain
 */
export function getCloseCreditAccountPayload(creditAccount: Address): EntryPayload {
  const moduleAddress = getModuleAddress('moar_credit_manager')

  return createEntryPayload(moar_credit_manager_abi, {
    address: moduleAddress,
    function: 'close_credit_account',
    typeArguments: [],
    functionArguments: [creditAccount],
  })
}
