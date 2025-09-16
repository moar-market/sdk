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

  if (addresses.length === 0) {
    return {}
  }

  const defaultPrice = '0'

  try {
    const [prices] = await useSurfClient().useABI(
      moar_lens_abi,
      getModuleAddress('moar_lens'),
    ).view.get_prices({
      typeArguments: [],
      functionArguments: [addresses],
    })

    if (Array.isArray(prices) && prices.length === addresses.length) {
      const priceMap = addresses.reduce((acc, address, idx) => {
        acc[address] = prices[idx] ?? defaultPrice
        return acc
      }, {} as Record<Address, string>)
      logger.debug(loggerLabel, ': fetched oracle prices for', addresses, priceMap)
      return priceMap
    }

    logger.warn(loggerLabel, ': get_prices returned unexpected result, falling back to individual fetch')
  }
  catch (error) {
    console.error(loggerLabel, ': failed to fetch oracle prices for', addresses, error)
  }

  logger.debug(loggerLabel, ': fetching prices individually as fallback', addresses)
  const fallbackPrices = await Promise.all(
    addresses.map(async (address) => {
      const price = await fetchOraclePrice(address)
      return [address, price ?? defaultPrice] as [Address, string]
    }),
  )
  const fallbackPriceMap = fallbackPrices.reduce((acc, [address, price]) => {
    acc[address] = price
    return acc
  }, {} as Record<Address, string>)

  logger.debug(loggerLabel, ': fetched fallback oracle prices for', addresses, fallbackPriceMap)
  return fallbackPriceMap
}
