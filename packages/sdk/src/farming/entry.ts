import type { EntryPayload } from '@thalalabs/surf'
import { createEntryPayload } from '@thalalabs/surf'
import { moar_farming_abi } from './../abis'
import { getModuleAddress } from './../config'

export interface ClaimRewardEntryParams {
  rewardId: string
  farmingIdentifier: string
}

/**
 * Generates an entry payload for claiming farming rewards in the Moar protocol.
 *
 * @param params - The parameters required to claim rewards.
 * @param params.rewardId - The ID of the reward.
 * @param params.farmingIdentifier - The identifier for the farming instance.
 * @returns The entry payload to be submitted for claiming rewards.
 */
export function getClaimRewardEntryPayload(
  { rewardId, farmingIdentifier }: ClaimRewardEntryParams,
): EntryPayload {
  const moduleAddress = getModuleAddress('moar_farming')

  return createEntryPayload(moar_farming_abi, {
    address: moduleAddress,
    function: 'claim_reward_entry',
    typeArguments: [],
    functionArguments: [rewardId, farmingIdentifier],
  })
}

/**
 * Creates an entry function payload for reconciling existing LP staking for a user.
 * This is used to migrate or update the user's LP staking state in the protocol.
 *
 * @returns {EntryPayload} The entry function payload for the reconcile_existing_lp_staking call
 * @example
 * ```ts
 * const payload = getReconcileExistingLpStakingPayload();
 * ```
 */
export function getReconcileExistingLpStakingPayload(): EntryPayload {
  const moduleAddress = getModuleAddress('moar_farming')

  return createEntryPayload(moar_farming_abi, {
    address: moduleAddress,
    function: 'reconcile_existing_lp_staking',
    typeArguments: [],
    functionArguments: [],
  })
}
