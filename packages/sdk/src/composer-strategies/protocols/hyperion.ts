import type { AptosScriptComposer, CallArgument } from './../../composer'
import type { Address } from './../../types'
import { extendTypeArguments } from '../../utils'
import { composerUtils_fe_abi, moarStrategies_hyperion_adapter_abi } from './../../abis'
import { getModuleAddress, useAdapterStrategiesConfig } from './../../config'
import { claimRewards, executeStrategy } from './../shared'

export interface AddLiquidityParams {
  position_v3?: Address // required for increase position
  tokenA: Address
  tokenB: Address
  tickLower: number
  tickUpper: number
  feeTier: number
  amountA: bigint // for optimally the amount is available/wanted to add
  amountB: bigint // for optimally the amount is available/wanted to add
  minAmountA: bigint
  minAmountB: bigint
  deadline?: number
  isStake?: boolean
  dustThreshold?: number // for optimally the dust threshold to add liquidity optimally
}

/**
 * Adds liquidity to a Hyperion CLMM position
 * @param builder - Script composer instance to add the liquidity operations to
 * @param creditAccount - Credit account address or argument to execute the liquidity operations from
 * @param liquidity - Parameters for adding liquidity
 * @throws {Error} If Hyperion add liquidity strategy is not configured or liquidity inputs creation fails
 */
export async function addLiquidity(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  liquidity: AddLiquidityParams,
): Promise<void> {
  const hyperion_add_liquidity = useAdapterStrategiesConfig().hyperion_add_liquidity
  if (!hyperion_add_liquidity)
    throw new Error('Hyperion add liquidity strategy not available or configured')

  const [, addLiquidityInput] = await builder.addBatchedCall({
    function: `${getModuleAddress('moarStrategies_hyperion_adapter')}::hyperion_adapter::create_add_liquidity_inputs`,
    functionArguments: [
      liquidity.position_v3,
      liquidity.tokenA,
      liquidity.tokenB,
      liquidity.tickLower,
      liquidity.tickUpper,
      liquidity.feeTier,
      liquidity.amountA,
      liquidity.amountB,
      liquidity.minAmountA,
      liquidity.minAmountB,
      liquidity.deadline ?? Math.floor(100 * 365 * 24 * 60 * 60 + Date.now() / 1e3), // 100 years from now by default
      !!liquidity.isStake,
    ],
    typeArguments: [],
  }, moarStrategies_hyperion_adapter_abi)

  if (!addLiquidityInput)
    throw new Error('Failed to create hyperion add liquidity inputs')

  await executeStrategy(
    builder,
    builder.copyIfCallArgument(creditAccount),
    hyperion_add_liquidity.adapterId,
    hyperion_add_liquidity.strategyId,
    addLiquidityInput,
  )
}

/**
 * Add liquidity optimally to a hyperion pool, swaps tokens from hyperion pool if needed to maximize the amount of liquidity added
 * @param builder - Script composer instance to add the liquidity operations to
 * @param creditAccount - Credit account address or argument to execute the liquidity operations from
 * @param liquidity - Parameters for adding liquidity
 * @throws {Error} If Hyperion add liquidity optimally strategy is not configured or liquidity inputs creation fails
 */
export async function addLiquidityOptimally(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  liquidity: AddLiquidityParams,
): Promise<void> {
  const hyperion_add_liquidity_optimally = useAdapterStrategiesConfig().hyperion_add_liquidity_optimally
  if (!hyperion_add_liquidity_optimally)
    throw new Error('Hyperion add liquidity optimally strategy not available or configured')

  const [, addLiquidityOptimallyInput] = await builder.addBatchedCall({
    function: `${getModuleAddress('moarStrategies_hyperion_adapter')}::hyperion_adapter::create_add_liquidity_optimally_inputs`,
    functionArguments: [
      liquidity.position_v3,
      liquidity.tokenA,
      liquidity.tokenB,
      liquidity.tickLower,
      liquidity.tickUpper,
      liquidity.feeTier,
      liquidity.amountA,
      liquidity.amountB,
      liquidity.minAmountA,
      liquidity.minAmountB,
      liquidity.deadline ?? Math.floor(100 * 365 * 24 * 60 * 60 + Date.now() / 1e3), // 100 years from now by default
      !!liquidity.isStake,
      liquidity.dustThreshold ?? 100000, // 0.1% by default
    ],
    typeArguments: [],
  }, moarStrategies_hyperion_adapter_abi)

  if (!addLiquidityOptimallyInput)
    throw new Error('Failed to create hyperion add liquidity optimally inputs')

  await executeStrategy(
    builder,
    builder.copyIfCallArgument(creditAccount),
    hyperion_add_liquidity_optimally.adapterId,
    hyperion_add_liquidity_optimally.strategyId,
    addLiquidityOptimallyInput,
  )
}

