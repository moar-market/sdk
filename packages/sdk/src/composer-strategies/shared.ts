import type { AptosScriptComposer } from './../composer'
import type { Address, MoveStructId } from './../types'
import { extendTypeArguments } from '../utils'
import { moar_credit_manager_abi } from './../abis'
import { CallArgument } from './../composer'
import { getModuleAddress } from './../config'

/**
 * Utility function to handle CallArgument copying
 * @template T - The type parameter for non-CallArgument values
 * @param {CallArgument | T} arg - The argument to potentially copy
 * @returns {CallArgument | T} A copy of the CallArgument if arg is a CallArgument, otherwise returns arg as-is
 */
export function copyIfCallArgument<T>(arg: CallArgument | T): CallArgument | T {
  return arg instanceof CallArgument ? arg.copy() : arg
}

/**
 * Creates a new credit account
 * @param {AptosScriptComposer} builder - The script composer instance to add the transaction to
 * @returns {Promise<CallArgument>} A CallArgument representing the newly created credit account
 * @throws {Error} If credit account creation fails
 */
export async function openCreditAccount(builder: AptosScriptComposer): Promise<CallArgument> {
  const [creditAccount] = await builder.addBatchedCall({
    function: `${getModuleAddress('moar_credit_manager')}::credit_manager::create_credit_account`,
    functionArguments: [CallArgument.newSigner(0)],
    typeArguments: [],
  }, moar_credit_manager_abi)

  if (!creditAccount)
    throw new Error('Failed to create credit account')

  return creditAccount
}

/**
 * Closes an existing credit account
 * @param {AptosScriptComposer} builder - The script composer instance to add the transaction to
 * @param {CallArgument | Address} creditAccount - The credit account to close
 * @throws {Error} If credit account closure fails
 */
export async function closeCreditAccount(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
): Promise<void> {
  await builder.addBatchedCall({
    function: `${getModuleAddress('moar_credit_manager')}::credit_manager::close_credit_account`,
    functionArguments: [CallArgument.newSigner(0), copyIfCallArgument(creditAccount)],
    typeArguments: [],
  }, moar_credit_manager_abi)
}

/**
 * Executes a strategy on a credit account
 * @param {AptosScriptComposer} builder - The script composer instance to add the transaction to
 * @param {CallArgument | Address} creditAccount - The credit account to execute the strategy on
 * @param {number} protocol - The protocol to execute the strategy on
 * @param {number} strategy - The strategy to execute
 * @param {CallArgument} calldata - The calldata for the strategy
 * @param {string[]} typeArguments - The type arguments for the strategy
 */
export async function executeStrategy(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  protocol: number,
  strategy: number,
  calldata: CallArgument,
  typeArguments: string[] = [],
): Promise<void> {
  typeArguments = extendTypeArguments(typeArguments, 32)
  await builder.addBatchedCall({
    function: `${getModuleAddress('moar_credit_manager')}::credit_manager::execute_strategy_public`,
    functionArguments: [
      CallArgument.newSigner(0),
      copyIfCallArgument(creditAccount),
      protocol,
      strategy,
      calldata,
    ],
    typeArguments,
  }, moar_credit_manager_abi)
}

export interface CollateralParams {
  type: MoveStructId
  metadata: Address
  amount: bigint
}

/**
 * Deposits collaterals into a credit account
 * @param {AptosScriptComposer} builder - The script composer instance to add the transaction to
 * @param {CallArgument | Address} creditAccount - The credit account to deposit collateral into
 * @param {CollateralParams[]} collaterals - The collaterals to deposit
 */
export async function depositCollateral(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  collaterals: CollateralParams[],
): Promise<void> {
  for (const collateral of collaterals) {
    await builder.addBatchedCall({
      function: `${getModuleAddress('moar_credit_manager')}::credit_manager::deposit_collateral_entry`,
      functionArguments: [
        CallArgument.newSigner(0),
        copyIfCallArgument(creditAccount),
        collateral.metadata,
        collateral.amount,
      ],
      typeArguments: [collateral.type],
    }, moar_credit_manager_abi)
  }
}

export interface WithdrawCollateralParams {
  metadata: Address
  amount?: bigint
  receiver: Address
}

