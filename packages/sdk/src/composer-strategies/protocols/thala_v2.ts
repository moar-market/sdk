import type { AptosScriptComposer, CallArgument } from './../../composer'
import type { Address } from './../../types'
import type { ClaimRewardsParams } from './../shared'
import { extendTypeArguments } from '@moar-market/utils'
import { composerUtils_fe_abi, moarStrategies_thala_v2_adapter_abi } from './../../abis'
import { getModuleAddress, useAdapterStrategiesConfig } from './../../config'
import { claimRewards, copyIfCallArgument, executeStrategy } from './../shared'

export interface SwapParams {
  pool: Address
  assetIn: Address
  amountIn: bigint
  assetOut: Address
  amountOut: bigint
  isExactIn: boolean
}

/**
 * Executes one or more swaps through the Thala v2 protocol
 * @param builder - Script composer instance to add the swap operations to
 * @param creditAccount - Credit account address or argument to execute the swaps from
 * @param swaps - Array of swap parameters defining the swap operations to execute
 * @throws {Error} If Thala v2 swap strategy is not configured or swap inputs creation fails
 */
export async function swap(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  swaps: SwapParams[],
): Promise<void> {
  throw new Error('Thala v2 swap strategy is not available')

  const thala_v2_swap = useAdapterStrategiesConfig().thala_v2_swap
  if (!thala_v2_swap)
    throw new Error('Thala v2 swap strategy not available or configured')

  for (const swap of swaps) {
    // second swap input is of type any
    const [, swapInput] = await builder.addBatchedCall({
      function: `${getModuleAddress('moarStrategies_thala_v2_adapter')}::thala_v2_adapter::create_swap_inputs`,
      functionArguments: [swap.pool, swap.assetIn, swap.amountIn, swap.assetOut, swap.amountOut, swap.isExactIn],
      typeArguments: [],
    }, moarStrategies_thala_v2_adapter_abi)

    if (!swapInput)
      throw new Error('Failed to create thala v2 swap inputs')

    await executeStrategy(
      builder,
      copyIfCallArgument(creditAccount),
      thala_v2_swap.adapterId,
      thala_v2_swap.strategyId,
      swapInput,
    )
  }
}

export interface AddLiquidityParams {
  pool: Address
  amounts: [bigint, bigint] | bigint[]
  minAmount: bigint
  isStake: boolean
  typeArguments: string[]
}

/**
 * Adds liquidity to a Thala v2 pool
 * @param builder - Script composer instance to add the liquidity operations to
 * @param creditAccount - Credit account address or argument to execute the liquidity operations from
 * @param liquidity - Parameters for adding liquidity
 * @throws {Error} If Thala v2 add liquidity strategy is not configured or liquidity inputs creation fails
 */
export async function addLiquidity(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  liquidity: AddLiquidityParams,
): Promise<void> {
  const thala_v2_add_liquidity = useAdapterStrategiesConfig().thala_v2_add_liquidity
  if (!thala_v2_add_liquidity)
    throw new Error('Thala v2 add liquidity strategy not available or configured')

  const [, addLiquidityInput] = await builder.addBatchedCall({
    function: `${getModuleAddress('moarStrategies_thala_v2_adapter')}::thala_v2_adapter::create_add_liquidity_inputs`,
    functionArguments: [liquidity.pool, liquidity.amounts, liquidity.minAmount, liquidity.isStake],
    typeArguments: [],
  }, moarStrategies_thala_v2_adapter_abi)

  if (!addLiquidityInput)
    throw new Error('Failed to create thala v2 add liquidity inputs')

  await executeStrategy(
    builder,
    copyIfCallArgument(creditAccount),
    thala_v2_add_liquidity.adapterId,
    thala_v2_add_liquidity.strategyId,
    addLiquidityInput,
    liquidity.typeArguments,
  )
}

export interface RemoveLiquidityParams {
  pool: Address
  amount: bigint
  minAmounts: [bigint, bigint] | bigint[]
  isUnstake: boolean
  typeArguments: string[]
}

/**
 * Removes liquidity from a Thala v2 pool
 * @param builder - Script composer instance to add the liquidity operations to
 * @param creditAccount - Credit account address or argument to execute the liquidity operations from
 * @param liquidity - Parameters for removing liquidity
 * @throws {Error} If Thala v2 remove liquidity strategy is not configured or liquidity inputs creation fails
 */
