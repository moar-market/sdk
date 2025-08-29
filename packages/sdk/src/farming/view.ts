import type { Address } from '@moar-market/types'
import { moar_farming_abi } from './../abis'
import { useSurfClient } from './../clients'
import { getModuleAddress } from './../config'

export interface ClaimableRewardAmountParams {
  userAddress: Address
  rewardId: string
  farmingIdentifier: string
}

/**
 * Fetches the claimable reward amount for a user in a specific farming instance
 *
 * @param {ClaimableRewardAmountParams} params - Parameters for the query
 * @returns {Promise<string>} A promise that resolves to the claimable reward amount
 * @throws Will throw an error if the view function call fails
 * @example
 * ```ts
 * const res = await getClaimableRewardAmount({
 *   userAddress: "0x123...",
 *   rewardId: "moar-usdc-aptos",
 *   farmingIdentifier: "moar-usdc-aptos"
 * });
 * console.log(res); // "1000000"
 * ```
 */
export async function getClaimableRewardAmount(
  { userAddress, rewardId, farmingIdentifier }: ClaimableRewardAmountParams,
): Promise<string> {
  const moduleAddress = getModuleAddress('moar_farming')

  const data = await useSurfClient().useABI(
    moar_farming_abi,
    moduleAddress,
  ).view.claimable_reward_amount({
    typeArguments: [],
    functionArguments: [userAddress, rewardId, farmingIdentifier],
  })

  return data[0] ?? '0'
}

/**
 * Determines whether a user's stake is initialized in the specified farming instance.
 *
 * @param {Address} userAddress - The address of the user to check for stake initialization.
 * @returns {Promise<boolean>} Resolves to true if the user's stake is initialized, otherwise false.
 * @throws Throws an error if the view function call fails.
 * @example
 * ```ts
 * const initialized = await isStakeInitialized("0x123...");
 * console.log(initialized); // true or false
 * ```
 */
export async function isStakeInitialized(userAddress: Address): Promise<boolean> {
  const moduleAddress = getModuleAddress('moar_farming')

  const [isStakeInitialized] = await useSurfClient().useABI(
    moar_farming_abi,
    moduleAddress,
  ).view.is_stake_initialized({
    typeArguments: [],
    functionArguments: [userAddress],
  })

  return isStakeInitialized
}

/**
 * Retrieves the total staked amount in a farming pool for a given farming identifier.
 *
 * @param {string} farmingIdentifier - The identifier of the farming pool.
 * @returns {Promise<string>} Resolves to the total staked amount as a string.
 * @throws Throws an error if the view function call fails.
 * @example
 * ```ts
 * const stakedAmount = await getPoolStakeAmount("moar-usdc-aptos");
 * console.log(stakedAmount); // "1000000"
 * ```
 */
export async function getPoolStakeAmount(farmingIdentifier: string): Promise<string> {
  const moduleAddress = getModuleAddress('moar_farming')

  const [amount] = await useSurfClient().useABI(
    moar_farming_abi,
    moduleAddress,
  ).view.pool_stake_amount({
    typeArguments: [],
    functionArguments: [farmingIdentifier],
  })

  return amount
}

export interface UserStakeAmountParams {
  userAddress: Address
  farmingIdentifier: string
}

/**
 * Retrieves the staked amount for a user in a specific farming pool.
 *
 * @param {UserStakeAmountParams} params - Parameters for the query
 * @param {Address} params.userAddress - The address of the user.
 * @param {string} params.farmingIdentifier - The identifier of the farming pool.
 * @returns {Promise<string>} Resolves to the user's staked amount as a string.
 * @throws Throws an error if the view function call fails.
 * @example
 * ```ts
 * const amount = await getUserStakeAmount({
 *   userAddress: "0x123...",
 *   farmingIdentifier: "moar-usdc-aptos"
 * });
 * console.log(amount); // "500000"
 * ```
 */
export async function getUserStakeAmount(
  { userAddress, farmingIdentifier }: UserStakeAmountParams,
): Promise<string> {
  const moduleAddress = getModuleAddress('moar_farming')

  const [amount] = await useSurfClient().useABI(
    moar_farming_abi,
    moduleAddress,
  ).view.user_stake_amount({
    typeArguments: [],
    functionArguments: [userAddress, farmingIdentifier],
  })

  return amount
}

/**
 * Checks if a user's pool exists in the specified farming instance.
 * TODO: remove after old lps do reconcile
 *
 * @param {UserStakeAmountParams} params - Parameters for the query
 * @param {Address} params.userAddress - The address of the user.
 * @param {string} params.farmingIdentifier - The identifier of the farming pool.
 * @returns {Promise<boolean>} Resolves to true if the user's pool exists, otherwise false.
 * @throws Throws an error if the view function call fails.
 * @example
 * ```ts
 * const exists = await isReconcileNeeded({
 *   userAddress: "0x123...",
 *   farmingIdentifier: "moar-usdc-aptos"
 * });
 * console.log(exists); // true or false
 * ```
 */
export async function isReconcileNeeded(
  { userAddress, farmingIdentifier }: UserStakeAmountParams,
): Promise<boolean> {
  const moduleAddress = getModuleAddress('moar_farming')

  const [isReconcileNeeded] = await useSurfClient().useABI(
    moar_farming_abi,
    moduleAddress,
  ).view.is_user_pool_exists({
    typeArguments: [],
    functionArguments: [userAddress, farmingIdentifier],
  })

  return isReconcileNeeded
}

/**
 * Checks if farming is enabled for a given farming identifier.
 *
 * @param {string} farmingIdentifier - The identifier of the farming pool.
 * @returns {Promise<boolean>} Resolves to true if farming is enabled, otherwise false.
 * @example
 * ```ts
 * const enabled = await isFarmingEnabled("moar-usdc-aptos");
 * console.log(enabled); // true or false
 * ```
 */
export async function isFarmingEnabled(
  farmingIdentifier: string,
): Promise<boolean> {
  const moduleAddress = getModuleAddress('moar_farming')

  const [isEnabled] = await useSurfClient().useABI(
    moar_farming_abi,
    moduleAddress,
  ).view.is_farming_enabled({
    typeArguments: [],
    functionArguments: [farmingIdentifier],
  })

  return isEnabled
}