/**
 * Withdraws collateral from a credit account.
 *
 * @param {AptosScriptComposer} builder - The script composer instance to add the transaction to
 * @param {CallArgument | Address} creditAccount - The credit account to withdraw collateral from
 * @param {WithdrawCollateralParams[]} params - Array of withdrawal parameters
 * @param {Address} params[].metadata - The metadata address of the collateral asset
 * @param {bigint} [params[].amount] - The amount of collateral to withdraw (optional, withdraws all if not specified)
 * @param {Address} params[].receiver - The address to receive the withdrawn collateral
 * @returns {Promise<void>} Resolves when all withdrawal calls have been added to the batch
 */
export async function withdrawCollateral(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  params: WithdrawCollateralParams[],
): Promise<void> {
  for (const param of params) {
    await builder.addBatchedCall({
      function: `${getModuleAddress('moar_credit_manager')}::credit_manager::withdraw_entry`,
      functionArguments: [
        CallArgument.newSigner(0),
        copyIfCallArgument(creditAccount),
        param.receiver,
        param.amount,
        param.metadata,
      ],
      typeArguments: [],
    }, moar_credit_manager_abi)
  }
}

export interface BorrowParams {
  pool: number
  amount: bigint
  metadata: Address
}

/**
 * Borrows assets to a credit account
 * @param {AptosScriptComposer} builder - The script composer instance to add the transaction to
 * @param {CallArgument | Address} creditAccount - The credit account to borrow assets from
 * @param {BorrowParams[]} borrows - The details of the borrows
 */
export async function borrow(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  borrows: BorrowParams[],
): Promise<void> {
  for (const borrow of borrows) {
    await builder.addBatchedCall({
      function: `${getModuleAddress('moar_credit_manager')}::credit_manager::borrow_entry`,
      functionArguments: [
        CallArgument.newSigner(0),
        copyIfCallArgument(creditAccount),
        borrow.pool,
        borrow.amount,
      ],
      typeArguments: [],
    }, moar_credit_manager_abi)
  }
}

export interface RepayParams {
  pool: number
  amount?: bigint
}

/**
 * Repays debts of a credit account
 * @param {AptosScriptComposer} builder - The script composer instance to add the transaction to
 * @param {CallArgument | Address} creditAccount - The credit account to repay debts of
 * @param {RepayParams[]} repays - The details of the repays
 */
export async function repay(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  repays: RepayParams[],
): Promise<void> {
  for (const repay of repays) {
    await builder.addBatchedCall({
      function: `${getModuleAddress('moar_credit_manager')}::credit_manager::repay`,
      functionArguments: [
        CallArgument.newSigner(0),
        copyIfCallArgument(creditAccount),
        repay.pool,
        repay.amount,
      ],
      typeArguments: [],
    }, moar_credit_manager_abi)
  }
}

export interface ClaimRewardsParams {
  calldata: any | CallArgument
  typeArguments: string[]
  nullType: string
}

/**
 * Claims rewards to credit account from a protocol
 * @param {AptosScriptComposer} builder - The script composer instance to add the transaction to
 * @param {CallArgument | Address} creditAccount - The credit account to claim rewards from
 * @param {ClaimRewardsParams[]} params - The parameters for claiming rewards
 * @param params.calldata - The calldata for the protocol
 * @param params.typeArguments - The type arguments for the protocol
 */
export async function claimRewards(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  params: ClaimRewardsParams,
): Promise<void> {
  await builder.addBatchedCall({
    function: `${getModuleAddress('moar_credit_manager')}::credit_manager::claim_rewards`,
    functionArguments: [
      copyIfCallArgument(creditAccount),
      copyIfCallArgument(params.calldata),
    ],
    typeArguments: params.typeArguments,
  }, moar_credit_manager_abi)
}

/**
 * Opens a new credit account and sets it up with collateral, assets and borrows
 * @param builder - The Aptos script composer instance to add transactions to
 * @param params - { collaterals: CollateralParams[], borrows: BorrowParams[], finalAssets: Address[] }
 * @param params.collaterals - Array of collateral parameters to deposit into the account
 * @param params.borrows - Array of borrow parameters to take loans against the collateral
 * @returns The newly created credit account address
 */
export async function setupStrategyAccount(
  builder: AptosScriptComposer,
  { collaterals, borrows }: { collaterals: CollateralParams[], borrows: BorrowParams[] },
): Promise<CallArgument> {
  // create credit account
  const creditAccount = await openCreditAccount(builder)

  // deposit collaterals
  await depositCollateral(builder, creditAccount, collaterals)

  // borrows
  await borrow(builder, creditAccount, borrows)

  return creditAccount
}
