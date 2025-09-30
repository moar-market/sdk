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
 * Retrieves the liquidity share balance for a given credit account and vault.
 * A wrapper around fetchFungibleBalance.
 *
 * @param {object} params - The parameters for fetching liquidity shares.
 * @param {Address} params.vault - The address of the vault.
 * @param {Address} params.creditAccount - The address of the credit account.
 * @returns {Promise<string>} The liquidity share balance as a string.
 */
export async function getLiquidityShares(
  { vault, creditAccount }: { vault: Address, creditAccount: Address },
): Promise<string> {
  return await fetchFungibleBalance(creditAccount, vault)
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
 * @param {number} poolId - The ID of the pool in rewards.
 * @returns {Promise<PoolRewardInfo>} The reward info.
 */
export async function getPoolRewardInfo(poolId: number): Promise<PoolRewardInfo> {
  const moduleAddress = getModuleAddress('goblin_masterchef')
  const [,,totalLPAmount, rewardPerSecond] = await useSurfClient().useABI(
    goblin_masterchef_abi,
    moduleAddress,
  ).view.get_pool_info({
    typeArguments: [],
    functionArguments: [poolId],
  })
  return { totalLPAmount, rewardPerSecond }
}
