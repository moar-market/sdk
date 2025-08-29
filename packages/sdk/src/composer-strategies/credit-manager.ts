import type { SimpleTransaction } from './../composer'
import type { Address, SwapParams } from './../types'
import type { BorrowParams, CollateralParams, RepayParams } from './shared'
import { useAptosConfig } from './../clients'
import { scriptComposer } from './../composer'
import { swap } from './protocols/default-swap'
import { borrow, depositCollateral, repay } from './shared'

export interface BorrowDebtParams {
  sender: Address
  creditAccount: Address
  collaterals: CollateralParams[]
  borrows: BorrowParams[]
  swaps: SwapParams[]
}

/**
 * Borrows debt on an existing credit account.
 * @param {BorrowDebtParams} params - The parameters for borrowing debt
 * @param {Address} params.sender - The sender account address
 * @param {Address} params.creditAccount - The credit account address
 * @param {CollateralParams[]} params.collaterals - The collateral parameters to deposit
 * @param {BorrowParams[]} params.borrows - The borrow parameters specifying which debts to borrow
 * @param {SwapParams[]} params.swaps - The swap parameters to execute before borrowing
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export async function borrowDebt(
  { sender, creditAccount, collaterals = [], borrows, swaps }: BorrowDebtParams,
): Promise<SimpleTransaction> {
  const transaction = await scriptComposer({
    config: useAptosConfig(),
    sender,
    builder: async (builder) => {
      // deposit collaterals
      await depositCollateral(builder, creditAccount, collaterals)

      // borrows
      await borrow(builder, creditAccount, borrows)

      // swaps
      await swap(builder, creditAccount, swaps)

      return builder
    },
  })

  return transaction
}

export interface RepayDebtParams {
  sender: Address
  creditAccount: Address
  collaterals: CollateralParams[]
  swaps: SwapParams[]
  repays: RepayParams[]
}

/**
 * Repays debt on an existing credit account.
 * @param {RepayDebtParams} params - The parameters for repaying debt
 * @param {Address} params.sender - The sender account address
 * @param {Address} params.creditAccount - The credit account address
 * @param {CollateralParams[]} params.collaterals - The collateral parameters to deposit
 * @param {SwapParams[]} params.swaps - The swap parameters to execute before repayment
 * @param {RepayParams[]} params.repays - The repay parameters specifying which debts to repay
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export async function repayDebt(
  { sender, creditAccount, collaterals = [], repays, swaps }: RepayDebtParams,
): Promise<SimpleTransaction> {
  const transaction = await scriptComposer({
    config: useAptosConfig(),
    sender,
    builder: async (builder) => {
      // deposit collaterals
      await depositCollateral(builder, creditAccount, collaterals)

      // swaps
      await swap(builder, creditAccount, swaps)

      // repays
      await repay(builder, creditAccount, repays)

      return builder
    },
  })

  return transaction
}

export interface SwapAssetParams {
  sender: Address
  creditAccount: Address
  swaps: SwapParams[]
}

/**
 * Swaps assets on an existing credit account.
 * @param {SwapAssetParams} params - The parameters for swapping assets
 * @param {Address} params.sender - The sender account address
 * @param {Address} params.creditAccount - The credit account address
 * @param {SwapParams[]} params.swaps - The swap parameters to execute
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export async function swapAsset(
  { sender, creditAccount, swaps }: SwapAssetParams,
): Promise<SimpleTransaction> {
  const transaction = await scriptComposer({
    config: useAptosConfig(),
    sender,
    builder: async (builder) => {
      await swap(builder, creditAccount, swaps)

      return builder
    },
  })

  return transaction
}