export interface RebalanceLiquidityParams {
  // close position params
  position_v3?: Address // required for close position
  tokenA: Address
  tokenB: Address
  feeTier: number
  minOutAmountA: bigint
  minOutAmountB: bigint

  // new position params
  tickLower: number // new tick lower
  tickUpper: number // new tick upper
  additionalAmountA: bigint // additional amounts
  additionalAmountB: bigint // additional amounts
  minAmountA: bigint // new position min amounts
  minAmountB: bigint // new position min amounts
  deadline?: number
  isStake?: boolean
  dustThreshold?: number
}

/**
 * Rebalance the price range of an existing position in the Hyperion protocol + increase position size
 * @param builder - Script composer instance to add the rebalance operations to
 * @param creditAccount - Credit account address or argument to execute the rebalance operations from
 * @param liquidity - Parameters for rebalancing liquidity
 * @throws {Error} If Hyperion rebalance strategy is not configured or rebalance inputs creation fails
 */
export async function rebalanceLiquidity(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  liquidity: RebalanceLiquidityParams,
): Promise<void> {
  const hyperion_rebalance = useAdapterStrategiesConfig().hyperion_rebalance
  if (!hyperion_rebalance)
    throw new Error('Hyperion rebalance strategy not available or configured')

  const [, rebalanceLiquidityInput] = await builder.addBatchedCall({
    function: `${getModuleAddress('moarStrategies_hyperion_adapter')}::hyperion_adapter::create_rebalance_inputs`,
    functionArguments: [
      // close position params
      liquidity.position_v3,
      liquidity.tokenA,
      liquidity.tokenB,
      liquidity.feeTier,
      liquidity.minOutAmountA,
      liquidity.minOutAmountB,
      // new position params
      liquidity.tickLower,
      liquidity.tickUpper,
      liquidity.additionalAmountA,
      liquidity.additionalAmountB,
      liquidity.minAmountA,
      liquidity.minAmountB,
      liquidity.deadline ?? Math.floor(100 * 365 * 24 * 60 * 60 + Date.now() / 1e3), // 100 years from now by default
      !!liquidity.isStake,
      liquidity.dustThreshold ?? 100000, // 0.1% by default
    ],
    typeArguments: [],
  }, moarStrategies_hyperion_adapter_abi)

  if (!rebalanceLiquidityInput)
    throw new Error('Failed to create hyperion rebalance liquidity inputs')

  await executeStrategy(
    builder,
    builder.copyIfCallArgument(creditAccount),
    hyperion_rebalance.adapterId,
    hyperion_rebalance.strategyId,
    rebalanceLiquidityInput,
  )
}

export interface RemoveLiquidityParams {
  position_v3: Address
  liquidityDelta: bigint
  tokenA: Address
  tokenB: Address
  feeTier: number
  minAmountA: bigint
  minAmountB: bigint
  isUnstake?: boolean
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
  const hyperion_remove_liquidity = useAdapterStrategiesConfig().hyperion_remove_liquidity
  if (!hyperion_remove_liquidity)
    throw new Error('Hyperion remove liquidity strategy not available or configured')

  const [, removeLiquidityInput] = await builder.addBatchedCall({
    function: `${getModuleAddress('moarStrategies_hyperion_adapter')}::hyperion_adapter::create_remove_liquidity_inputs`,
    functionArguments: [
      liquidity.position_v3,
      liquidity.liquidityDelta,
      liquidity.tokenA,
      liquidity.tokenB,
      liquidity.feeTier,
      liquidity.minAmountA,
      liquidity.minAmountB,
      !!liquidity.isUnstake,
    ],
    typeArguments: [],
  }, moarStrategies_hyperion_adapter_abi)

  if (!removeLiquidityInput)
    throw new Error('Failed to create hyperion remove liquidity inputs')

  await executeStrategy(
    builder,
    builder.copyIfCallArgument(creditAccount),
    hyperion_remove_liquidity.adapterId,
    hyperion_remove_liquidity.strategyId,
    removeLiquidityInput,
  )
}

/**
 * Claims rewards from a hyperion pool
 * @param builder - Script composer instance to add the claim reward operations to
 * @param creditAccount - Credit account address or argument to execute the claim reward operations from
 */
export async function claimReward(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
): Promise<void> {
  const [, claimRewardsInput] = await builder.addBatchedCall({
    function: `${getModuleAddress('moarStrategies_hyperion_adapter')}::hyperion_adapter::create_claim_rewards_inputs`,
    functionArguments: [],
    typeArguments: [],
  }, moarStrategies_hyperion_adapter_abi)

  const [calldata_vec] = await builder.addBatchedCall({
    function: `${getModuleAddress('composerUtils_fe')}::fe::any_singleton`,
    functionArguments: [claimRewardsInput],
    typeArguments: [],
  }, composerUtils_fe_abi)

  await claimRewards(builder, builder.copyIfCallArgument(creditAccount), {
    typeArguments: extendTypeArguments([], 4),
    calldata: calldata_vec,
    nullType: '',
  })
}
