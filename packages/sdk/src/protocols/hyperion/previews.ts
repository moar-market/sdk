import type { Address } from '../../types'
import { hyperion_router_v3_abi } from './../../abis'
import { useSurfClient } from './../../clients'
import { getModuleAddress } from './../../config'
import { logger } from './../../logger'

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
): Promise<string | undefined> {
  try {
    logger.debug(debugLabel, 'payload', { tick, tokenA, tokenB, fromTokenA, feeTier, amount, minAmountA, minAmountB })
    const moduleAddress = getModuleAddress('hyperion_router_v3')
    const views = useSurfClient().useABI(hyperion_router_v3_abi, moduleAddress).view
    const previewFunction = fromTokenA ? views.optimal_liquidity_amounts_from_a : views.optimal_liquidity_amounts_from_b

    const [, outAmount] = await previewFunction({
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

    return outAmount
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
