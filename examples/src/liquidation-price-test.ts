// oxlint-disable no-console
import type { Address, CLMMPosition, LTVLiquidationParams } from '@moar-market/sdk'
import type { AccountDebtAndAssetAmounts } from '@moar-market/sdk/credit-manager'
import type { PositionInfo } from '@moar-market/sdk/protocols/hyperion'
import {
  calculateLiquidationPrices,
  createFAAsset,
  fetchOraclePrices,
  formatLiquidationResult,
  useAptos,
  useSurfClient,
} from '@moar-market/sdk'
import { moar_risk_manager_abi, moarStrategies_hyperion_adapter_abi } from '@moar-market/sdk/abis'
import { getModuleAddress } from '@moar-market/sdk/config'
import { getAccountDebtAndAssetAmounts } from '@moar-market/sdk/credit-manager'
import { getAllPositionIds, getPositionInfo } from '@moar-market/sdk/protocols/hyperion'

// Liquidated account details
const LEDGER_VERSION = undefined
// const LEDGER_VERSION = 3140012280
const CREDIT_ACCOUNT: Address = '0x56bb6f3a1219fd5bee394eeb43ef905da56b9ab9152b1aae8a616e3512ea4a0a' // APT-USDC position
// const CREDIT_ACCOUNT: Address = '0x59d1c649d8e67576d49d708c51dde6e922bb0698dea26c2493f604cff2cfe528' // wBTC-USDC position

// Common token addresses
const TOKEN_A_ADDRESS: Address = '0xa'
// const TOKEN_A_ADDRESS: Address = '0x68844a0d7f2587e726ad0579f3d640865bb4162c08a4589eeda3f9689ec52a3d' // wBTC
const TOKEN_A_DECIMALS = 8
const USDC_ADDRESS: Address = '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b'
const USDC_DECIMALS = 6

// // Hyperion pool addresses
// const HYPERION_APT_USDC_POOL: Address = '0x925660b8618394809f89f8002e2926600c775221f43bf1919782b297a79400d8'

// Default correlation for other assets
const DEFAULT_CORRELATION = 0.4
const SCALE_8 = 100000000n
const SCALE_8_N = 10 ** 8
const SCALE_6_N = 10 ** 6
const APT_DECIMALS = 8

/**
 * Fetch LTV ratios from hyperion adapter for a given pool address
 */
async function fetchHyperionLTVRatios(poolAddress: Address): Promise<Record<number, bigint>> {
  const surfClient = useSurfClient()

  try {
    const [ltvData] = await surfClient.useABI(
      moarStrategies_hyperion_adapter_abi,
      getModuleAddress('moarStrategies_hyperion_adapter'),
    ).view.get_ltv_map({
      typeArguments: [],
      functionArguments: [poolAddress],
    })

    const ltvMap: Record<number, bigint> = {}

    // Parse the structure: { data: [{ key: '0', value: '83333333' }, ...] }
    const ltvDataAny = ltvData as any
    if (ltvDataAny && ltvDataAny.data && Array.isArray(ltvDataAny.data)) {
      for (const entry of ltvDataAny.data) {
        const poolId = Number(entry.key)
        const ltv = BigInt(entry.value)
        ltvMap[poolId] = ltv
      }
    }
    else {
      console.log('Unexpected Hyperion LTV data structure:', ltvData)
    }

    return ltvMap
  }
  catch (error) {
    console.error('Failed to fetch Hyperion LTV ratios for pool', poolAddress, ':', error)
    return {}
  }
}

/**
 * Fetch LTV ratios from risk manager for given pool IDs and asset addresses
 */
async function fetchLTVRatios(poolIds: number[], assetAddresses: Address[]): Promise<Record<number, Record<Address, bigint>>> {
  const surfClient = useSurfClient()

  try {
    const [ltvData] = await surfClient.useABI(
      moar_risk_manager_abi,
      getModuleAddress('moar_risk_manager'),
    ).view.get_all_ltvs({
      typeArguments: [],
      functionArguments: [poolIds],
    })

    const ltvMap: Record<number, Record<Address, bigint>> = {}

    for (const poolLtv of ltvData as any[]) {
      const poolId = Number(poolLtv.pool_id)
      ltvMap[poolId] = {}

      for (let i = 0; i < poolLtv.asset.length; i++) {
        const assetAddress = poolLtv.asset[i].inner as Address
        const ltv = BigInt(poolLtv.ltv[i])
        ltvMap[poolId][assetAddress] = ltv
      }
    }

    return ltvMap
  }
  catch (error) {
    console.error('Failed to fetch LTV ratios:', error)
    return {}
  }
}

