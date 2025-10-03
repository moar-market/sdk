import type { Address } from './../../types'
import { hyperion_pool_v3_abi } from './../../abis'
import { useSurfClient } from './../../clients'
import { getModuleAddress } from './../../config'

export async function getCurrentSqrtPrice(pool: Address): Promise<string> {
  const moduleAddress = getModuleAddress('hyperion_pool_v3')
  const [, sqrt_price] = await useSurfClient().useABI(
    hyperion_pool_v3_abi,
    moduleAddress,
  ).view.current_tick_and_price({
    typeArguments: [],
    functionArguments: [pool],
  })

  return sqrt_price
}
