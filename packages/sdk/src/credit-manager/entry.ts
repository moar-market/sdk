import type { EntryPayload } from '@thalalabs/surf'
import type { Address, MoveStructId } from '../types'
import { createEntryPayload } from '@thalalabs/surf'
import { moar_credit_manager_abi } from '../abis'
import { getModuleAddress } from '../config'

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

export interface BorrowDebtParams {
  creditAccount: Address
  pool: {
    id: number
    amount: bigint | number | string
  }
}

/**
 * Creates a borrow entry function payload for borrowing from a credit account.
 *
 * @param {BorrowDebtParams} params - The borrow entry parameters
 * @param {Address} params.creditAccount - The credit account address to borrow from
 * @param {object} params.pool - The pool details
 * @param {number} params.pool.id - The ID of the lending pool
 * @param {bigint|number|string} params.pool.amount - The amount to borrow
 * @returns {EntryPayload} The borrow entry function payload that can be submitted to the blockchain
 */
export function getBorrowDebtPayload({ creditAccount, pool }: BorrowDebtParams): EntryPayload {
  const moduleAddress = getModuleAddress('moar_credit_manager')

  return createEntryPayload(moar_credit_manager_abi, {
    address: moduleAddress,
    function: 'borrow_entry',
    typeArguments: [],
    functionArguments: [creditAccount, pool.id, pool.amount],
  })
}

export interface RepayDebtParams {
  creditAccount: Address
  pool: {
    id: number
    amount: bigint | number | string | undefined // ? undefined for full borrow
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
export function getRepayDebtPayload({ creditAccount, pool }: RepayDebtParams): EntryPayload {
  const moduleAddress = getModuleAddress('moar_credit_manager')

  return createEntryPayload(moar_credit_manager_abi, {
    address: moduleAddress,
    function: 'repay',
    typeArguments: [],
    functionArguments: [creditAccount, pool.id, pool.amount],
  })
}

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
