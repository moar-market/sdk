import { thalaV2_staking_abi } from './../../../abis'
import { useSurfClient } from './../../../clients'
import { getModuleAddress } from './../../../config'

/**
 * Get the APR for sthAPT
 * @returns The APR for sthAPT
 */
export async function getSthAPTApr(): Promise<number> {
  try {
    const [
      rewardPerEpoch,
      commissionFee,
      extraRewardsForSthAptHolders,
      thAptStakeRate,
    ] = await Promise.all([
      getSthAptRewardRate(),
      getCommissionFee(),
      getExtraRewardsForSthAptHolders(),
      getThAptStakeRate(),
    ])

    const adjustedRewardPerEpoch
      = rewardPerEpoch
        * (1 - commissionFee)
        * (thAptStakeRate
          + extraRewardsForSthAptHolders
          - extraRewardsForSthAptHolders * thAptStakeRate)

    // 1 epoch = 2 hours
    return Number((adjustedRewardPerEpoch * 365 * 12 * 100).toFixed(2)) // in percentage
  }
  catch {
    return 0
  }
}

/**
 * Get the reward rate for sthAPT
 * @returns The reward rate for sthAPT
 */
async function getSthAptRewardRate(): Promise<number> {
  const moduleAddress = getModuleAddress('thalaV2_staking')
  const [{ value: rewardRate }] = await useSurfClient().useABI(
    thalaV2_staking_abi,
    moduleAddress,
  ).view.sthAPT_reward_rate({
    typeArguments: [],
    functionArguments: [],
  }) as [{ value: string }]

  return fp64ToFloat(BigInt(rewardRate))
}

/**
 * Get the commission fee for sthAPT
 * @returns The commission fee for sthAPT
 */
async function getCommissionFee(): Promise<number> {
  const moduleAddress = getModuleAddress('thalaV2_staking')
  const [bps] = await useSurfClient().useABI(
    thalaV2_staking_abi,
    moduleAddress,
  ).view.commission_fee_bps({
    typeArguments: [],
    functionArguments: [],
  })

  return Number(bps) / 10000
}

/**
 * Get the extra rewards for sthAPT holders
 * @returns The extra rewards for sthAPT holders
 */
async function getExtraRewardsForSthAptHolders(): Promise<number> {
  const moduleAddress = getModuleAddress('thalaV2_staking')
  const [bps] = await useSurfClient().useABI(
    thalaV2_staking_abi,
    moduleAddress,
  ).view.extra_rewards_for_sthAPT_holders_bps({
    typeArguments: [],
    functionArguments: [],
  })

  return Number(bps) / 10000
}

/**
 * Get the sthAPT stake rate
 * @returns The sthAPT stake rate
 */
async function getThAptStakeRate(): Promise<number> {
  const moduleAddress = getModuleAddress('thalaV2_staking')

  const [[thAptStaking], [thAptSupply]] = await Promise.all([
    useSurfClient().useABI(
      thalaV2_staking_abi,
      moduleAddress,
    ).view.thAPT_staking({
      typeArguments: [],
      functionArguments: [],
    }),
    useSurfClient().useABI(
      thalaV2_staking_abi,
      moduleAddress,
    ).view.thAPT_supply({
      typeArguments: [],
      functionArguments: [],
    }),
  ])

  return Number(thAptStaking) / Number(thAptSupply)
}

const ONE = BigInt(1)
const ZERO = BigInt(0)

/**
 * Convert a bigint to a float
 * @param a - The bigint to convert
 * @returns The float value
 */
function fp64ToFloat(a: bigint): number {
  // avoid large number
  let mask = BigInt('0xffffffff000000000000000000000000')
  if ((a & mask) !== ZERO) {
    throw new Error('too large')
  }

  // integer part
  mask = BigInt('0x10000000000000000')
  let base = 1
  let result = 0
  for (let i = 0; i < 32; ++i) {
    if ((a & mask) !== ZERO) {
      result += base
    }
    base *= 2
    mask = mask << ONE
  }

  // fractional part
  mask = BigInt('0x8000000000000000')
  base = 0.5
  for (let i = 0; i < 32; ++i) {
    if ((a & mask) !== ZERO) {
      result += base
    }
    base /= 2
    mask = mask >> ONE
  }
  return result
}
