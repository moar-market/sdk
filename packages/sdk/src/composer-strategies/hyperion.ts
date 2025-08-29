import type { SimpleTransaction } from '@aptos-labs/ts-sdk'
import type { Address, SwapParams } from './../types'
import type { AddLiquidityParams, RebalanceLiquidityParams, RemoveLiquidityParams } from './protocols/hyperion'
import type { BorrowParams, CollateralParams, RepayParams } from './shared'
import { useAptosConfig } from './../clients'
import { scriptComposer } from './../composer'
import {
  addLiquidity,
  addLiquidityOptimally,
  claimReward,
  rebalanceLiquidity,
  removeLiquidity,
} from './protocols/hyperion'
import { swap } from './protocols/panora'
import { borrow, closeCreditAccount, depositCollateral, repay, setupStrategyAccount } from './shared'

// re-export types for convenience
export type { AddLiquidityParams, RebalanceLiquidityParams, RemoveLiquidityParams }

export interface OpenPositionParams {
  sender: Address
  collaterals: CollateralParams[]
  borrows: BorrowParams[]
  swaps: SwapParams[]
  liquidity: AddLiquidityParams
  optimally?: boolean
}

/**
 * Opens a new position in the hyperion protocol
 * @param {OpenPositionParams} params - The parameters for opening a position
 * @param {Address} params.sender - The sender account address
 * @param {CollateralParams[]} params.collaterals - The collateral parameters
 * @param {BorrowParams[]} params.borrows - The borrow parameters
 * @param {SwapParams[]} params.swaps - The swap parameters
 * @param {AddLiquidityParams} params.liquidity - The liquidity parameters
 * @param {boolean} params.optimally - Whether to add liquidity optimally (default: false)
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export async function openPosition(
  { sender, collaterals, borrows, swaps, liquidity, optimally = false }: OpenPositionParams,
): Promise<SimpleTransaction> {
  const transaction = await scriptComposer({
    config: useAptosConfig(),
    sender,
    builder: async (builder) => {
      // create credit account, deposit collaterals, add final assets to account assets, borrow assets
      const creditAccount = await setupStrategyAccount(builder, { collaterals, borrows })

      // swaps
      await swap(builder, creditAccount, swaps)

      // add liquidity
      if (optimally)
        await addLiquidityOptimally(builder, creditAccount, liquidity)
      else
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
  optimally?: boolean
}

/**
 * Increases the size of an existing position in the Hyperion protocol
 * @param {IncreasePositionParams} params - The parameters for increasing a position
 * @param {Address} params.sender - The sender account address
 * @param {Address} params.creditAccount - The credit account address
 * @param {CollateralParams[]} params.collaterals - The collateral parameters
 * @param {BorrowParams[]} params.borrows - The borrow parameters
 * @param {SwapParams[]} params.swaps - The swap parameters
 * @param {AddLiquidityParams} params.liquidity - The liquidity parameters
 * @param {boolean} params.optimally - Whether to add liquidity optimally (default: false)
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export async function increasePosition(
  { sender, creditAccount, collaterals = [], borrows, swaps, liquidity, optimally = false }: IncreasePositionParams,
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
      if (optimally)
        await addLiquidityOptimally(builder, creditAccount, liquidity)
      else
        await addLiquidity(builder, creditAccount, liquidity)

      return builder
    },
  })

  return transaction
}

export interface RebalancePositionParams {
  sender: Address
  creditAccount: Address
  collaterals?: CollateralParams[]
  borrows: BorrowParams[]
  swaps: SwapParams[]
  liquidity: RebalanceLiquidityParams
}

/**
 * Rebalance the price range of an existing position in the Hyperion protocol + increase position size
 * @param {RebalancePositionParams} params - The parameters for rebalancing a position
 * @param {Address} params.sender - The sender account address
 * @param {Address} params.creditAccount - The credit account address
 * @param {CollateralParams[]} params.collaterals - The collateral parameters
 * @param {BorrowParams[]} params.borrows - The borrow parameters
 * @param {SwapParams[]} params.swaps - The swap parameters
 * @param {RebalanceLiquidityParams} params.liquidity - The liquidity rebalance parameters
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export async function rebalancePosition(
  { sender, creditAccount, collaterals = [], borrows, swaps, liquidity }: RebalancePositionParams,
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

      // rebalance
      await rebalanceLiquidity(builder, creditAccount, liquidity)

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
 * Decreases the size of an existing position in the Hyperion protocol
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
  liquidity?: RemoveLiquidityParams
}

/**
 * Closes an existing position in the Hyperion protocol
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
  { sender, creditAccount, collaterals = [], repays, swaps, liquidity }: ClosePositionParams,
): Promise<SimpleTransaction> {
  const transaction = await scriptComposer({
    config: useAptosConfig(),
    sender,
    builder: async (builder) => {
      // remove liquidity
      if (liquidity)
        await removeLiquidity(builder, creditAccount, liquidity)

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
 * Claims rewards from the Hyperion protocol
 * @param {object} params - The parameters for claiming rewards
 * @param {Address} params.sender - The sender account address
 * @param {Address} params.creditAccount - The credit account address
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export async function claimRewards(
  { sender, creditAccount }: { sender: Address, creditAccount: Address },
): Promise<SimpleTransaction> {
  const transaction = await scriptComposer({
    config: useAptosConfig(),
    sender,
    builder: async (builder) => {
      // claim rewards
      await claimReward(builder, creditAccount)

      return builder
    },
  })

  return transaction
}
