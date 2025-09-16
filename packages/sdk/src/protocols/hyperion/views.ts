import type { Address } from '../../types'
import { hyperion_router_v3_abi, moarStrategies_hyperion_adapter_abi } from '../../abis'
import { moar_hyperion_lens_abi } from '../../abis/moar_hyperion_lens_abi'
import { useSurfClient } from '../../clients'
import { getModuleAddress } from '../../config'
import { logger } from '../../logger'

const debugLabel = 'Hyperion'

export interface HyperionTick {
  lower: bigint | string | number
  upper: bigint | string | number
  current: bigint | string | number
}

/**
 * Parameters for previewing add liquidity operation in Hyperion pools
 */
export interface PreviewAddLiquidityParams {
  tick: HyperionTick
  tokenA: Address
  tokenB: Address
  fromTokenA: boolean // if true, the amount is from tokenA, otherwise it's from tokenB
  feeTier: number | bigint | string
  amount: bigint | string | number
  minAmountA: bigint | string | number
  minAmountB: bigint | string | number
}

export interface AddLiquidityPreview {
  lpAmount: bigint
  refundAmounts: bigint[]
}

/**
 * Preview add liquidity operation in Hyperion pools
 * @param {PreviewAddLiquidityParams} params Parameters for previewing add liquidity
 * @param {Address} [params.pool] Optional pool address. If not provided, will be derived from assets
 * @param {Address[]} params.assets Array of asset addresses to add liquidity for
 * @param {(bigint|string|number)[]} params.amounts Array of amounts to add for each asset
 * @param {boolean} params.isWeighted Whether this is a weighted or stable pool
 * @param {boolean} [params.isMetastable] Whether this is a metastable pool
 * @returns {Promise<string|undefined>} Preview of LP tokens that would be minted and refund amounts, or undefined if preview fails
 */
export async function previewAddLiquidity(
  { tick, tokenA, tokenB, fromTokenA, feeTier, amount, minAmountA, minAmountB }: PreviewAddLiquidityParams,
): Promise<{ lpAmount: bigint, outAmount: bigint } | undefined> {
  try {
    logger.debug(debugLabel, 'payload', { tick, tokenA, tokenB, fromTokenA, feeTier, amount, minAmountA, minAmountB })
    const moduleAddress = getModuleAddress('hyperion_router_v3')
    const views = useSurfClient().useABI(hyperion_router_v3_abi, moduleAddress).view
    const previewFunction = fromTokenA ? views.optimal_liquidity_amounts_from_a : views.optimal_liquidity_amounts_from_b

    const [lpAmount, outAmount] = await previewFunction({
      typeArguments: [],
      functionArguments: [
        Number(tick.lower),
        Number(tick.upper),
        Number(tick.current),
        tokenA,
        tokenB,
        Number(feeTier),
        amount,
        minAmountA,
        minAmountB,
      ],
    })

    return { lpAmount: BigInt(lpAmount), outAmount: BigInt(outAmount) }
  }
  catch (error) {
    console.error(debugLabel, 'error previewing add liquidity', error)
  }
}

export interface GetOptimalLiquidityAmountsParams {
  tickLower: number
  tickUpper: number
  tokenA: Address
  tokenB: Address
  feeTier: number
  amountA: bigint
  amountB: bigint
  minAmountA: bigint
  minAmountB: bigint
}

/**
 * Get optimal amounts of tokenA and tokenB for add liquidity operation in Hyperion pools
 * @param {GetOptimalLiquidityAmountsParams} params Parameters for getting optimal amounts of tokenA and tokenB
 * @returns {Promise<{ optimalAmountA: bigint, optimalAmountB: bigint } | undefined>} Optimal amounts of tokenA and tokenB
 */
export async function getOptimalLiquidityAmounts(
  { tickLower, tickUpper, tokenA, tokenB, feeTier, amountA, amountB, minAmountA, minAmountB }: GetOptimalLiquidityAmountsParams,
): Promise<{ optimalAmountA: bigint, optimalAmountB: bigint, lpAmount: bigint } | undefined> {
  try {
    const moduleAddress = getModuleAddress('hyperion_router_v3')
    const views = useSurfClient().useABI(hyperion_router_v3_abi, moduleAddress).view

    const [lpAmount, optimalAmountA, optimalAmountB] = await views.optimal_liquidity_amounts({
      typeArguments: [],
      functionArguments: [
        tickLower,
        tickUpper,
        tokenA,
        tokenB,
        feeTier,
        amountA,
        amountB,
        minAmountA,
        minAmountB,
      ],
    })

    return { optimalAmountA: BigInt(optimalAmountA), optimalAmountB: BigInt(optimalAmountB), lpAmount: BigInt(lpAmount) }
  }
  catch (error) {
    console.error(debugLabel, 'error previewing add liquidity', error)
  }
}

/**
 * Get the amount of tokenA and tokenB in the position
 * @param {Address} position_v3 The position v3 address
 * @returns {Promise<{ amountA: string, amountB: string } | undefined>} The amount of tokenA and tokenB in the position
 */
export async function getLiquidityAmounts(
  position_v3: Address,
): Promise<{ amountA: string, amountB: string } | undefined> {
  try {
    const moduleAddress = getModuleAddress('hyperion_router_v3')
    const [amountA, amountB] = await useSurfClient().useABI(
      hyperion_router_v3_abi,
      moduleAddress,
    ).view.get_amount_by_liquidity({
      typeArguments: [],
      functionArguments: [position_v3],
    })

    return { amountA, amountB }
  }
  catch (error) {
    console.error(debugLabel, 'error getting liquidity amount', error)
  }
}

/**
 * Fetches all Hyperion positions for a given credit account.
 *
 * @param {Address} creditAccount - The address of the credit account to query positions for.
 * @returns {Promise<Array<{ poolAddress: Address, positionId: Address }>>}
 *   A promise that resolves to an array of objects, each containing the pool address and the position object address.
 */
export async function getAllPositionIds(
  creditAccount: Address,
): Promise<{ poolAddress: Address, positionId: Address }[]> {
  const moduleAddress = getModuleAddress('moarStrategies_hyperion_adapter')

  const [data] = await useSurfClient().useABI(
    moarStrategies_hyperion_adapter_abi,
    moduleAddress,
  ).view.get_all_positions({
    typeArguments: [],
    functionArguments: [creditAccount],
  })

  return data.map((position: any) => ({
    poolAddress: position.pool.inner as Address,
    positionId: position.position_object.inner as Address,
  }))
}

export interface PendingReward {
  reward_token: Address
  reward_amount: bigint
}

export interface PositionInfo {
  liquidity: bigint
  token_a_metadata: Address
  token_b_metadata: Address
  token_a_amount: bigint
  token_b_amount: bigint
  tick_lower: number
  tick_upper: number
  current_tick: number
  pending_fees: bigint[]
  pending_rewards: PendingReward[]
  tick_lower_price: bigint
  tick_upper_price: bigint
  current_price: bigint
}

/**
 * Get the position info
 * @param {Address} position The position address
 * @param {Address} pool The pool address
 * @returns {Promise<PositionInfo>} The position info
 */
export async function getPositionInfo(position: Address, pool: Address): Promise<PositionInfo> {
  const moduleAddress = getModuleAddress('moar_hyperion_lens')
  const [data] = await useSurfClient().useABI(
    moar_hyperion_lens_abi,
    moduleAddress,
  ).view.get_position_info({
    typeArguments: [],
    functionArguments: [position, pool],
  })

  return data as PositionInfo
}
