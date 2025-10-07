import type { Address, TokenConfig } from '@moar-market/sdk'
import process from 'node:process'
import { calcTotalPrice, unScale } from '@itsmnthn/big-utils'
import { fetchOraclePrice, useAptos } from '@moar-market/sdk'
import { getUserPosition } from '@moar-market/sdk/protocols/goblin'
import { tokens } from './constant'

async function getVaultTokens(
  vault: Address,
  user: Address,
  tokenA: TokenConfig,
  tokenB: TokenConfig,
  rewardPoolId?: number,
) {
  const vaultTokens = await getUserPosition({ vault, user, rewardPoolId })
  const [tokenAPrice, tokenBPrice] = await Promise.all([
    fetchOraclePrice(tokenA.address),
    fetchOraclePrice(tokenB.address),
  ])
  const tokenAUsd = unScale(calcTotalPrice(vaultTokens.tokenA, tokenAPrice, tokenA.decimals, 8), 8)
  const tokenBUsd = unScale(calcTotalPrice(vaultTokens.tokenB, tokenBPrice, tokenB.decimals, 8), 8)
  const usdValue = Number(tokenAUsd) + Number(tokenBUsd)
  return { vaultTokens, tokenAUsd, tokenBUsd, usdValue }
}

async function runAtVersion<T>(lv: number, task: () => Promise<T>): Promise<T> {
  const aptos = useAptos()
  aptos.setLedgerVersion?.(lv)
  try {
    return await task()
  }
  finally {
    aptos.setLedgerVersion?.(undefined)
  }
}

async function main() {
  // Parse process.argv: collect user (-u) and one or more ledger versions (-v)
  const userArgs: Address[] = []
  const versions: number[] = []
  const argv = process.argv
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '-u' && argv[i + 1]) {
      userArgs.push(argv[i + 1] as Address)
    }
    if (argv[i] === '-v' && argv[i + 1]) {
      const n = Number(argv[i + 1])
      if (Number.isFinite(n))
        versions.push(n)
    }
  }

  const rewardLV = 3448883456 // before this version the reward pool id does not exist
  const vault = '0x77d56ce63cf4d8c36a60a8a8f29e11ebbf7a1c0e22d6cd069d7f2e950d2fd0bd' // apt_usdc
  const tokenA = tokens.apt
  const tokenB = tokens.usdc
  const rewardPoolId = 0

  const currentVaultTokens = await getVaultTokens(vault, userArgs[0], tokenA, tokenB, rewardPoolId)
  console.warn('currentVaultTokens:', currentVaultTokens)

  // helper to run calls at a specific version and restore

  const historical = await Promise.all(versions.map(async (lv) => {
    const vaultTokens = await runAtVersion(
      lv,
      async () => await getVaultTokens(vault, userArgs[0], tokenA, tokenB, lv < rewardLV ? rewardPoolId : undefined),
    )
    return {
      ledgerVersion: lv,
      vaultTokens,
    }
  })).then(res => res.sort((a, b) => a.ledgerVersion - b.ledgerVersion))

  console.warn(JSON.stringify({
    currentVaultTokens,
    historical,
  }, null, 2))
}

main()
