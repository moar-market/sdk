import type { Address } from '../types'
import { moarStrategies_router_abi } from './../abis'
import { useSurfClient } from './../clients'
import { getModuleAddress } from './../config'
import { logger } from './../logger'

// ? not used anymore as oracle.get_price now works for custom tokens too

/**
 * Fetches the price of a custom token from the router
 * @param address The address of the token
 * @param protocol The protocol of the token
 * @returns The price of the token in USD or 0 if the price is not found or error occurs
 * Note: Does not throw any errors, returns '0' and logs the error if any error occurs
 * @deprecated Use fetchOraclePrice instead as oracle.get_price now works for custom tokens too
 */
export async function fetchCustomTokenPrice(address: Address, protocol: number): Promise<string> {
  logger.debug('fetchCustomTokenPrice is deprecated, use fetchOraclePrice instead')
  logger.debug('fetching custom token price', protocol, address)

  const defaultPrice = '0' // ? helps in dev wen oracle is not set or not working

  try {
    const [price] = await useSurfClient().useABI(
      moarStrategies_router_abi,
      getModuleAddress('moarStrategies_router'),
    ).view.get_custom_token_price({
      typeArguments: [],
      functionArguments: [address, protocol],
    })
    logger.debug('fetched custom token price for', protocol, address, price)
    return price ?? defaultPrice
  }
  catch (error) {
    console.error('failed to fetch custom token price for', protocol, address, error)
  }

  return defaultPrice
}