/**
 * Convert on-chain position info to CLMMPosition format
 */
async function convertToClmmPosition(
  positionInfo: PositionInfo,
  positionId: Address,
  debtAmounts: { poolId: number, amount: string }[],
  oraclePrices: Record<Address, string>,
): Promise<CLMMPosition> {
  // Find X (APT) and Y (USDC) debts
  let debtX = 0n
  let debtY = 0n

  for (const debt of debtAmounts) {
    if (debt.poolId === 0) { // Assuming pool 0 is APT
      debtX = BigInt(debt.amount)
    }
    else if (debt.poolId === 1) { // Assuming pool 1 is USDC
      debtY = BigInt(debt.amount)
    }
  }

  // Calculate pending fees value in Y terms (USDC)
  const pendingFeesX = BigInt(positionInfo.pending_fees[0] || 0)
  const pendingFeesY = BigInt(positionInfo.pending_fees[1] || 0)

  // Convert X fees to Y terms using current price
  const xFeesInY = (pendingFeesX * BigInt(positionInfo.current_price)) / SCALE_8 // 1e8
  let totalPendingFeesValue = xFeesInY + pendingFeesY

  // Add pending rewards value
  for (const reward of positionInfo.pending_rewards) {
    // Extract the actual address from reward_token (handle both string and object formats)
    let rewardTokenAddress: Address
    if (typeof reward.reward_token === 'string') {
      rewardTokenAddress = reward.reward_token
    }
    else if (reward.reward_token && (reward.reward_token as any).inner) {
      rewardTokenAddress = (reward.reward_token as any).inner as Address
    }
    else {
      console.log(`⚠️  Invalid reward token format:`, reward.reward_token)
      continue
    }

    const rewardPriceStr = oraclePrices[rewardTokenAddress]
    if (rewardPriceStr) {
      // Convert string price to bigint (oracle prices are in 1e8 scale)
      const rewardPrice = BigInt(rewardPriceStr)
      // Convert reward amount to USDC terms using oracle price
      const rewardValueInUSDC = (BigInt(reward.reward_amount) * rewardPrice) / SCALE_8
      totalPendingFeesValue += rewardValueInUSDC
      console.log(`✅ Added reward: ${rewardTokenAddress} - ${Number(reward.reward_amount) / SCALE_8_N} tokens = ${Number(rewardValueInUSDC) / SCALE_8_N} USDC`)
    }
    else {
      console.log(`⚠️  No oracle price for reward token ${rewardTokenAddress}`)
    }
  }

  // Convert ticks from u32 to i32 (2's complement)
  const convertToSignedTick = (tick: number): number => {
    return tick > 2147483647 ? tick - 4294967296 : tick
  }

  return {
    positionId,
    liquidity: BigInt(positionInfo.liquidity),
    tickLower: convertToSignedTick(positionInfo.tick_lower),
    tickUpper: convertToSignedTick(positionInfo.tick_upper),
    currentTick: convertToSignedTick(positionInfo.current_tick),
    debtX,
    debtY,
    pending_fee_and_rewards_value: totalPendingFeesValue,
  }
}

/**
 * Create LTV matrix from on-chain data
 */
