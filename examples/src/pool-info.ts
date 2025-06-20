/**
 * Example: Pool Information
 *
 * Simple example showing how to fetch and display lending pool information
 */

import { getAllPools } from '@moar-market/sdk'

async function main(): Promise<void> {
  console.log('🏦 Moar Market Pool Information\n')

  try {
    const pools = await getAllPools()

    console.log(`Found ${pools.length} lending pools:\n`)

    for (const pool of pools) {
      console.log(`💎 ${pool.name} Pool`)
      console.log(`   Pool ID: ${pool.id}`)
      console.log(`   Asset: ${pool.underlying_asset}`)

      // Calculate and display utilization
      const deposited = Number(pool.total_deposited)
      const borrowed = Number(pool.total_borrows)
      const utilization = (borrowed / deposited) * 100

      console.log(`   Total Deposited: ${(deposited / 1e8).toFixed(2)}`)
      console.log(`   Total Borrowed: ${(borrowed / 1e8).toFixed(2)}`)
      console.log(`   Utilization: ${utilization.toFixed(2)}%`)
      console.log(`   Status: ${pool.is_paused ? '⏸️ Paused' : '✅ Active'}`)
      console.log('')
    }
  }
  catch (error) {
    console.error('Error:', error)
  }
}

main().catch(console.error)
