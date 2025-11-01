import type { AptosScriptComposer, CallArgument, SimpleTransaction } from './../../composer'
import type { Address, SwapParams } from './../../types'
import type { BorrowParams, CollateralParams, RepayParams } from './../shared'
import { useAptosConfig } from './../../clients'
import { scriptComposer } from './../../composer'
import { borrow, closeCreditAccount, depositCollateral, repay, setupStrategyAccount } from './../shared'

export interface CreditAccountSwapParams {
  sender: Address
  creditAccount: Address
  swaps: SwapParams[]
}

// ? first swap is a trade swap for trade accounts

export interface OpenPositionParams {
  sender: Address
  collaterals: CollateralParams[]
  borrows: BorrowParams[]
  swaps: SwapParams[]
}

export interface IncreasePositionParams {
  sender: Address
  creditAccount: Address
  collaterals?: CollateralParams[]
  borrows: BorrowParams[]
  swaps: SwapParams[]
}

export interface DecreasePositionParams {
  sender: Address
  creditAccount: Address
  collaterals: CollateralParams[]
  repays: RepayParams[]
  swaps: SwapParams[]
}

export interface ClosePositionParams {
  sender: Address
  creditAccount: Address
  collaterals: CollateralParams[]
  repays: Omit<RepayParams, 'amount'>[]
  swaps: SwapParams[]
}

export type SwapComposerFn = (
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  swaps: SwapParams[],
) => Promise<void>

export function getSwapInCreditAccount(swap: SwapComposerFn) {
  /**
   * Executes a swap within a credit account
   * Swaps between debt assets and allowed collateral in strategy
   * @param {CreditAccountSwapParams} params - The parameters for the swap
   * @returns {Promise<SimpleTransaction>} The transaction object
   */
  return async function (
    { sender, creditAccount, swaps }: CreditAccountSwapParams,
  ): Promise<SimpleTransaction> {
    const transaction = await scriptComposer({
      config: useAptosConfig(),
      sender,
      builder: async (builder) => {
        // swap through dex
        await swap(builder, creditAccount, swaps)

        return builder
      },
    })

    return transaction
  }
}
export function getOpenPosition(swap: SwapComposerFn) {
  /**
   * Opens a new position by creating a credit account, depositing collateral, borrowing assets and executing swaps
   * @param {OpenPositionParams} params - The parameters for opening a position
   * @returns {Promise<SimpleTransaction>} The transaction object
   */
  return async function (
    { sender, collaterals, borrows, swaps }: OpenPositionParams,
  ): Promise<SimpleTransaction> {
    const transaction = await scriptComposer({
      config: useAptosConfig(),
      sender,
      builder: async (builder) => {
      // create credit account, deposit collaterals, add final assets to account assets, borrow assets
        const creditAccount = await setupStrategyAccount(builder, { collaterals, borrows })

        if (swaps.length > 0 && swaps[0]) {
          swaps[0].isTrade = true
        }

        // dex swaps
        await swap(builder, creditAccount, swaps)

        return builder
      },
    })

    return transaction
  }
}

export function getIncreasePosition(swap: SwapComposerFn) {
  /**
   * Increases an existing position by depositing more collateral, borrowing additional assets and executing swaps
   * @param {IncreasePositionParams} params - The parameters for increasing a position
   * @returns {Promise<SimpleTransaction>} The transaction object
   */
  return async function (
    { sender, creditAccount, collaterals = [], borrows, swaps }: IncreasePositionParams,
  ): Promise<SimpleTransaction> {
    const transaction = await scriptComposer({
      config: useAptosConfig(),
      sender,
      builder: async (builder) => {
      // deposit collaterals
        await depositCollateral(builder, creditAccount, collaterals)

        // borrows
        await borrow(builder, creditAccount, borrows)

        if (swaps.length > 0 && swaps[0]) {
          swaps[0].isTrade = true
        }

        // dex swaps
        await swap(builder, creditAccount, swaps)

        return builder
      },
    })

    return transaction
  }
}

export function getDecreasePosition(swap: SwapComposerFn) {
  /**
   * Decreases an existing position by optionally depositing collateral, executing swaps and repaying borrowed assets
   * @param {DecreasePositionParams} params - The parameters for decreasing a position
   * @returns {Promise<SimpleTransaction>} The transaction object
   */
  return async function (
    { sender, creditAccount, collaterals, repays, swaps }: DecreasePositionParams,
  ): Promise<SimpleTransaction> {
    const transaction = await scriptComposer({
      config: useAptosConfig(),
      sender,
      builder: async (builder) => {
      // deposit collaterals
        await depositCollateral(builder, creditAccount, collaterals)

        if (swaps.length > 0 && swaps[0]) {
          swaps[0].isTrade = true
        }

        // dex swaps
        await swap(builder, creditAccount, swaps)

        // borrows
        await repay(builder, creditAccount, repays)

        return builder
      },
    })

    return transaction
  }
}

export function getClosePosition(swap: SwapComposerFn) {
  /**
   * Closes an existing position by optionally depositing collateral, executing swaps, repaying borrowed assets and closing the credit account
   * @param {ClosePositionParams} params - The parameters for closing a position
   * @returns {Promise<SimpleTransaction>} The transaction object
   */
  return async function (
    { sender, creditAccount, collaterals, repays, swaps }: ClosePositionParams,
  ): Promise<SimpleTransaction> {
    const transaction = await scriptComposer({
      config: useAptosConfig(),
      sender,
      builder: async (builder) => {
      // deposit collaterals
        await depositCollateral(builder, creditAccount, collaterals)

        if (swaps.length > 0 && swaps[0]) {
          swaps[0].isTrade = true
        }

        // dex swaps
        await swap(builder, creditAccount, swaps)

        // borrows
        await repay(builder, creditAccount, repays)

        // close credit account
        await closeCreditAccount(builder, creditAccount)

        return builder
      },
    })

    return transaction
  }
}
