import type { PositionInfo } from '../hyperion'
import type { Address } from './../../types'
import { goblin_masterchef_abi, goblin_vaults_abi } from './../../abis'
import { useSurfClient } from './../../clients'
import { getModuleAddress } from './../../config'
import { fetchFungibleBalance } from './../../token'
import { getPositionInfo } from './../hyperion'

/**
 * Represents the position ID and pool address for a Goblin vault.
 */
export interface VaultPositionId {
  positionId: Address
  pool: Address
}

/**
 * Retrieves the position ID and pool address associated with a given Goblin vault.
 *
 * @param {Address} vault - The address of the Goblin vault.
 * @returns {Promise<VaultPositionId>} An object containing the positionId and pool address.
 */
export async function getVaultPositionId(vault: Address): Promise<VaultPositionId> {
  const moduleAddress = getModuleAddress('goblin_vaults')
  const [positionId, pool]: [Address, Address] = await useSurfClient().useABI(
    goblin_vaults_abi,
    moduleAddress,
  ).view.get_vault_position_and_pool({
    typeArguments: [],
    functionArguments: [vault],
  })
  return { positionId, pool }
}

/**
 * Parameters for retrieving vault position info.
 */
export interface GetVaultPositionInfoParams {
  positionId?: Address
  pool?: Address
  vault?: Address
}

/**
 * Retrieves detailed position information for a Goblin vault.
 * If positionId and pool are not provided, vault must be provided to resolve them.
 *
 * @param {GetVaultPositionInfoParams} params - The parameters for fetching position info.
 * @param {Address} [params.positionId] - The position ID (optional if vault is provided).
 * @param {Address} [params.pool] - The pool address (optional if vault is provided).
 * @param {Address} [params.vault] - The vault address (optional if positionId and pool are provided).
 * @returns {Promise<PositionInfo>} The position information.
 * @throws {Error} If neither positionId/pool nor vault is provided.
 */
export async function getVaultPositionInfo({
  positionId,
  pool,
  vault,
}: GetVaultPositionInfoParams): Promise<PositionInfo & { objectId: Address, poolId: Address }> {
  if ((!positionId || !pool) && vault) {
    const { positionId: newPositionId, pool: newPool } = await getVaultPositionId(vault)
    positionId = newPositionId
    pool = newPool
  }
  if (!positionId || !pool) {
    throw new Error('positionId and pool are required if vault is not provided')
  }
  const positionInfo = await getPositionInfo(positionId, pool)
  return {
    objectId: positionId,
    poolId: pool,
    ...positionInfo,
  }
}

/**
 * Represents the tokens and their associated fee tokens for a Goblin vault.
 */
export interface VaultTokens {
  tokenA: string
  tokenB: string
  tokenAFee: string
  tokenBFee: string
}

/**
 * Retrieves the token addresses and their associated fee token addresses for a given Goblin vault.
 *
 * @param {Address} vault - The address of the Goblin vault.
 * @returns {Promise<VaultTokens>} An object containing tokenA, tokenB, tokenAFee, and tokenBFee addresses.
 */
export async function getVaultTokens(vault: Address): Promise<VaultTokens> {
  const moduleAddress = getModuleAddress('goblin_vaults')
  const [tokenA, tokenB, tokenAFee, tokenBFee] = await useSurfClient().useABI(
    goblin_vaults_abi,
    moduleAddress,
  ).view.get_vault_tokens({
    typeArguments: [],
    functionArguments: [vault],
  })

  return { tokenA, tokenB, tokenAFee, tokenBFee }
}

/**
 * Retrieves the user's staked LP share balance for a specific pool from the masterchef module.
 *
 * If a user has staked their LP tokens, they will not have the vault LP as a fungible asset (FA) in their account.
 * Instead, their staked LP balance can be retrieved from the masterchef module using this function.
 *
 * @param {number} rewardPoolId - The ID of the pool in the masterchef module.
 * @param {Address} user - The address of the user.
 * @returns {Promise<string>} The user's staked LP share balance.
 */
export async function getStakedLiquidityShares(rewardPoolId: number, user: Address): Promise<string> {
  const moduleAddress = getModuleAddress('goblin_masterchef')
  const [lpShares] = await useSurfClient().useABI(
    goblin_masterchef_abi,
    moduleAddress,
  ).view.get_user_info({
    typeArguments: [],
    functionArguments: [rewardPoolId, user],
  })
  return lpShares
}

