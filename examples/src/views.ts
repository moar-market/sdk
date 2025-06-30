/**
 * Moar Market SDK - some view examples
 */

import type { Address } from '@moar-market/sdk'
import { fetchOraclePrices, getAllPools /* setAptosApiKey */ } from '@moar-market/sdk'
// import process from 'process'

const creditAccount: Address = '0x380cbdccc27092d5a767fdc435ecd00e719a6b7c16a47b61be5cd8dd6f69db80'
const usdc_address: Address = '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b'
const apt_address: Address = '0xa'
const null_type = '0x1::string::String'

async function showPoolInfo(): Promise<void> {
  console.log('🏦 Pool Information\n')

  // set these config once in the beginning of the script
  // setAptosApiKey(process.env.APTOS_API_KEY || '') // set aptos api key

  const pools = await getAllPools()

  for (const pool of pools) {
    const deposited = Number(pool.total_deposited)
    const borrowed = Number(pool.total_borrows)
    const utilization = (borrowed / deposited) * 100

    console.log(`💎 ${pool.name} Pool`)
    console.log(`   Deposited: ${(deposited / 1e8).toFixed(2)}`)
    console.log(`   Borrowed: ${(borrowed / 1e8).toFixed(2)}`)
    console.log(`   Utilization: ${utilization.toFixed(2)}%`)
    console.log('')
  }
}

async function showTokenPrices(): Promise<void> {
  console.log('💰 Token Prices\n')

  const tokens: Address[] = [
    apt_address, // APT
    usdc_address, // USDC
  ]

  const prices = await fetchOraclePrices(tokens)
  const names = ['APT', 'USDC']

  tokens.forEach((token, i) => {
    const price = (Number(prices[token]) / 1e8).toFixed(4)
    console.log(`📈 ${names[i]}: $${price}`)
  })
}

async function main(): Promise<void> {
  console.log('🚀 Moar Market SDK Examples\n')

  try {
    await showPoolInfo()
    await showTokenPrices()

    console.log('\n✅ Done!')
  }
  catch (error) {
    console.error('Error:', error)
  }
}

main().catch(console.error)
