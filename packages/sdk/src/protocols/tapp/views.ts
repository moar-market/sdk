import type { Address } from './../../types'
import { moar_tapp_lens_abi, tapp_stable_views_abi } from './../../abis'
import { useSurfClient } from './../../clients'
import { getModuleAddress } from './../../config'

function TappStableViews() {
  return useSurfClient().useABI(tapp_stable_views_abi, getModuleAddress('tapp_stable_views'))
}

function MoarTappLens() {
  return useSurfClient().useABI(moar_tapp_lens_abi, getModuleAddress('moar_tapp_lens'))
}

export interface PreviewStableLPTokenParams {
  pool: Address
  amounts: bigint[]
  isDeposit: boolean
}

/**
 * Previews the amount of LP tokens received or withdrawn for a given stable pool & token amounts
 *
 * @param {PreviewStableLPTokenParams} params - The parameters for previewing LP tokens.
 *   - pool: The pool address.
 *   - amounts: An array of token input amounts as bigint should be in the same order as the pool tokens
 *   - isDeposit: Set to true for deposit preview, false for withdrawal preview.
 * @returns {Promise<string>} The amount of LP tokens (as a string) that would be minted or withdrawn.
 */
export async function previewStableLPToken(
  params: PreviewStableLPTokenParams,
): Promise<string> {
  const [data] = await TappStableViews().view.calc_token_amount({
    typeArguments: [],
    functionArguments: [params.pool, params.amounts, params.isDeposit],
  })

  return data
}

export interface PreviewRemoveLiquidityParams {
  pool: Address
  amount: bigint
}

/**
 * Previews the output token amounts for removing a specific amount of LP tokens from a stable pool.
 *
 * @param {PreviewRemoveLiquidityParams} params - The parameters for previewing liquidity removal.
 *   @property {Address} pool - The address of the stable pool.
 *   @property {bigint} amount - The amount of LP tokens to remove.
 * @returns {Promise<string[]>} An array of output token amounts (as strings), ordered the same as the pool's tokens.
 */
export async function previewRemoveLiquidity(
  params: PreviewRemoveLiquidityParams,
): Promise<string[]> {
  const [data] = await TappStableViews().view.calc_ratio_amounts({
    typeArguments: [],
    functionArguments: [params.pool, params.amount],
  })

  return data
}

export interface GetLpAmountParams {
  pool: Address
  positionIdx: number
}

/**
 * Fetches the current LP token share amount for a given stable pool position.
 *
 * @param {GetLpAmountParams} params - The parameters for querying position shares.
 *   @property {Address} pool - The address of the pool
 *   @property {number} positionIdx - The index identifying the position within the pool.
 * @returns {Promise<string>} The current LP token amount (as a string) associated with the specified position.
 */
export async function getLpAmount(
  params: GetLpAmountParams,
): Promise<string> {
  const [data] = await TappStableViews().view.position_shares({
    typeArguments: [],
    functionArguments: [params.pool, params.positionIdx],
  })

  return data
}

interface TappPendingReward {
  rewardAmount: string
  rewardToken: Address
}

export interface TappPositionInfo {
  pendingRewards: TappPendingReward[]
  poolId: Address
  positionAddr: Address
  positionIdx: number
  lpAmount: string
  tokens: Address[]
  amounts: string[]
  positionUSD: string
}

interface RawTappPendingReward {
  reward_amount: string
  reward_token: { inner: Address }
}

interface RawTappPositionInfo {
  pending_rewards: RawTappPendingReward[]
  pool_address: Address
  position_address: Address
  position_index: string
  position_shares: string
  token_amounts: string[]
  token_metadata: Array<{ inner: Address }>
  value: string
}

/**
 * Fetches all positions and pools for a given credit account from the Tapp adapter.
 *
 * @param {Address} creditAccount - The address of the credit account.
 * @returns {Promise<TappPositionInfo[]>} An array of position information objects containing:
 *   - pendingRewards: Array of pending rewards with reward amount and token address
 *   - poolAddress: The address of the pool
 *   - positionAddress: The address of the position
 *   - positionIndex: The index of the position
 *   - positionShares: The amount of LP tokens (as string)
 *   - tokenAmounts: Array of token amounts for each token in the pool
 *   - tokenMetadata: Array of token metadata addresses
 *   - positionUSD: The position USD value (as string)
 */
export async function getPositionInfo(creditAccount: Address): Promise<TappPositionInfo[]> {
  const [rawPositionInfo] = await MoarTappLens().view.get_position_info({
    typeArguments: [],
    functionArguments: [creditAccount],
  })

  return (rawPositionInfo as RawTappPositionInfo[]).map((position) => {
    const rewardsMap = new Map<Address, bigint>()

    position.pending_rewards.forEach((reward) => {
      const tokenAddress = reward.reward_token.inner
      const currentAmount = rewardsMap.get(tokenAddress) || BigInt(0)
      rewardsMap.set(tokenAddress, currentAmount + BigInt(reward.reward_amount))
    })

    const pendingRewards: TappPendingReward[] = Array.from(rewardsMap.entries())
      .map(([rewardToken, rewardAmount]) => ({
        rewardAmount: rewardAmount.toString(),
        rewardToken,
      }))

    return {
      pendingRewards,
      poolId: position.pool_address,
      positionAddr: position.position_address,
      positionIdx: Number(position.position_index),
      lpAmount: position.position_shares,
      tokens: position.token_metadata.map(metadata => metadata.inner),
      amounts: position.token_amounts,
      positionUSD: position.value,
    }
  })
}