function createLTVMatrixFromChain(
  ltvData: Record<number, Record<Address, bigint>>,
  hyperionLtvData: Record<number, bigint>,
  poolAddress: Address, // The hyperion pool address (used as position ID)
  assetAddresses: Address[],
): { X: Record<string, bigint>, Y: Record<string, bigint> } {
  const matrix = { X: {}, Y: {} } as { X: Record<string, bigint>, Y: Record<string, bigint> }

  // Pool 0 = APT (X), Pool 1 = USDC (Y)
  const aptLtvs = ltvData[0] || {}
  const usdcLtvs = ltvData[1] || {}

  // Add Hyperion position using pool address as position ID
  if (hyperionLtvData[0] && hyperionLtvData[1]) {
    matrix.X[poolAddress] = hyperionLtvData[0] // LTV for pool address against APT debt
    matrix.Y[poolAddress] = hyperionLtvData[1] // LTV for pool address against USDC debt
  }
  else if (hyperionLtvData[0]) {
    matrix.X[poolAddress] = hyperionLtvData[0] // LTV for pool address against APT debt
  }
  else if (hyperionLtvData[1]) {
    matrix.Y[poolAddress] = hyperionLtvData[1] // LTV for pool address against USDC debt
  }
  else {
    console.log(`⚠️  Warning: No Hyperion LTV found for pool ${poolAddress}`)
  }

  // Add other assets - only include those with LTV entries
  for (const assetAddress of assetAddresses) {
    if (aptLtvs[assetAddress] && usdcLtvs[assetAddress]) {
      matrix.X[assetAddress] = aptLtvs[assetAddress]
      matrix.Y[assetAddress] = usdcLtvs[assetAddress]
    }
    else if (aptLtvs[assetAddress]) {
      matrix.X[assetAddress] = aptLtvs[assetAddress]
    }
    else if (usdcLtvs[assetAddress]) {
      matrix.Y[assetAddress] = usdcLtvs[assetAddress]
    }
    else {
      console.log(`⚠️  Warning: No LTV found for asset ${assetAddress} - skipping from liquidation calculation`)
    }
  }

  return matrix
}

/**
 * Main test function for liquidated account
 */