/**
 * Retrieves the liquidity share balance for a given credit account and vault.
 *
 * If the user has not staked, their vault LP will be available as a fungible asset (FA) and is fetched directly.
 * If the user has staked, they will not have the vault LP as FA, so the balance is fetched from the masterchef module.
 *
 * @param {object} params - The parameters for fetching liquidity shares.
 * @param {Address} params.vault - The address of the vault.
 * @param {Address} params.user - The address of the credit account.
 * @param {number} [params.rewardPoolId] - The ID of the pool in the masterchef module (required if staked).
 * @returns {Promise<string>} The liquidity share balance.
 */
export async function getLiquidityShares(
  { vault, user, rewardPoolId }: { vault: Address, user: Address, rewardPoolId?: number },
): Promise<string> {
  let lpShares = await fetchFungibleBalance(user, vault)
  // If not found as FA and rewardPoolId is provided, fetch from masterchef (staked)
  if (lpShares === '0' && rewardPoolId !== undefined) {
    lpShares = await getStakedLiquidityShares(rewardPoolId, user)
  }

  return lpShares
}

/**
 * Retrieves the amounts of tokenA and tokenB corresponding to a given amount of LP shares in a specific vault.
 *
 * @param {object} params - The parameters for fetching token amounts.
 * @param {Address} params.vault - The address of the vault.
 * @param {string} params.lpShares - The amount of LP shares.
 * @returns {Promise<{ tokenA: string, tokenB: string }>} An object containing the amounts of tokenA and tokenB.
 */
export async function getTokensFromLPShares(
  { vault, lpShares }: { vault: Address, lpShares: string },
): Promise<{ tokenA: string, tokenB: string }> {
  const moduleAddress = getModuleAddress('goblin_vaults')
  const [tokenA, tokenB] = await useSurfClient().useABI(
    goblin_vaults_abi,
    moduleAddress,
  ).view.get_token_amount_by_share({
    typeArguments: [],
    functionArguments: [vault, lpShares],
  })
  return { tokenA, tokenB }
}

/**
 * Represents a user's position in a vault, including tokenA, tokenB, and LP shares.
 */
interface UserPosition {
  tokenA: string
  tokenB: string
  lpShares: string
}

/**
 * Retrieves a user's position in a vault for a specific pool, including the amounts of tokenA, tokenB, and LP shares.
 *
 * @param {object} params - The parameters for fetching the user position.
 * @param {Address} params.vault - The address of the vault.
 * @param {Address} params.user - The address of the user.
 * @param {number} params.rewardPoolId - The ID of the pool in the masterchef module.
 * @returns {Promise<UserPosition>} An object containing tokenA, tokenB, and lpShares.
 */
export async function getUserPosition(
  { vault, user, rewardPoolId }: { vault: Address, user: Address, rewardPoolId: number },
): Promise<UserPosition> {
  const lpShares = await getLiquidityShares({ vault, user, rewardPoolId })
  const { tokenA, tokenB } = await getTokensFromLPShares({ vault, lpShares })
  return { tokenA, tokenB, lpShares }
}

/**
 * Retrieves the user's pending reward for a specific pool from the masterchef module.
 *
 * @param {object} params - The parameters for fetching the pending reward.
 * @param {number} params.rewardPoolId - The ID of the pool in the masterchef module.
 * @param {Address} params.user - The address of the user.
 * @returns {Promise<string>} The user's pending reward token amount.
 */
export async function getPendingReward(
  { rewardPoolId, user }: { rewardPoolId: number, user: Address },
): Promise<string> {
  const moduleAddress = getModuleAddress('goblin_masterchef')
  const [reward] = await useSurfClient().useABI(
    goblin_masterchef_abi,
    moduleAddress,
  ).view.pending_reward({
    typeArguments: [],
    functionArguments: [rewardPoolId, user],
  })
  return reward
}

export interface PoolRewardInfo {
  totalLPAmount: string
  rewardPerSecond: string
}

/**
 * Retrieves the reward info for a given pool.
 *
 * Use `totalLPAmount` and `rewardPerSecond` to calculate incentive APR:
 * incentiveApr = (rewardPerSecond * 365 * 86400 * reward_token_price) / (totalLPAmount * lp_token_price)
 *
 * @param {number} rewardPoolId - The ID of the pool in rewards.
 * @returns {Promise<PoolRewardInfo>} The reward info.
 */
export async function getPoolRewardInfo(rewardPoolId: number): Promise<PoolRewardInfo> {
  const moduleAddress = getModuleAddress('goblin_masterchef')
  const [,,totalLPAmount, rewardPerSecond] = await useSurfClient().useABI(
    goblin_masterchef_abi,
    moduleAddress,
  ).view.get_pool_info({
    typeArguments: [],
    functionArguments: [rewardPoolId],
  })
  return { totalLPAmount, rewardPerSecond }
}
