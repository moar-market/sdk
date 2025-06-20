/**
 * Example: Token Prices
 *
 * Simple example showing how to fetch token prices from the oracle
 */

import type { Address } from '@moar-market/sdk'
import { fetchOraclePrice, fetchOraclePrices } from '@moar-market/sdk'

// Common token addresses on Aptos
const APT_ADDRESS: Address = '0xa'
const USDC_ADDRESS: Address = '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b'

async function main(): Promise<void> {
  console.log('💰 Token Prices from Moar Oracle\n')

  try {
    // Fetch single token price
    console.log('📊 Single Token Price:')
    const aptPrice = await fetchOraclePrice(APT_ADDRESS)
    console.log(`   APT: $${(Number(aptPrice) / 1e8).toFixed(4)}`)

    console.log('\n📈 Multiple Token Prices:')

    // Fetch multiple token prices at once
    const tokenAddresses = [APT_ADDRESS, USDC_ADDRESS]
    const prices = await fetchOraclePrices(tokenAddresses)

    const tokenNames = ['APT', 'USDC']
    tokenAddresses.forEach((address, index) => {
      const price = prices[address]
      const priceFormatted = (Number(price) / 1e8).toFixed(4)
      console.log(`   ${tokenNames[index]}: $${priceFormatted}`)
    })
  }
  catch (error) {
    console.error('Error:', error)
  }
}

main().catch(console.error)
