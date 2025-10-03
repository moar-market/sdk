import type { SimpleTransaction } from './../composer'
import type { Address, SwapParams } from './../types'
import type { DepositParams, RemoveParams } from './protocols/goblin'
import type { BorrowParams, CollateralParams, RepayParams } from './shared'
import { useAptosConfig } from './../clients'
import { scriptComposer } from './../composer'
import { swap } from './protocols/default-swap'
import { claimReward, deposit, remove } from './protocols/goblin'
import { borrow, closeCreditAccount, depositCollateral, repay, setupStrategyAccount } from './shared'

// re-export types for convenience
export type { DepositParams, RemoveParams }

export interface OpenPositionParams {
  sender: Address
  collaterals: CollateralParams[]
  borrows: BorrowParams[]
  swaps: SwapParams[]
  liquidity: DepositParams
}

/**
 * Opens a new position in the Goblin vault
 * @param {OpenPositionParams} params - The parameters for opening a position
 * @param {Address} params.sender - The sender account address
 * @param {CollateralParams[]} params.collaterals - The collateral parameters
 * @param {BorrowParams[]} params.borrows - The borrow parameters
 * @param {SwapParams[]} params.swaps - The swap parameters
 * @param {DepositParams} params.liquidity - The liquidity parameters
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export async function openPosition(
  { sender, collaterals, borrows, swaps, liquidity }: OpenPositionParams,
): Promise<SimpleTransaction> {
  const transaction = await scriptComposer({
    config: useAptosConfig(),
    sender,
    builder: async (builder) => {
      // create credit account, deposit collaterals, add final assets to account assets, borrow assets
      const creditAccount = await setupStrategyAccount(builder, { collaterals, borrows })

      // swaps
      await swap(builder, creditAccount, swaps)

      // liquidity
      await deposit(builder, creditAccount, liquidity)

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
  liquidity: DepositParams
}

/**
 * Increases the size of an existing position in the Goblin vault
 * @param {IncreasePositionParams} params - The parameters for increasing a position
 * @param {Address} params.sender - The sender account address
 * @param {Address} params.creditAccount - The credit account address
 * @param {CollateralParams[]} params.collaterals - The collateral parameters
 * @param {BorrowParams[]} params.borrows - The borrow parameters
 * @param {SwapParams[]} params.swaps - The swap parameters
 * @param {DepositParams} params.liquidity - The liquidity parameters
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export async function increasePosition(
  { sender, creditAccount, collaterals = [], borrows, swaps, liquidity }: IncreasePositionParams,
): Promise<SimpleTransaction> {
  const transaction = await scriptComposer({
    config: useAptosConfig(),
    sender,
    builder: async (builder) => {
      // deposit collaterals
      await depositCollateral(builder, creditAccount, collaterals)

      // borrows
      await borrow(builder, creditAccount, borrows)

      //  swaps
      await swap(builder, creditAccount, swaps)

      // add liquidity
      await deposit(builder, creditAccount, liquidity)

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
  liquidity: RemoveParams
}

/**
 * Decreases the size of an existing position in the Goblin vault
 * @param {DecreasePositionParams} params - The parameters for decreasing a position
 * @param {Address} params.sender - The sender account address
 * @param {Address} params.creditAccount - The credit account address
 * @param {CollateralParams[]} params.collaterals - The collateral parameters
 * @param {RepayParams[]} params.repays - The repay parameters
 * @param {SwapParams[]} params.swaps - The swap parameters
 * @param {RemoveParams} params.liquidity - The liquidity parameters
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export async function decreasePosition(
  { sender, creditAccount, collaterals = [], repays, swaps, liquidity }: DecreasePositionParams,
): Promise<SimpleTransaction> {
  const transaction = await scriptComposer({
    config: useAptosConfig(),
    sender,
    builder: async (builder) => {
      // remove liquidity
      await remove(builder, creditAccount, liquidity)

      // deposit collaterals
      await depositCollateral(builder, creditAccount, collaterals)

      // swaps
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
  liquidity?: RemoveParams
}

/**
 * Closes an existing position in the Goblin vault
 * @param {ClosePositionParams} params - The parameters for closing a position
 * @param {Address} params.sender - The sender account address
 * @param {Address} params.creditAccount - The credit account address
 * @param {CollateralParams[]} params.collaterals - The collateral parameters
 * @param {RepayParams[]} params.repays - The repay parameters
 * @param {SwapParams[]} params.swaps - The swap parameters
 * @param {RemoveParams} params.liquidity - The liquidity parameters
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export async function closePosition(
  { sender, creditAccount, collaterals = [], repays, swaps, liquidity }: ClosePositionParams,
): Promise<SimpleTransaction> {
  const transaction = await scriptComposer({
    config: useAptosConfig(),
    sender,
    builder: async (builder) => {
      // remove liquidity
      if (liquidity)
        await remove(builder, creditAccount, liquidity)

      // rewards auto claimed on 100% close position)

      // deposit collaterals
      await depositCollateral(builder, creditAccount, collaterals)

      // swaps
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

/**
 * Claims rewards from the Goblin vault
 * @param {object} params - The parameters for claiming rewards
 * @param {Address} params.sender - The sender account address
 * @param {Address} params.creditAccount - The credit account address
 * @param {number} params.rewardPoolId - The reward pool id
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export async function claimRewards(
  { sender, creditAccount, rewardPoolId }: { sender: Address, creditAccount: Address, rewardPoolId: number },
): Promise<SimpleTransaction> {
  const transaction = await scriptComposer({
    config: useAptosConfig(),
    sender,
    builder: async (builder) => {
      // claim rewards
      await claimReward(builder, creditAccount, rewardPoolId)

      return builder
    },
  })

  return transaction
}
