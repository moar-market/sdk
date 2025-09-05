import { calcUnitPrice } from '@itsmnthn/big-utils'
import { thalaV2_staking_abi } from './../../../abis'
import { useSurfClient } from './../../../clients'
import { getModuleAddress } from './../../../config'

const APT_DECIMALS = 8

/**
 * Fetches the current exchange rate between sthAPT and thAPT from the Thala V2 staking contract.
 * The exchange rate is calculated using the synced on-chain values and normalized to 8 decimals.
 *
 * @returns {Promise<bigint>} The current sthAPT exchange rate in thAPT units, normalized to 8 decimals.
 * @throws Will throw an error if the view function call fails
 */
export async function fetchSthAPTExchangeRate(): Promise<bigint> {
  const moduleAddress = getModuleAddress('thalaV2_staking')

  const [thAPT, sthAPT] = await useSurfClient().useABI(
    thalaV2_staking_abi,
    moduleAddress,
  ).view.thAPT_sthAPT_exchange_rate_synced({
    typeArguments: [],
    functionArguments: [],
  })

  return calcUnitPrice(sthAPT, thAPT, APT_DECIMALS, APT_DECIMALS)
}