export async function removeLiquidity(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  liquidity: RemoveLiquidityParams,
): Promise<void> {
  const thala_v2_remove_liquidity = useAdapterStrategiesConfig().thala_v2_remove_liquidity
  if (!thala_v2_remove_liquidity)
    throw new Error('Thala v2 remove liquidity strategy not available or configured')

  const [, removeLiquidityInput] = await builder.addBatchedCall({
    function: `${getModuleAddress('moarStrategies_thala_v2_adapter')}::thala_v2_adapter::create_remove_liquidity_inputs`,
    functionArguments: [liquidity.pool, liquidity.pool, liquidity.amount, liquidity.minAmounts, liquidity.isUnstake],
    typeArguments: [],
  }, moarStrategies_thala_v2_adapter_abi)

  if (!removeLiquidityInput)
    throw new Error('Failed to create thala v2 remove liquidity inputs')

  await executeStrategy(
    builder,
    copyIfCallArgument(creditAccount),
    thala_v2_remove_liquidity.adapterId,
    thala_v2_remove_liquidity.strategyId,
    removeLiquidityInput,
    liquidity.typeArguments,
  )
}

/**
 * Claims rewards from a Thala v2 pool
 * @param builder - Script composer instance to add the claim reward operations to
 * @param creditAccount - Credit account address or argument to execute the claim reward operations from
 * @param rewards - Parameters for claiming rewards
 * @throws {Error} If Thala v2 claim reward strategy is not configured or claim reward inputs creation fails
 */
export async function claimReward(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  rewards: ClaimRewardsParams[],
): Promise<void> {
  for (const reward of rewards) {
    const [, claimRewardsInput] = await builder.addBatchedCall({
      function: `${getModuleAddress('moarStrategies_thala_v2_adapter')}::thala_v2_adapter::create_claim_rewards_inputs`,
      functionArguments: [[reward.calldata]],
      typeArguments: [],
    }, moarStrategies_thala_v2_adapter_abi)

    const [calldata_vec] = await builder.addBatchedCall({
      function: `${getModuleAddress('composerUtils_fe')}::fe::any_singleton`,
      functionArguments: [claimRewardsInput],
      typeArguments: [],
    }, composerUtils_fe_abi)

    await claimRewards(builder, copyIfCallArgument(creditAccount), {
      typeArguments: extendTypeArguments([], 4, reward.nullType),
      calldata: calldata_vec,
      nullType: reward.nullType,
    })
  }
}

export interface StakeAPTthAPTParams {
  amount: bigint
  minAmount: bigint
}

/**
 * Stakes APT in Thala v2
 * @param builder - Script composer instance to add the stake operations to
 * @param creditAccount - Credit account address or argument to execute the stake operations from
 * @param params - Parameters for staking APT
 * @throws {Error} If Thala v2 stake apt thapt strategy is not configured or stake inputs creation fails
 */
export async function stakeAPTthAPT(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  params: StakeAPTthAPTParams,
): Promise<void> {
  const thala_v2_stake_apt_and_thapt = useAdapterStrategiesConfig().thala_v2_stake_apt_and_thapt
  if (!thala_v2_stake_apt_and_thapt)
    throw new Error('Thala v2 stake apt thapt strategy not available or configured')

  const [, stakeAPTthAPTInput] = await builder.addBatchedCall({
    function: `${getModuleAddress('moarStrategies_thala_v2_adapter')}::thala_v2_adapter::create_stake_inputs`,
    functionArguments: [params.amount, params.minAmount],
    typeArguments: [],
  }, moarStrategies_thala_v2_adapter_abi)

  if (!stakeAPTthAPTInput)
    throw new Error('Failed to create thala v2 stake apt thapt inputs')

  await executeStrategy(
    builder,
    copyIfCallArgument(creditAccount),
    thala_v2_stake_apt_and_thapt.adapterId,
    thala_v2_stake_apt_and_thapt.strategyId,
    stakeAPTthAPTInput,
  )
}

/**
 * Unstakes Thala v2
 * @param builder - Script composer instance to add the unstake operations to
 * @param creditAccount - Credit account address or argument to execute the unstake operations from
 * @param params - Parameters for unstaking
 * @throws {Error} If Thala v2 unstake thapt strategy is not configured or unstake inputs creation fails
 */
export async function unstakeAPTthAPT(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  params: StakeAPTthAPTParams,
): Promise<void> {
  const thala_v2_unstake_thapt = useAdapterStrategiesConfig().thala_v2_unstake_thapt
  if (!thala_v2_unstake_thapt)
    throw new Error('Thala v2 unstake thapt strategy not available or configured')

  const [, unstakeAPTthAPTInput] = await builder.addBatchedCall({
    function: `${getModuleAddress('moarStrategies_thala_v2_adapter')}::thala_v2_adapter::create_stake_inputs`,
    functionArguments: [params.amount, params.minAmount],
    typeArguments: [],
  }, moarStrategies_thala_v2_adapter_abi)

  if (!unstakeAPTthAPTInput)
    throw new Error('Failed to create thala v2 unstake thapt inputs')

  await executeStrategy(
    builder,
    copyIfCallArgument(creditAccount),
    thala_v2_unstake_thapt.adapterId,
    thala_v2_unstake_thapt.strategyId,
    unstakeAPTthAPTInput,
  )
}
