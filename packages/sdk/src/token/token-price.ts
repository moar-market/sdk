import type { Address } from '../types'
import { moar_lens_abi, moar_oracle_abi } from './../abis'
import { useSurfClient } from './../clients'
import { getModuleAddress } from './../config'
import { logger } from './../logger'

/**
 * Fetches the price of a token from the oracle
 * @param address the address of the token
 * @returns the price of the token in USD or 0 if the price is not found or error occurs
 * Note: Does not throw any errors, returns '0' and logs the error if any error occurs
 */
export async function fetchOraclePrice(address: Address): Promise<string> {
  const loggerLabel = 'Oracle'
  logger.debug(loggerLabel, ': fetching oracle price', address)

  const defaultPrice = '0' // ? helps in dev wen oracle is not set or not working

  try {
    const [price] = await useSurfClient().useABI(
      moar_oracle_abi,
      getModuleAddress('moar_oracle'),
    ).view.get_price({
      typeArguments: [],
      functionArguments: [address],
    })
    logger.debug(loggerLabel, ': fetched oracle price for', address, price)
    return price ?? defaultPrice
  }
  catch (error) {
    console.error(loggerLabel, ': failed to fetch price for', address, error)
  }

  return defaultPrice
}

/**
 * Fetches the prices of multiple tokens from the oracle in a single request
 * @param addresses an array of token addresses to fetch prices for
 * @returns a record mapping each token address to its price in USD
 * Note: Does not throw any errors, returns a map with '0' values and logs the error if any error occurs
 */
export async function fetchOraclePrices(addresses: Address[]): Promise<Record<Address, string>> {
  const loggerLabel = 'Oracle'
  logger.debug(loggerLabel, ': fetching oracle prices', addresses)

  const defaultPriceMap: Record<Address, string> = {}
  addresses.forEach((address) => {
    defaultPriceMap[address] = '0' // Default price for each address
  })

  try {
    const [prices] = await useSurfClient().useABI(
      moar_lens_abi,
      getModuleAddress('moar_lens'),
    ).view.get_prices({
      typeArguments: [],
      functionArguments: [addresses],
    })

    const priceMap: Record<Address, string> = {}
    addresses.forEach((address, index) => {
      priceMap[address] = prices[index] ?? '0'
    })

    logger.debug(loggerLabel, ': fetched oracle prices for', addresses, priceMap)
    return priceMap
  }
  catch (error) {
    console.error(loggerLabel, ': failed to fetch oracle prices for', addresses, error)
  }

  return defaultPriceMap
}
