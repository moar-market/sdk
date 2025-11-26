import type { Address } from '../types'
import { createEntryPayload } from '@thalalabs/surf'
import { moar_authority_abi, moar_credit_manager_abi } from './../abis'
import { useSurfClient } from './../clients'
import { getModuleAddress } from './../config'

/**
 * Checks if a specific address is authorized to perform a given action on a credit account.
 *
 * @param creditAccount - The address of the credit account to check authorization for.
 * @param authorizedAddress - The address to check for authorization.
 * @param action - The action ID (as AuthorityActions or number) to check permission for.
 * @returns Promise<boolean> - True if the address is authorized for the given action, otherwise false.
 */
export async function isAuthorized(
  creditAccount: Address,
  authorizedAddress: Address,
  action: AuthorityActions,
): Promise<boolean> {
  const [authorized] = await useSurfClient().useABI(
    moar_authority_abi,
    getModuleAddress('moar_authority'),
  ).view.is_authorized({
    typeArguments: [],
    functionArguments: [creditAccount, authorizedAddress, action],
  })
  return authorized
}

export type AuthorityActions = 1 | 2 | 3 | 4 | 5 | 8

export const AUTHORITY_ACTIONS = {
  EXECUTE_STRATEGY: 1,
  WITHDRAW: 2,
  DEPOSIT: 3,
  REPAY: 4,
  BORROW: 5,
  CLOSE_ACCOUNT: 8,
} as const

export interface AddAuthorityParams {
  creditAccount: Address
  authority: Address
  actions: Array<AuthorityActions>
}

/**
 * Creates a payload for the `add_authority` entry function to add a new authority to a credit account.
 *
 * @param {AddAuthorityParams} params - Parameters required to add an authority.
 * @param {Address} params.creditAccount - The credit account address to which the authority will be added.
 * @param {Address} params.authority - The address to be granted authority.
 * @param {AuthorityActions[]} params.actions - Array of permitted action IDs for the new authority.
 * @returns {EntryPayload} The transaction payload for adding an authority to the given credit account.
 */
export function getAddAuthorityPayload({ creditAccount, authority, actions }: AddAuthorityParams) {
  const moduleAddress = getModuleAddress('moar_credit_manager')

  return createEntryPayload(moar_credit_manager_abi, {
    address: moduleAddress,
    function: 'add_authority',
    typeArguments: [],
    functionArguments: [creditAccount, authority, actions],
  })
}

export interface RemoveAuthorityParams {
  creditAccount: Address
  authority: Address
}

/**
 * Generates a payload for the `remove_authority` entry function to revoke authority from a credit account.
 *
 * @param {RemoveAuthorityParams} params - The required parameters for removing an authority.
 * @param {Address} params.creditAccount - The credit account address from which authority will be removed.
 * @param {Address} params.authority - The authority address to be removed.
 * @returns {EntryPayload} The transaction payload for removing an authority from the given credit account.
 */
export function getRemoveAuthorityPayload({ creditAccount, authority }: RemoveAuthorityParams) {
  const moduleAddress = getModuleAddress('moar_credit_manager')

  return createEntryPayload(moar_credit_manager_abi, {
    address: moduleAddress,
    function: 'remove_authority',
    typeArguments: [],
    functionArguments: [creditAccount, authority],
  })
}
