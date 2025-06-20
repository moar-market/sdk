import type { EntryPayload } from '@thalalabs/surf'
import type { Address } from '../types'
import { createEntryPayload } from '@thalalabs/surf'
import { moar_credit_manager_abi } from './../abis'
import { getModuleAddress } from './../config'

export interface RepayDebtParams {
  creditAccount: Address
  pool: {
    id: number
    amount: bigint | number | string | undefined
  }
}

/**
 * Creates a repay entry function payload for repaying debt in a credit account.
 *
 * @param {RepayDebtParams} params - The repay entry parameters
 * @param {Address} params.creditAccount - The credit account address to repay debt for
 * @param {object} params.pool - The pool details
 * @param {number} params.pool.id - The ID of the lending pool
 * @param {bigint|number|string|undefined} params.pool.amount - The amount to repay. If `undefined`, **repays the full debt amount**
 * @returns {EntryPayload} The repay entry function payload that can be submitted to the blockchain
 */
export function getRepayDebtPayload({ creditAccount, pool: { id, amount } }: RepayDebtParams): EntryPayload {
  const moduleAddress = getModuleAddress('moar_credit_manager')

  return createEntryPayload(moar_credit_manager_abi, {
    address: moduleAddress,
    function: 'repay',
    typeArguments: [],
    functionArguments: [creditAccount, id, amount],
  })
}
