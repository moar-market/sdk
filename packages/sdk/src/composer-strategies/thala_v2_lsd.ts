import type { SimpleTransaction } from '@aptos-labs/ts-sdk'
import type { Address } from './../types'
import type { SwapParams } from './protocols/panora'
import type { StakeAPTthAPTParams } from './protocols/thala_v2'
import type { BorrowParams, CollateralParams, RepayParams } from './shared'
import { useAptosConfig } from './../clients'
import { scriptComposer } from './../composer'
import { swap } from './protocols/panora'
import { stakeAPTthAPT, unstakeAPTthAPT } from './protocols/thala_v2'
import { borrow, closeCreditAccount, depositCollateral, repay, setupStrategyAccount } from './shared'

export interface OpenPositionParams {
  sender: Address
  collaterals: CollateralParams[]
  borrows: BorrowParams[]
  swaps: SwapParams[]
  stake: StakeAPTthAPTParams
}

/**
 * Opens a new position in the Thala v2 LSD protocol
 * @param {OpenPositionParams} params - The parameters for opening a position
 * @param {Address} params.sender - The sender account address
 * @param {CollateralParams[]} params.collaterals - The collateral parameters
 * @param {BorrowParams[]} params.borrows - The borrow parameters
 * @param {SwapParams[]} params.swaps - The swap parameters
 * @param {StakeAPTthAPTParams} params.stake - The stake parameters
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export async function openPosition(
  { sender, collaterals, borrows, swaps, stake }: OpenPositionParams,
): Promise<SimpleTransaction> {
  const transaction = await scriptComposer({
    config: useAptosConfig(),
    sender,
    builder: async (builder) => {
      // create credit account, deposit collaterals, add final assets to account assets, borrow assets
      const creditAccount = await setupStrategyAccount(builder, { collaterals, borrows })

      // thala swaps
      await swap(builder, creditAccount, swaps)

      // stake
      await stakeAPTthAPT(builder, creditAccount, stake)

      return builder
    },
  })

  return transaction
}

export interface IncreasePositionParams {
  sender: Address
  creditAccount: Address
  collaterals?: CollateralParams[]
  borrows: BorrowParams[]
  swaps: SwapParams[]
  stake: StakeAPTthAPTParams
}

/**
 * Increases the size of an existing position in the Thala v2 LSD protocol
 * @param {IncreasePositionParams} params - The parameters for increasing a position
 * @param {Address} params.sender - The sender account address
 * @param {Address} params.creditAccount - The credit account address
 * @param {CollateralParams[]} params.collaterals - The collateral parameters
 * @param {BorrowParams[]} params.borrows - The borrow parameters
 * @param {SwapParams[]} params.swaps - The swap parameters
 * @param {StakeAPTthAPTParams} params.stake - The stake parameters
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export async function increasePosition(
  { sender, creditAccount, collaterals = [], borrows, swaps, stake }: IncreasePositionParams,
): Promise<SimpleTransaction> {
  const transaction = await scriptComposer({
    config: useAptosConfig(),
    sender,
    builder: async (builder) => {
      // deposit collaterals
      await depositCollateral(builder, creditAccount, collaterals)

      // borrows
      await borrow(builder, creditAccount, borrows)

      // thala swaps
      await swap(builder, creditAccount, swaps)

      // stake
      await stakeAPTthAPT(builder, creditAccount, stake)

      return builder
    },
  })

  return transaction
}

export interface DecreasePositionParams {
  sender: Address
  creditAccount: Address
  collaterals?: CollateralParams[]
  repays: RepayParams[]
  swaps: SwapParams[]
  unstake: StakeAPTthAPTParams
}

/**
 * Decreases the size of an existing position in the Thala v2 LSD protocol
 * @param {DecreasePositionParams} params - The parameters for decreasing a position
 * @param {Address} params.sender - The sender account address
 * @param {Address} params.creditAccount - The credit account address
 * @param {CollateralParams[]} params.collaterals - The collateral parameters
 * @param {RepayParams[]} params.repays - The repay parameters
 * @param {SwapParams[]} params.swaps - The swap parameters
 * @param {StakeAPTthAPTParams} params.unstake - The unstake parameters
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export async function decreasePosition(
  { sender, creditAccount, collaterals = [], repays, swaps, unstake }: DecreasePositionParams,
): Promise<SimpleTransaction> {
  const transaction = await scriptComposer({
    config: useAptosConfig(),
    sender,
    builder: async (builder) => {
      // unstake
      await unstakeAPTthAPT(builder, creditAccount, unstake)

      // deposit collaterals
      await depositCollateral(builder, creditAccount, collaterals)

      // thala swaps
      await swap(builder, creditAccount, swaps)

      // borrows
      await repay(builder, creditAccount, repays)

      return builder
    },
  })

  return transaction
}

export interface ClosePositionParams {
  sender: Address
  creditAccount: Address
  collaterals?: CollateralParams[]
  repays: Omit<RepayParams, 'amount'>[]
  swaps: SwapParams[]
  unstake?: StakeAPTthAPTParams
}

/**
 * Closes an existing position in the Thala v2 LSD protocol
 * @param {ClosePositionParams} params - The parameters for closing a position
 * @param {Address} params.sender - The sender account address
 * @param {Address} params.creditAccount - The credit account address
 * @param {CollateralParams[]} params.collaterals - The collateral parameters
 * @param {RepayParams[]} params.repays - The repay parameters
 * @param {SwapParams[]} params.swaps - The swap parameters
 * @param {StakeAPTthAPTParams} params.unstake - The unstake parameters
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export async function closePosition(
  { sender, creditAccount, collaterals = [], repays, swaps, unstake }: ClosePositionParams,
): Promise<SimpleTransaction> {
  const transaction = await scriptComposer({
    config: useAptosConfig(),
    sender,
    builder: async (builder) => {
      // unstake
      if (unstake)
        await unstakeAPTthAPT(builder, creditAccount, unstake)

      // deposit collaterals
      await depositCollateral(builder, creditAccount, collaterals)

      // thala swaps
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
