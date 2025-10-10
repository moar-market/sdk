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
  const CHUNK_SIZE = 10
  const priceMap: Record<Address, string> = {}
  const failedChunks: Address[][] = []

  // Step 1: Split the addresses into chunks of 10.
  const addressChunks: Address[][] = []
  for (let i = 0; i < addresses.length; i += CHUNK_SIZE) {
    addressChunks.push(addresses.slice(i, i + CHUNK_SIZE))
  }
  logger.debug(loggerLabel, `split ${addresses.length} addresses into ${addressChunks.length} chunks`)

  // Step 2: Create a promise for each chunk to fetch prices in bulk.
  const chunkPromises = addressChunks.map(chunk =>
    useSurfClient().useABI(
      moar_lens_abi,
      getModuleAddress('moar_lens'),
    ).view.get_prices({
      typeArguments: [],
      functionArguments: [chunk],
    }),
  )

  // Step 3: Use Promise.allSettled to execute all chunk requests.
  // This ensures that one failed chunk doesn't prevent others from completing.
  const results = await Promise.allSettled(chunkPromises)

  // Step 4: Process the results of the settled promises.
  results.forEach((result, index) => {
    const chunk = addressChunks[index]
    if (result.status === 'fulfilled') {
      const [prices] = result.value
      // Ensure the returned prices array matches the chunk length.
      if (Array.isArray(prices) && prices.length === chunk.length) {
        chunk.forEach((address, idx) => {
          priceMap[address] = prices[idx] ?? defaultPrice
        })
        logger.debug(loggerLabel, 'successfully fetched prices for chunk', index)
      }
      else {
        logger.warn(loggerLabel, `get_prices returned unexpected result for chunk ${index}, marking for fallback.`)
        failedChunks.push(chunk)
      }
    }
    else { // status === 'rejected'
      console.error(loggerLabel, `failed to fetch oracle prices for chunk ${index}`, result.reason)
      failedChunks.push(chunk)
    }
  })

  // Step 5: For any chunks that failed, fetch their prices individually as a fallback.
  const addressesToFetchIndividually = failedChunks.flat()
  if (addressesToFetchIndividually.length > 0) {
    logger.debug(loggerLabel, 'fetching prices individually as fallback for:', addressesToFetchIndividually)
    const fallbackPromises = addressesToFetchIndividually.map(address =>
      fetchOraclePrice(address).then(price => ({ address, price })),
    )

    // Again, use allSettled to be robust against individual failures.
    const fallbackResults = await Promise.allSettled(fallbackPromises)

    fallbackResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { address, price } = result.value
        priceMap[address] = price
      }
      // If an individual call fails, fetchOraclePrice already logs it and returns '0',
      // so we don't need to handle the 'rejected' case here explicitly.
    })
  }

  logger.debug(loggerLabel, 'finished fetching all prices.', priceMap)
  return priceMap
}
