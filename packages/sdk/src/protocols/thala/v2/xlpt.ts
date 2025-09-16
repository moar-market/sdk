import type { Address } from '../../../types'
import { thalaV2_staked_lpt_abi } from './../../../abis'
import { useSurfClient } from './../../../clients'
import { getModuleAddress } from './../../../config'
import { logger } from './../../../logger'

/**
 * Retrieves the accumulated rewards for a user's staked LP tokens in Thala V2 protocol
 *
 * @param userAddress - The address of the user
 * @param xlptAddress - The address of the xLPT (staked LP token)
 * @param rewardId - The address of the reward token, with or without `@` prefix
 * @returns A promise that resolves to the accumulated rewards as a string
 */
export async function getAccumulatedReward(
  userAddress: Address,
  xlptAddress: Address,
  rewardId: Address | `@${Address}` | string,
): Promise<string> {
  const debugLabel = 'getAccumulatedReward'
  const moduleAddress = getModuleAddress('thalaV2_staked_lpt')
  logger.debug(debugLabel, {
    moduleAddress,
    userAddress,
    xlptAddress,
    rewardId: rewardId.startsWith('@') ? rewardId : `@${rewardId}`,
  })
  const [rewards] = await useSurfClient().useABI(
    thalaV2_staked_lpt_abi,
    moduleAddress,
  ).view.claimable_reward({
    typeArguments: [],
    functionArguments: [userAddress, xlptAddress, rewardId.startsWith('@') ? rewardId : `@${rewardId}`],
  })
  logger.debug(debugLabel, 'rewards', rewards)
  return rewards
}
