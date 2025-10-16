import type { AptosScriptComposer, CallArgument } from './../../composer'
import type { Address } from './../../types'
import { moarStrategies_tapp_adapter_abi } from './../../abis'
import { getModuleAddress, useAdapterStrategiesConfig } from './../../config'
import { executeStrategy } from './../shared'

export interface AddStableLiquidityParams {
  pool: Address
  position?: Address
  amounts: bigint[]
  minLPAmount: bigint
}

/**
 * Adds liquidity to a Tapp stable pool
 * @param builder - Script composer instance to add the liquidity operations to
 * @param creditAccount - Credit account address or argument to execute the liquidity operations from
 * @param liquidity - Parameters for adding liquidity
 * @throws {Error} If Tapp add stable liquidity strategy is not configured or liquidity inputs creation fails
 */
export async function addStableLiquidity(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  liquidity: AddStableLiquidityParams,
): Promise<void> {
  const tapp_add_stable = useAdapterStrategiesConfig().tapp_add_stable
  if (!tapp_add_stable)
    throw new Error('Tapp add stable liquidity strategy not available or configured')

  const [, addLiquidityInput] = await builder.addBatchedCall({
    function: `${getModuleAddress('moarStrategies_tapp_adapter')}::tapp_adapter::create_add_stable_liquidity_inputs`,
    functionArguments: [
      liquidity.pool,
      liquidity.position,
      liquidity.amounts,
      liquidity.minLPAmount,
    ],
    typeArguments: [],
  }, moarStrategies_tapp_adapter_abi)

  if (!addLiquidityInput)
    throw new Error('Failed to create tapp add stable liquidity inputs')

  await executeStrategy(
    builder,
    builder.copyIfCallArgument(creditAccount),
    tapp_add_stable.adapterId,
    tapp_add_stable.strategyId,
    addLiquidityInput,
  )
}

export interface RemoveStableLiquidityParams {
  pool: Address
  position: Address
  mode: 0 | 1 | 2
  lpBurnAmount?: bigint
  amounts?: bigint[]
  coinIdx?: number
  minReceived?: bigint
}

/**
 * Removes liquidity from a Tapp stable pool
 * @param builder - Script composer instance to remove the liquidity operations to
 * @param creditAccount - Credit account address or argument to execute the liquidity operations from
 * @param liquidity - Parameters for removing liquidity
 * @throws {Error} If Tapp remove stable liquidity strategy is not configured or liquidity inputs creation fails
 */
export async function removeStableLiquidity(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  liquidity: RemoveStableLiquidityParams,
): Promise<void> {
  const tapp_remove_stable = useAdapterStrategiesConfig().tapp_remove_stable
  if (!tapp_remove_stable)
    throw new Error('Tapp remove stable liquidity strategy not available or configured')

  const [, removeLiquidityInput] = await builder.addBatchedCall({
    function: `${getModuleAddress('moarStrategies_tapp_adapter')}::tapp_adapter::create_remove_stable_liquidity_inputs`,
    functionArguments: [
      liquidity.pool,
      liquidity.position,
      liquidity.mode,
      liquidity.lpBurnAmount,
      liquidity.amounts,
      liquidity.coinIdx,
      liquidity.minReceived,
    ],
    typeArguments: [],
  }, moarStrategies_tapp_adapter_abi)

  if (!removeLiquidityInput)
    throw new Error('Failed to create tapp remove stable liquidity inputs')

  await executeStrategy(
    builder,
    builder.copyIfCallArgument(creditAccount),
    tapp_remove_stable.adapterId,
    tapp_remove_stable.strategyId,
    removeLiquidityInput,
  )
}
