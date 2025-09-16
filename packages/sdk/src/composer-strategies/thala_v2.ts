import type { SimpleTransaction } from './../composer'
import type { Address, SwapParams } from './../types'
import type { AddLiquidityParams, RemoveLiquidityParams } from './protocols/thala_v2'
import type { BorrowParams, ClaimRewardsParams, CollateralParams, RepayParams } from './shared'
import { useAptosConfig } from './../clients'
import { scriptComposer } from './../composer'
import { swap } from './protocols/default-swap'
import { addLiquidity, claimReward, removeLiquidity } from './protocols/thala_v2'
import { borrow, closeCreditAccount, depositCollateral, repay, setupStrategyAccount } from './shared'

export interface OpenPositionParams {
  sender: Address
  collaterals: CollateralParams[]
  borrows: BorrowParams[]
  swaps: SwapParams[]
  liquidity: AddLiquidityParams
}

/**
 * Opens a new position in the Thala v2 protocol
 * @param {OpenPositionParams} params - The parameters for opening a position
 * @param {Address} params.sender - The sender account address
 * @param {CollateralParams[]} params.collaterals - The collateral parameters
 * @param {BorrowParams[]} params.borrows - The borrow parameters
 * @param {SwapParams[]} params.swaps - The swap parameters
 * @param {AddLiquidityParams} params.liquidity - The liquidity parameters
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

      // thala swaps
      await swap(builder, creditAccount, swaps)

      // add liquidity
      await addLiquidity(builder, creditAccount, liquidity)

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
  liquidity: AddLiquidityParams
}

/**
 * Increases the size of an existing position in the Thala v2 protocol
 * @param {IncreasePositionParams} params - The parameters for increasing a position
 * @param {Address} params.sender - The sender account address
 * @param {Address} params.creditAccount - The credit account address
 * @param {CollateralParams[]} params.collaterals - The collateral parameters
 * @param {BorrowParams[]} params.borrows - The borrow parameters
 * @param {SwapParams[]} params.swaps - The swap parameters
 * @param {AddLiquidityParams} params.liquidity - The liquidity parameters
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

      // thala swaps
      await swap(builder, creditAccount, swaps)

      // add liquidity
      await addLiquidity(builder, creditAccount, liquidity)

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
  liquidity: RemoveLiquidityParams
}

/**
 * Decreases the size of an existing position in the Thala v2 protocol
 * @param {DecreasePositionParams} params - The parameters for decreasing a position
 * @param {Address} params.sender - The sender account address
 * @param {Address} params.creditAccount - The credit account address
 * @param {CollateralParams[]} params.collaterals - The collateral parameters
 * @param {RepayParams[]} params.repays - The repay parameters
 * @param {SwapParams[]} params.swaps - The swap parameters
 * @param {RemoveLiquidityParams} params.liquidity - The liquidity parameters
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
      await removeLiquidity(builder, creditAccount, liquidity)

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
  rewards: ClaimRewardsParams[]
  liquidity?: RemoveLiquidityParams
}

/**
 * Closes an existing position in the Thala v2 protocol
 * @param {ClosePositionParams} params - The parameters for closing a position
 * @param {Address} params.sender - The sender account address
 * @param {Address} params.creditAccount - The credit account address
 * @param {CollateralParams[]} params.collaterals - The collateral parameters
 * @param {RepayParams[]} params.repays - The repay parameters
 * @param {SwapParams[]} params.swaps - The swap parameters
 * @param {ClaimRewardsParams[]} params.rewards - The reward parameters
 * @param {RemoveLiquidityParams} params.liquidity - The liquidity parameters
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export async function closePosition(
  { sender, creditAccount, collaterals = [], repays, swaps, rewards, liquidity }: ClosePositionParams,
): Promise<SimpleTransaction> {
  const transaction = await scriptComposer({
    config: useAptosConfig(),
    sender,
    builder: async (builder) => {
      // remove liquidity
      if (liquidity)
        await removeLiquidity(builder, creditAccount, liquidity)

      // claim rewards
      await claimReward(builder, creditAccount, rewards)

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

/**
 * Claims rewards from the Thala v2 protocol
 * @param {object} params - The parameters for claiming rewards
 * @param {Address} params.sender - The sender account address
 * @param {Address} params.creditAccount - The credit account address
 * @param {ClaimRewardsParams[]} params.rewards - The reward parameters
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export async function claimRewards(
  { sender, creditAccount, rewards }: { sender: Address, creditAccount: Address, rewards: ClaimRewardsParams[] },
): Promise<SimpleTransaction> {
  const transaction = await scriptComposer({
    config: useAptosConfig(),
    sender,
    builder: async (builder) => {
      // claim rewards
      await claimReward(builder, creditAccount, rewards)

      return builder
    },
  })

  return transaction
}