async function testLiquidationPrice() {
  console.log('=== Liquidated Credit Account Analysis ===\n')
  console.log(`Credit Account: ${CREDIT_ACCOUNT}`)
  console.log(`Ledger Version: ${LEDGER_VERSION}`)
  console.log('')

  const aptos = useAptos()
  // @ts-expect-error setLedgerVersion is not typed correctly
  aptos.setLedgerVersion?.(LEDGER_VERSION)

  try {
    // 1. Fetch account debt and asset data
    console.log('📊 Fetching account data...')
    const debtAndAssets: AccountDebtAndAssetAmounts = await getAccountDebtAndAssetAmounts(CREDIT_ACCOUNT)

    // 2. Fetch hyperion positions
    console.log('\n🔄 Fetching Hyperion positions...')
    const positions = await getAllPositionIds(CREDIT_ACCOUNT)

    if (positions.length === 0) {
      console.log('No Hyperion positions found!')
      return
    }

    console.log(`Found ${positions.length} position(s)`)

    // Get detailed info for the first position
    const position = positions[0]
    const positionInfo: PositionInfo = await getPositionInfo(position.positionId, position.poolAddress)

    // convert LP tokens to 1e8 precision
    const liquidityDecimals = (USDC_DECIMALS + TOKEN_A_DECIMALS) / 2 // (token_a_decimals + token_b_decimals) / 2
    positionInfo.liquidity = BigInt(positionInfo.liquidity) * SCALE_8 / (10n ** BigInt(liquidityDecimals))

    console.log(`Position: ${Number(positionInfo.token_a_amount) / SCALE_8_N} APT + ${Number(positionInfo.token_b_amount) / SCALE_6_N} USDC, Price: ${Number(positionInfo.current_price) / SCALE_8_N}`)

    // 3. Fetch oracle prices (including reward tokens)
    console.log('\n💰 Fetching oracle prices...')
    const rewardTokens = positionInfo.pending_rewards.map((r) => {
      // Handle both string addresses and objects with inner property
      if (typeof r.reward_token === 'string') {
        return r.reward_token
      }
      else if (r.reward_token && (r.reward_token as any).inner) {
        return (r.reward_token as any).inner as Address
      }
      return null
    }).filter(Boolean) as Address[]

    const allAssetAddresses = [
      TOKEN_A_ADDRESS,
      USDC_ADDRESS,
      ...debtAndAssets.assetValues.map(a => a.address).filter(addr =>
        addr !== TOKEN_A_ADDRESS && addr !== USDC_ADDRESS,
      ),
      ...rewardTokens.filter(addr =>
        addr !== TOKEN_A_ADDRESS && addr !== USDC_ADDRESS,
      ),
    ]

    const oraclePrices = await fetchOraclePrices(allAssetAddresses)
    console.log(`Oracle prices fetched for ${Object.keys(oraclePrices).length} tokens`)

    // 4. Fetch LTV ratios
    console.log('\n📋 Fetching LTV ratios...')
    const poolIds = [...new Set(debtAndAssets.debtValues.map(d => d.poolId))]
    const ltvData = await fetchLTVRatios(poolIds, allAssetAddresses)

    console.log(`LTV ratios fetched for ${Object.keys(ltvData).length} pools`)

    // 5. Fetch Hyperion LTV ratios for the pool
    console.log('\n📋 Fetching Hyperion LTV ratios...')
    const hyperionLtvData = await fetchHyperionLTVRatios(position.poolAddress)
    console.log(`Hyperion LTV ratios fetched for pool ${position.poolAddress}`)

    // 5. Convert to liquidation calculation format
    console.log('\n🔄 Converting to liquidation calculation format...')

    // Convert position (use pool address as position ID for LTV lookup)
    const clmmPosition: CLMMPosition = await convertToClmmPosition(
      positionInfo,
      position.poolAddress, // Use pool address as position ID for Hyperion
      debtAndAssets.debtValues,
      oraclePrices,
    )

    // Create LTV matrix (only include actual assets, not reward tokens)
    const assetAddressesForLTV = [
      TOKEN_A_ADDRESS,
      USDC_ADDRESS,
      ...debtAndAssets.assetValues.map(a => a.address).filter(addr =>
        addr !== TOKEN_A_ADDRESS && addr !== USDC_ADDRESS,
      ),
    ]
    const ltvMatrix = createLTVMatrixFromChain(
      ltvData,
      hyperionLtvData,
      position.poolAddress, // Use pool address as position ID for Hyperion
      assetAddressesForLTV,
    )

    // Create FA assets (excluding amounts already in CLMM position)
    const faAssets = []

    for (const asset of debtAndAssets.assetValues) {
      // Skip if this is the CLMM position itself (check both position object and pool address)
      if (asset.address === position.positionId || asset.address === position.poolAddress)
        continue

      const price = Number(oraclePrices[asset.address]) || 0
      if (price === 0)
        throw new Error(`Oracle price for asset ${asset.address} is 0`)

      // Determine asset decimals (default to 8, but USDC is 6)
      const decimals = asset.address === USDC_ADDRESS ? USDC_DECIMALS : APT_DECIMALS

      // Calculate USD value of this asset
      const usdValue = Number(asset.amount) * price / 10 ** decimals / SCALE_8_N // Convert oracle price from 1e8 to decimal

      // Skip amounts less than $0.1
      if (usdValue < 0.1) {
        console.log(`⚠️  Skipping asset ${asset.address} - value $${usdValue.toFixed(6)} < $0.1 threshold`)
        continue
      }

      // Calculate correlation based on asset type
      let correlation = DEFAULT_CORRELATION
      if (asset.address === USDC_ADDRESS) {
        correlation = 0.0 // Stablecoin
      }
      else if (asset.address === TOKEN_A_ADDRESS) {
        correlation = 1.0 // Same as X token
      }

      faAssets.push(createFAAsset(
        asset.address,
        BigInt(asset.amount),
        BigInt(Math.floor(price * SCALE_8_N / Number(oraclePrices[USDC_ADDRESS]))), // Price in USDC terms
        BigInt(Math.floor(correlation)) * SCALE_8,
        decimals,
      ))

      console.log(`✅ Added asset: ${asset.address} = $${usdValue.toFixed(2)}`)
    }

    // Current price in X/Y terms (APT/USDC)
    const currentPrice = BigInt(positionInfo.current_price)

    // 6. Setup liquidation parameters
    const params: LTVLiquidationParams = {
      position: clmmPosition,
      ltvMatrix,
      faAssets,
      currentPrice,
      xDecimals: TOKEN_A_DECIMALS, // APT decimals
      yDecimals: USDC_DECIMALS, // USDC decimals
    }

    // console.log('Liquidation Parameters:')
    // console.log(params)

    // 7. Calculate liquidation prices
    console.log('\n⚡ Calculating liquidation prices...')
    const result = await calculateLiquidationPrices(params)

    // 8. Display results
    const formatted = formatLiquidationResult(result, 6)

    console.log('\n📊 Liquidation Analysis Results:')
    console.log('================================')
    console.log(`Current Margin Ratio: ${Number(result.currentMarginRatio) / SCALE_8_N}`)
    console.log(`Margin Buffer: ${Number(result.marginBuffer) / SCALE_8_N}`)
    console.log(`Risk Level: ${formatted.riskLevel}`)
    console.log(`Position at Risk: ${result.isAtRisk ? 'YES ⚠️' : 'NO ✅'}`)

    console.log('\n💰 Liquidation Prices:')
    console.log('=====================')
    console.log(`Lower Liquidation Price: ${Number(result.liquidationPrices[0]) / SCALE_8_N} APT per USDC`)
    console.log(`Upper Liquidation Price: ${Number(result.liquidationPrices[1]) / SCALE_8_N} APT per USDC`)
    console.log(`Current Price: ${Number(currentPrice) / SCALE_8_N} APT per USDC`)

    console.log('\n📈 Distance to Liquidation:')
    console.log('===========================')
    console.log(`Distance to Lower: ${(Number(result.liquidationDistance.low) / SCALE_8_N * 100).toFixed(2)}%`)
    console.log(`Distance to Upper: ${(Number(result.liquidationDistance.high) / SCALE_8_N * 100).toFixed(2)}%`)

    console.log('\n🔍 Position Breakdown:')
    console.log('=====================')
    const totalAssetsUSD = Number(result.breakdown.totalAssets) / SCALE_8_N * Number(oraclePrices[USDC_ADDRESS]) / SCALE_8_N
    const totalDebtsUSD = Number(result.breakdown.totalDebts) / SCALE_8_N * Number(oraclePrices[USDC_ADDRESS]) / SCALE_8_N
    const wdrUSD = Number(result.breakdown.weightedDebtRequirement) / SCALE_8_N * Number(oraclePrices[USDC_ADDRESS]) / SCALE_8_N

    console.log(`Total Assets: ${Number(result.breakdown.totalAssets) / SCALE_8_N} USDC ≈ $${totalAssetsUSD.toFixed(2)}`)
    console.log(`Total Debts: ${Number(result.breakdown.totalDebts) / SCALE_8_N} USDC ≈ $${totalDebtsUSD.toFixed(2)}`)
    console.log(`Weighted Debt Requirement: ${Number(result.breakdown.weightedDebtRequirement) / SCALE_8_N} USDC ≈ $${wdrUSD.toFixed(2)}`)

    console.log('\n📋 Asset Breakdown:')
    console.log('==================')
    for (const [asset, value] of Object.entries(result.breakdown.assetBreakdown)) {
      const valueUSD = Number(value) / SCALE_8_N * Number(oraclePrices[USDC_ADDRESS]) / SCALE_8_N
      console.log(`${asset}: ${Number(value) / SCALE_8_N} USDC ≈ $${valueUSD.toFixed(2)}`)
    }

    // Historical context
    const marginRatioNum = Number(result.currentMarginRatio) / SCALE_8_N
    console.log('\n📈 Historical Analysis:')
    console.log('======================')
    console.log(`Margin Ratio at Version ${LEDGER_VERSION}: ${marginRatioNum.toFixed(4)}`)

    if (marginRatioNum < 1.0) {
      console.log('🔴 Account was underwater (assets < weighted debt requirement)')
    }
    else if (marginRatioNum < 1.1) {
      console.log('🟡 Account was in danger zone (margin ratio < 1.1)')
    }
    else {
      console.log('🟢 Account appeared healthy at this snapshot')
    }
  }
  catch (error) {
    console.error('Error during liquidation analysis:', error)
  }
  finally {
    // @ts-expect-error setLedgerVersion is not typed correctly
    aptos.setLedgerVersion?.(undefined)
  }
}

/**
 * Run the liquidated account test
 */
async function main() {
  await testLiquidationPrice()
}

main().catch(console.error)

export { testLiquidationPrice }
