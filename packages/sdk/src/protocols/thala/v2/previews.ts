import type { Address } from '../../../types'
import { thalaV2_pool_abi } from './../../../abis'
import { useSurfClient } from './../../../clients'
import { findThalaV2PoolConfig, getModuleAddress } from './../../../config'
import { logger } from './../../../logger'

const debugLabel = 'ThalaV2'

/**
 * Parameters for previewing add liquidity operation in Thala V2 pools
 */
export interface PreviewAddLiquidityParams {
  /** The pool address. If not provided, it will be derived from the assets */
  pool?: Address
  assets: [Address, Address] | Address[]
  amounts: (bigint | string | number)[]
  isWeighted: boolean
  isMetastable?: boolean
}

/**
 * Response from the on-chain preview add liquidity call
 */
export interface PreviewAddLiquidityResponse {
  minted_lp_token_amount: bigint
  refund_amounts: bigint[]
}

export interface AddLiquidityPreview {
  lpAmount: bigint
  refundAmounts: bigint[]
}

/**
 * Preview add liquidity operation in Thala V2 pools
 * @param {PreviewAddLiquidityParams} params Parameters for previewing add liquidity
 * @param {Address} [params.pool] Optional pool address. If not provided, will be derived from assets
 * @param {Address[]} params.assets Array of asset addresses to add liquidity for
 * @param {(bigint|string|number)[]} params.amounts Array of amounts to add for each asset
 * @param {boolean} params.isWeighted Whether this is a weighted or stable pool
 * @param {boolean} [params.isMetastable] Whether this is a metastable pool
 * @returns {Promise<AddLiquidityPreview|undefined>} Preview of LP tokens that would be minted and refund amounts, or undefined if preview fails
 */
export async function previewAddLiquidity(
  { pool, assets, amounts, isWeighted, isMetastable = false }: PreviewAddLiquidityParams,
): Promise<AddLiquidityPreview | undefined> {
  if (!pool)
    pool = findThalaV2PoolConfig(assets[0], assets[1])?.address

  if (!pool) {
    console.error(debugLabel, 'pool not found with assets', ...assets)
    return
  }

  try {
    logger.debug(debugLabel, 'payload', { pool, assets, amounts, isWeighted })
    const moduleAddress = getModuleAddress('thalaV2_pool')
    const views = useSurfClient().useABI(thalaV2_pool_abi, moduleAddress).view
    const previewFunction = isWeighted
      ? views.preview_add_liquidity_weighted
      : isMetastable
        ? views.preview_add_liquidity_metastable
        : views.preview_add_liquidity_stable

    const [result] = await previewFunction({
      typeArguments: [],
      functionArguments: [pool, assets, amounts],
    }) as [PreviewAddLiquidityResponse]

    return {
      lpAmount: result.minted_lp_token_amount,
      refundAmounts: result.refund_amounts,
    }
  }
  catch (error) {
    console.error(debugLabel, 'error previewing add liquidity', error)
  }
}

/**
 * Parameters for previewing remove liquidity operation in Thala V2 pools
 */
export interface PreviewRemoveLiquidityParams {
  pool: Address
  /** if it's different from the pool address */
  lptAddress?: Address
  amount: bigint | string | number
}

/**
 * Response from the on-chain preview remove liquidity call
 */
export interface PreviewRemoveLiquidityResponse {
  /** The amounts of each asset that would be received */
  withdrawn_amounts: string[]
}

/**
 * Preview remove liquidity operation in Thala V2 pools
 * @param {PreviewRemoveLiquidityParams} params Parameters for previewing remove liquidity
 * @param {Address} params.pool The pool address
 * @param {Address} [params.lptAddress] Optional LP token address if different from pool address
 * @param {bigint|string|number} params.amount Amount of LP tokens to remove
 * @returns {Promise<RemoveLiquidityPreview|undefined>} Preview of amounts that would be received, or undefined if preview fails
 */
export async function previewRemoveLiquidity(
  { pool, lptAddress, amount }: PreviewRemoveLiquidityParams,
): Promise<string[] | undefined> {
  logger.debug(debugLabel, 'payload', { pool, lptAddress, amount })

  try {
    const moduleAddress = getModuleAddress('thalaV2_pool')
    const [{ withdrawn_amounts: receivedAmounts }] = await useSurfClient().useABI(
      thalaV2_pool_abi,
      moduleAddress,
    ).view.preview_remove_liquidity({
      typeArguments: [],
      functionArguments: [pool, lptAddress ?? pool, amount],
    }) as [PreviewRemoveLiquidityResponse]

    return receivedAmounts
  }
  catch (error) {
    console.error(debugLabel, 'error previewing remove liquidity', error)
  }
}
