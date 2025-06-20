/**
 * Moar Market SDK - Simple Examples
 *
 * Basic examples showing pool info and token prices
 */

import type { Address } from '@moar-market/sdk'
import { fetchOraclePrices, getAllPools } from '@moar-market/sdk'

async function showPoolInfo(): Promise<void> {
  console.log('🏦 Pool Information\n')

  const pools = await getAllPools()

  for (const pool of pools.slice(0, 2)) { // Show first 2 pools
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
    '0xa', // APT
    '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b', // USDC
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

    console.log('\n✅ Done! Run individual examples with:')
    console.log('   pnpm example pool-info')
    console.log('   pnpm example token-prices')
  }
  catch (error) {
    console.error('Error:', error)
  }
}

main().catch(console.error)
