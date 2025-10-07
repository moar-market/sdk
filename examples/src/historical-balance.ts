// oxlint-disable no-console
import type { Address } from '@moar-market/sdk'
import { fetchFungibleBalance, fetchOraclePrice, useAptos, useTokenConfig } from '@moar-market/sdk'

interface Asset { symbol: string, address: Address, decimals: number }
interface Snapshot { amount: number, price: number, value: number }
interface Provided { balance?: number, price?: number }

// Generic percent helper
const pct = (num: number, den: number) => (den === 0 ? 0 : (num / den) * 100)
const toNumber = (raw: unknown) => Number(raw)

// Run a task at a specific ledger version and restore previous
async function runAtVersion<T>(version: number, task: () => Promise<T>) {
  const aptos = useAptos()
  const prev = aptos.getLedgerVersion?.()
  aptos.setLedgerVersion?.(version)
  try {
    return await task()
  }
  finally {
    aptos.setLedgerVersion?.(prev)
  }
}

// Fetch a snapshot (amount/price/value) for a single asset; accepts optional overrides
async function fetchSnapshot(user: Address, asset: Asset, provided?: Provided): Promise<Snapshot> {
  const amountP = provided?.balance != null
    ? Promise.resolve(provided.balance)
    : fetchFungibleBalance(user, asset.address).then(v => Number(v) / asset.decimals)
  const priceP = provided?.price != null
    ? Promise.resolve(provided.price)
    : fetchOraclePrice(asset.address).then(toNumber)
  const [amount, price] = await Promise.all([amountP, priceP])
  return { amount, price, value: amount * price }
}

// Analyze a single asset for current vs historical version
async function analyzeAsset(
  user: Address,
  asset: Asset,
  historicalLv: number,
  currentProvided?: Provided,
  historicalProvided?: Provided,
) {
  const aptos = useAptos()
  const { ledger_version } = await aptos.getLedgerInfo()
  const [current, historical] = await Promise.all([
    fetchSnapshot(user, asset, currentProvided),
    runAtVersion(historicalLv, () => fetchSnapshot(user, asset, historicalProvided)),
  ])
  const changes = {
    amount: {
      absolute: current.amount - historical.amount,
      percent: pct(current.amount - historical.amount, historical.amount),
    },
    price: {
      absolute: current.price - historical.price,
      percent: pct(current.price - historical.price, historical.price),
    },
    value: {
      absolute: current.value - historical.value,
      percent: pct(current.value - historical.value, historical.value),
    },
  }
  return {
    asset: asset.symbol,
    address: asset.address,
    versions: { current: Number(ledger_version), historical: historicalLv },
    current,
    historical,
    changes,
  }
}

// Analyze a set of assets for one historical version
async function analyzeAssets(
  user: Address,
  assets: readonly Asset[],
  historicalLv: number,
  providedCurrent: Record<string, Provided> = {},
  providedHistorical: Record<string, Provided> = {},
) {
  return Promise.all(
    assets.map(a => analyzeAsset(user, a, historicalLv, providedCurrent[a.address], providedHistorical[a.address])),
  )
}

// Analyze a set of assets across multiple historical ledger versions (exported for future use)
export async function analyzeAssetsAcrossVersions(
  user: Address,
  assets: readonly Asset[],
  versions: Array<{ lv: number, assets?: Record<string, Provided> }>,
  providedCurrent: Record<string, Provided> = {},
) {
  const out: Array<{ lv: number, results: Awaited<ReturnType<typeof analyzeAssets>> }> = []
  for (const { lv, assets: overrides } of versions) {
    const results = await analyzeAssets(user, assets, lv, providedCurrent, overrides ?? {})
    out.push({ lv, results })
  }
  return out
}

async function main() {
  // Inputs
  const userAddress: Address = '0xd03d34771b9d22c94b9ed15f401240bc323f69b24da2f7d11de0e52a806978b9'
  const assets: readonly Asset[] = [
    useTokenConfig().find(t => t.symbol === 'APT') as unknown as Asset,
  ]
  const HISTORICAL_LEDGER_VERSION = 3151821422

  // Optional pre-provided snapshots (override if defined), keyed by FA address
  const providedCurrent: Record<string, Provided> = {}
  const providedHistorical: Record<string, Provided> = {}

  // Single-version analysis (keeps script output simple for now)
  const results = await analyzeAssets(userAddress, assets, HISTORICAL_LEDGER_VERSION, providedCurrent, providedHistorical)
  console.log(JSON.stringify({ userAddress, results }, null, 2))
  // Multi-version support (example usage). Provide versions like:
  // const byVersion = await analyzeAssetsAcrossVersions(userAddress, assets, [
  //   { lv: 3151821422, assets: { '0xa': { balance: 100 } } },
  //   { lv: 3151821423 },
  // ])
  // console.log({ userAddress, byVersion })
}

main()
