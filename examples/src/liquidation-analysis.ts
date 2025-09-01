// oxlint-disable no-unused-vars
// oxlint-disable no-console
import type { Address, CLMMPosition, LTVLiquidationParams } from '@moar-market/sdk'
import type { AccountDebtAndAssetAmounts } from '@moar-market/sdk/credit-manager'
import * as fs from 'node:fs'
import {
  calculateLiquidationPrices,
  createFAAsset,
  fetchOraclePrices,
  useAptos,
  useSurfClient,
} from '@moar-market/sdk'
import { hyperion_pool_v3_abi, hyperion_router_v3_abi, moar_risk_manager_abi, moarStrategies_hyperion_adapter_abi } from '@moar-market/sdk/abis'
import { getModuleAddress } from '@moar-market/sdk/config'
import { getAccountDebtAndAssetAmounts } from '@moar-market/sdk/credit-manager'
import { getAllPositionIds } from '@moar-market/sdk/protocols/hyperion'
import { liquidationData } from './liq_price_data'

// Token addresses for reference
const APT_ADDRESS: Address = '0xa'
const USDC_ADDRESS: Address = '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b'
const USDT_ADDRESS: Address = '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b'
const XBTC_ADDRESS: Address = '0x81214a80d82035a190fcb76b6ff3c0145161c3a9f33d137f2bbaee4cfec8a387' // xBTC address provided by user

// Decimals
const APT_DECIMALS = 8
const USDC_DECIMALS = 6
const USDT_DECIMALS = 6
const XBTC_DECIMALS = 8

const SCALE_8 = 100000000n
const SCALE_8_N = 10 ** 8

// Default correlation for other assets
const DEFAULT_CORRELATION = 0.4

// Hyperion contract address
const HYPERION_CONTRACT_ADDRESS = '0x8b4a2c4bb53857c718a04c020b98f8c2e1f99a68b0f57389a8bf5434cd22e05c'

// Constants from Move code
const SHIFT_64 = 2n ** 64n
const MOAR_STRATS_PRECISION = 100000000n // 10^8

// Custom ABI for position_v3 functions
const position_v3_abi = {
  address: HYPERION_CONTRACT_ADDRESS,
  name: 'position_v3',
  friends: [],
  exposed_functions: [
    {
      name: 'get_liquidity',
      visibility: 'public',
      is_entry: false,
      is_view: true,
      generic_type_params: [],
      params: [
        '0x1::object::Object<0x8b4a2c4bb53857c718a04c020b98f8c2e1f99a68b0f57389a8bf5434cd22e05c::position_v3::Info>',
      ],
      return: [
        'u128',
      ],
    },
    {
      name: 'get_tick',
      visibility: 'public',
      is_entry: false,
      is_view: true,
      generic_type_params: [],
      params: [
        '0x1::object::Object<0x8b4a2c4bb53857c718a04c020b98f8c2e1f99a68b0f57389a8bf5434cd22e05c::position_v3::Info>',
      ],
      return: [
        '0x8b4a2c4bb53857c718a04c020b98f8c2e1f99a68b0f57389a8bf5434cd22e05c::i32::I32',
        '0x8b4a2c4bb53857c718a04c020b98f8c2e1f99a68b0f57389a8bf5434cd22e05c::i32::I32',
      ],
    },
  ],
  structs: [],
} as const

// Interface for position info
interface DirectPositionInfo {
  liquidity: bigint
  token_a_metadata: string
  token_b_metadata: string
  token_a_amount: bigint
  token_b_amount: bigint
  tick_lower: number
  tick_upper: number
  current_tick: number
  pending_fees: bigint[]
  pending_rewards: Array<{
    reward_token: string | { inner: string }
    reward_amount: bigint
  }>
  tick_lower_price: bigint
  tick_upper_price: bigint
  current_price: bigint
}

interface LiquidationAnalysisResult {
  credit_account: string
  strategy: string
  liquidation_version: number
  pool_price_near_liquidation: number
  oracle_price_near_liquidation: number
  health_factor_near_liquidation: number
  low_liquidation_price_near_liquidation: number
  high_liquidation_price_near_liquidation: number
  last_action_tx_version: number
  last_action_name: string
  pool_price_at_last_action: number
  oracle_price_at_last_action: number
  health_factor_at_last_action: number
  low_liquidation_price_at_last_action: number
  high_liquidation_price_at_last_action: number
  pool_price_difference_percentage: number
}

/**
 * Helper function to calculate price from sqrt_price_x64 (from Hyperion lens Move code)
 * Converts the raw sqrt price to actual price ratio (token_a_amount per token_b_amount)
 * accounting for decimal differences between tokens
 */
function getPriceFromSqrtPriceX64(sqrtPriceX64: bigint, tokenADecimals: number, tokenBDecimals: number): bigint {
  const tokenAPrecision = 10n ** BigInt(tokenADecimals)
  const tokenBPrecision = 10n ** BigInt(tokenBDecimals)

  // Calculate net_precision = moar_strats_utils::precision() * token_a_precision / token_b_precision
  const netPrecision = (MOAR_STRATS_PRECISION * tokenAPrecision) / tokenBPrecision

  // Calculate price_x64 = sqrt_price_x64 * sqrt_price_x64 / SHIFT_64
  const priceX64 = (sqrtPriceX64 * sqrtPriceX64) / SHIFT_64

  // Final price = price_x64 * net_precision / SHIFT_64
  return (priceX64 * netPrecision) / SHIFT_64
}

/**
 * Get essential position data using script composer for position_v3 public functions
 */
async function getPositionInfoDirect(
  positionAddress: Address,
  poolAddress: Address,
  tokenADecimals: number,
  tokenBDecimals: number,
): Promise<DirectPositionInfo> {
  const aptos = useAptos()
  const surfClient = useSurfClient()

  // First, get view function data in parallel
  const [
    [current_tick, sqrt_price_x64],
    [token_a_amount, token_b_amount],
    [pending_fees],
    [pending_rewards_packed],
  ] = await Promise.all([
    // 3. Get current tick and price from pool_v3::current_tick_and_price (view function)
    surfClient.useABI(hyperion_pool_v3_abi, HYPERION_CONTRACT_ADDRESS).view.current_tick_and_price({
      typeArguments: [],
      functionArguments: [poolAddress],
    }),
    // 4. Get token amounts from router_v3::get_amount_by_liquidity (view function)
    surfClient.useABI(hyperion_router_v3_abi, HYPERION_CONTRACT_ADDRESS).view.get_amount_by_liquidity({
      typeArguments: [],
      functionArguments: [positionAddress],
    }),
    // 5. Get pending fees from pool_v3::get_pending_fees (view function)
    surfClient.useABI(hyperion_pool_v3_abi, HYPERION_CONTRACT_ADDRESS).view.get_pending_fees({
      typeArguments: [],
      functionArguments: [positionAddress],
    }),
    // 6. Get pending rewards from pool_v3::get_pending_rewards (view function)
    surfClient.useABI(hyperion_pool_v3_abi, HYPERION_CONTRACT_ADDRESS).view.get_pending_rewards({
      typeArguments: [],
      functionArguments: [positionAddress],
    }),
  ])

  const resourceType = '0x8b4a2c4bb53857c718a04c020b98f8c2e1f99a68b0f57389a8bf5434cd22e05c::position_v3::Info'
  const positionResource = await aptos.getAccountResource({ accountAddress: positionAddress, resourceType })
  // console.log('positionResource', positionResource)

  // Convert LP tokens to 1e8 precision
  const liquidity = positionResource.liquidity
  const liquidityDecimals = (tokenBDecimals + tokenADecimals) / 2
  const adjustedLiquidity = BigInt(liquidity) * SCALE_8 / (10n ** BigInt(liquidityDecimals))

  // packed format:  [ { amount_owed: '0', reward_fa: { inner: '0xa' } } ]
  // Map packed rewards to expected format
  const pending_rewards = (pending_rewards_packed as any[]).map((reward: any) => {
    return {
      reward_token: reward.reward_fa.inner,
      reward_amount: BigInt(reward.amount_owed),
    }
  })

  // Calculate proper current price using helper function
  const currentPrice = getPriceFromSqrtPriceX64(BigInt(sqrt_price_x64), tokenADecimals, tokenBDecimals)

  // console.log('===============================================')
  // console.log('liquidity from simulation:', liquidity)
  // console.log('tick_lower from simulation:', positionResource.tick_lower.bits)
  // console.log('tick_upper from simulation:', positionResource.tick_upper.bits)
  // console.log('current_tick (view):', current_tick)
  // console.log('sqrt_price_x64 (view):', sqrt_price_x64)
  // console.log('token_a_amount (view):', token_a_amount)
  // console.log('token_b_amount (view):', token_b_amount)
  // console.log('pending_fees (view):', pending_fees)
  // console.log('pending_rewards (view):', pending_rewards)
  // console.log('currentPrice:', currentPrice)
  // console.log('pending_rewards_packed:', pending_rewards_packed)
  // console.log('===============================================')

  return {
    liquidity: adjustedLiquidity,
    token_a_metadata: positionResource.token_a.inner,
    token_b_metadata: positionResource.token_b.inner,
    token_a_amount: BigInt(token_a_amount),
    token_b_amount: BigInt(token_b_amount),
    tick_lower: positionResource.tick_lower.bits,
    tick_upper: positionResource.tick_upper.bits,
    current_tick: Number(current_tick),
    pending_fees: Array.isArray(pending_fees) ? pending_fees.map(BigInt) : [BigInt(pending_fees)],
    pending_rewards,
    tick_lower_price: 0n, // Not needed for liquidation analysis
    tick_upper_price: 0n, // Not needed for liquidation analysis
    current_price: currentPrice,
  }
}

/**
 * Fetch pool price using hyperion adapter
 */
async function fetchPoolPrice(poolAddress: Address): Promise<number> {
  const surfClient = useSurfClient()

  try {
    const [priceData] = await surfClient.useABI(
      moarStrategies_hyperion_adapter_abi,
      getModuleAddress('moarStrategies_hyperion_adapter'),
    ).view.get_custom_token_price({
      typeArguments: [],
      functionArguments: [poolAddress],
    })

    return Number(priceData) / SCALE_8_N
  }
  catch (error) {
    console.error(`Failed to fetch pool price for ${poolAddress}:`, error)
    return 0
  }
}

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
  positionInfo: DirectPositionInfo,
  positionId: Address,
  debtAmounts: { poolId: number, amount: string }[],
  oraclePrices: Record<Address, string>,
): Promise<CLMMPosition> {
  // Find X and Y debts based on strategy
  let debtX = 0n
  let debtY = 0n

  for (const debt of debtAmounts) {
    if (debt.poolId === 0 && positionInfo.token_a_metadata === APT_ADDRESS) {
      debtX = BigInt(debt.amount)
    }
    else if (debt.poolId === 1 && positionInfo.token_b_metadata === USDC_ADDRESS) {
      debtY = BigInt(debt.amount)
    }
  }

  // Calculate pending fees value in Y terms
  const pendingFeesX = positionInfo.pending_fees[0] || 0n
  const pendingFeesY = positionInfo.pending_fees[1] || 0n

  // Convert X fees to Y terms using current price
  const xFeesInY = (pendingFeesX * positionInfo.current_price) / SCALE_8
  let totalPendingFeesValue = xFeesInY + pendingFeesY

  // Add pending rewards value
  for (const reward of positionInfo.pending_rewards) {
    let rewardTokenAddress: Address
    if (typeof reward.reward_token === 'string') {
      rewardTokenAddress = reward.reward_token as Address
    }
    else if (reward.reward_token && (reward.reward_token as any).inner) {
      rewardTokenAddress = (reward.reward_token as any).inner as Address
    }
    else {
      continue
    }

    const rewardPriceStr = oraclePrices[rewardTokenAddress]
    if (rewardPriceStr) {
      const rewardPrice = BigInt(rewardPriceStr)
      const rewardValueInUSDC = (reward.reward_amount * rewardPrice) / SCALE_8
      totalPendingFeesValue += rewardValueInUSDC
    }
  }

  // Convert ticks from u32 to i32 (2's complement)
  const convertToSignedTick = (tick: number): number => {
    return tick > 2147483647 ? tick - 4294967296 : tick
  }

  return {
    positionId,
    liquidity: positionInfo.liquidity,
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
  poolAddress: Address,
  assetAddresses: Address[],
): { X: Record<string, bigint>, Y: Record<string, bigint> } {
  const matrix = { X: {}, Y: {} } as { X: Record<string, bigint>, Y: Record<string, bigint> }

  // Pool 0 and Pool 1 LTVs
  const pool0Ltvs = ltvData[0] || {}
  const pool1Ltvs = ltvData[1] || {}

  // Add Hyperion position using pool address as position ID
  if (hyperionLtvData[0] && hyperionLtvData[1]) {
    matrix.X[poolAddress] = hyperionLtvData[0]
    matrix.Y[poolAddress] = hyperionLtvData[1]
  }
  else if (hyperionLtvData[0]) {
    matrix.X[poolAddress] = hyperionLtvData[0]
  }
  else if (hyperionLtvData[1]) {
    matrix.Y[poolAddress] = hyperionLtvData[1]
  }

  // Add other assets
  for (const assetAddress of assetAddresses) {
    if (pool0Ltvs[assetAddress] && pool1Ltvs[assetAddress]) {
      matrix.X[assetAddress] = pool0Ltvs[assetAddress]
      matrix.Y[assetAddress] = pool1Ltvs[assetAddress]
    }
    else if (pool0Ltvs[assetAddress]) {
      matrix.X[assetAddress] = pool0Ltvs[assetAddress]
    }
    else if (pool1Ltvs[assetAddress]) {
      matrix.Y[assetAddress] = pool1Ltvs[assetAddress]
    }
  }

  return matrix
}

/**
 * Get token addresses and decimals based on strategy
 */
function getTokenInfo(strategy: string): { tokenA: Address, tokenB: Address, tokenADecimals: number, tokenBDecimals: number } {
  if (strategy.includes('APT-USDC')) {
    return {
      tokenA: APT_ADDRESS,
      tokenB: USDC_ADDRESS,
      tokenADecimals: APT_DECIMALS,
      tokenBDecimals: USDC_DECIMALS,
    }
  }
  else if (strategy.includes('xBTC-USDC')) {
    return {
      tokenA: XBTC_ADDRESS,
      tokenB: USDC_ADDRESS,
      tokenADecimals: XBTC_DECIMALS,
      tokenBDecimals: USDC_DECIMALS,
    }
  }
  else if (strategy.includes('USDC-USDT')) {
    return {
      tokenA: USDC_ADDRESS,
      tokenB: USDT_ADDRESS,
      tokenADecimals: USDC_DECIMALS,
      tokenBDecimals: USDT_DECIMALS,
    }
  }
  else {
    throw new Error(`Unsupported strategy: ${strategy}`)
  }
}

/**
 * Analyze a single credit account at a specific ledger version
 */
async function analyzeAccountAtVersion(
  creditAccount: Address,
  poolAddress: Address,
  strategy: string,
  ledgerVersion: number,
): Promise<{
  poolPrice: number
  oraclePrice: number
  healthFactor: number
  lowLiquidationPrice: number
  highLiquidationPrice: number
} | null> {
  const aptos = useAptos()
  aptos.setLedgerVersion?.(ledgerVersion)

  // Get token info based on strategy
  const { tokenA, tokenB, tokenADecimals, tokenBDecimals } = getTokenInfo(strategy)

  // 1. Fetch account debt and asset data
  const debtAndAssets: AccountDebtAndAssetAmounts = await getAccountDebtAndAssetAmounts(creditAccount)

  // 2. Fetch hyperion positions
  const positions = await getAllPositionIds(creditAccount)
  if (positions.length === 0) {
    throw new Error(`No positions found for ${creditAccount} at version ${ledgerVersion}`)
  }

  if (positions.length > 1) {
    throw new Error(`Multiple positions found for ${creditAccount} at version ${ledgerVersion}`)
  }

  const position = positions[0]
  const positionInfo: DirectPositionInfo = await getPositionInfoDirect(
    position.positionId,
    position.poolAddress,
    tokenADecimals,
    tokenBDecimals,
  )

  // 3. Fetch pool price
  const poolPrice = await fetchPoolPrice(poolAddress)

  // 4. Fetch oracle prices
  const rewardTokens = positionInfo.pending_rewards.map((r) => {
    if (typeof r.reward_token === 'string') {
      return r.reward_token
    }
    else if (r.reward_token && (r.reward_token as any).inner) {
      return (r.reward_token as any).inner as Address
    }
    return null
  }).filter(Boolean) as Address[]

  const allAssetAddresses = [
    tokenA,
    tokenB,
    ...debtAndAssets.assetValues.map(a => a.address).filter(addr =>
      addr !== tokenA && addr !== tokenB,
    ),
    ...rewardTokens.filter(addr =>
      addr !== tokenA && addr !== tokenB,
    ),
  ]

  const oraclePrices = await fetchOraclePrices(allAssetAddresses)

  // Calculate oracle price ratio (tokenA / tokenB)
  const tokenAPriceStr = oraclePrices[tokenA]
  const tokenBPriceStr = oraclePrices[tokenB]
  const oraclePrice = tokenAPriceStr && tokenBPriceStr
    ? Number(tokenAPriceStr) / Number(tokenBPriceStr)
    : 0

  // 5. Fetch LTV ratios
  const poolIds = [...new Set(debtAndAssets.debtValues.map(d => d.poolId))]
  const ltvData = await fetchLTVRatios(poolIds, allAssetAddresses)
  const hyperionLtvData = await fetchHyperionLTVRatios(position.poolAddress)

  // 6. Convert to liquidation calculation format
  const clmmPosition: CLMMPosition = await convertToClmmPosition(
    positionInfo,
    position.poolAddress,
    debtAndAssets.debtValues,
    oraclePrices,
  )

  const assetAddressesForLTV = [
    tokenA,
    tokenB,
    ...debtAndAssets.assetValues.map(a => a.address).filter(addr =>
      addr !== tokenA && addr !== tokenB,
    ),
  ]

  const ltvMatrix = createLTVMatrixFromChain(
    ltvData,
    hyperionLtvData,
    position.poolAddress,
    assetAddressesForLTV,
  )

  // Create FA assets
  const faAssets = []
  for (const asset of debtAndAssets.assetValues) {
    if (asset.address === position.positionId || asset.address === position.poolAddress)
      continue

    const price = Number(oraclePrices[asset.address]) || 0
    if (price === 0)
      throw new Error(`Price is 0 for ${asset.address}`)

    // const usdValue = Number(asset.amount) * price / 10 ** decimals / SCALE_8_N
    const decimals = asset.address === USDC_ADDRESS || asset.address === USDT_ADDRESS ? USDC_DECIMALS : APT_DECIMALS

    // if (usdValue < 0.1) continue

    let correlation = DEFAULT_CORRELATION
    if (asset.address === tokenB && (tokenB === USDC_ADDRESS || tokenB === USDT_ADDRESS)) {
      correlation = 0.0 // Stablecoin
    }
    else if (asset.address === tokenA) {
      correlation = 1.0 // Same as X token
    }

    faAssets.push(createFAAsset(
      asset.address,
      BigInt(asset.amount),
      BigInt(Math.floor(price * SCALE_8_N / Number(oraclePrices[tokenB]))),
      BigInt(Math.floor(correlation)) * SCALE_8,
      decimals,
    ))
  }

  // Current price in X/Y terms
  const currentPrice = positionInfo.current_price

  // 7. Setup liquidation parameters and calculate
  const params: LTVLiquidationParams = {
    position: clmmPosition,
    ltvMatrix,
    faAssets,
    currentPrice,
    xDecimals: tokenADecimals,
    yDecimals: tokenBDecimals,
  }

  // console.log('params', params)
  const result = await calculateLiquidationPrices(params)

  return {
    poolPrice,
    oraclePrice,
    healthFactor: Number(result.currentMarginRatio) / SCALE_8_N,
    lowLiquidationPrice: Number(result.liquidationPrices[0]) / SCALE_8_N,
    highLiquidationPrice: Number(result.liquidationPrices[1]) / SCALE_8_N,
  }
}

/**
 * Analyze all liquidation accounts and generate CSV
 */
async function analyzeLiquidationAccounts(): Promise<void> {
  console.log('🔍 Starting liquidation analysis for all accounts...\n')

  const results: LiquidationAnalysisResult[] = []
  let processed = 0
  const total = liquidationData.length

  for (const accountData of liquidationData) {
    processed++
    console.log(`\n[${processed}/${total}] Analyzing account: ${accountData.credit_account_address}`)
    console.log(`Strategy: ${accountData.strategy}`)

    try {
      // Analyze at liquidation version - 1
      console.log(`Fetching data at liquidation version - 1 (${accountData.liquidation_tx_version - 1})...`)
      const nearLiquidationData = await analyzeAccountAtVersion(
        accountData.credit_account_address,
        accountData.pool_address,
        accountData.strategy,
        accountData.liquidation_tx_version - 1,
      )

      // Analyze at last action version + 1
      console.log(`Fetching data at last action version + 1 (${accountData.last_action_tx_version + 1})...`)
      const lastActionData = await analyzeAccountAtVersion(
        accountData.credit_account_address,
        accountData.pool_address,
        accountData.strategy,
        accountData.last_action_tx_version + 1,
      )

      if (nearLiquidationData && lastActionData) {
        // Calculate price difference percentage of liquidation price at last action and price at liquidation
        const liquidationPriceDifferenceWithLower = (lastActionData.lowLiquidationPrice - nearLiquidationData.poolPrice) * 100 / nearLiquidationData.poolPrice
        const liquidationPriceDifferenceWithHigh = (lastActionData.highLiquidationPrice - nearLiquidationData.poolPrice) * 100 / nearLiquidationData.poolPrice
        // take the min of absolute value of the two
        const poolPriceDifference = Math.abs(liquidationPriceDifferenceWithLower) < Math.abs(liquidationPriceDifferenceWithHigh) ? liquidationPriceDifferenceWithLower : liquidationPriceDifferenceWithHigh

        const result: LiquidationAnalysisResult = {
          credit_account: accountData.credit_account_address,
          strategy: accountData.strategy,
          liquidation_version: accountData.liquidation_tx_version,
          pool_price_near_liquidation: Number(nearLiquidationData.poolPrice.toFixed(2)),
          oracle_price_near_liquidation: Number(nearLiquidationData.oraclePrice.toFixed(2)),
          health_factor_near_liquidation: nearLiquidationData.healthFactor,
          low_liquidation_price_near_liquidation: Number(nearLiquidationData.lowLiquidationPrice.toFixed(2)),
          high_liquidation_price_near_liquidation: Number(nearLiquidationData.highLiquidationPrice.toFixed(2)),
          last_action_name: accountData.last_action_event_name,
          last_action_tx_version: accountData.last_action_tx_version,
          pool_price_at_last_action: Number(lastActionData.poolPrice.toFixed(2)),
          oracle_price_at_last_action: Number(lastActionData.oraclePrice.toFixed(2)),
          health_factor_at_last_action: lastActionData.healthFactor,
          low_liquidation_price_at_last_action: Number(lastActionData.lowLiquidationPrice.toFixed(2)),
          high_liquidation_price_at_last_action: Number(lastActionData.highLiquidationPrice.toFixed(2)),
          pool_price_difference_percentage: Number(poolPriceDifference.toFixed(2)),
        }

        results.push(result)
        console.log('✅ Analysis completed successfully')
      }
      else {
        console.log('❌ Failed to get complete data for this account')
      }
    }
    catch (error) {
      console.error(`❌ Error analyzing account ${accountData.credit_account_address}:`, error)
    }

    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 120000))
    // break;
  }

  // console.log('results', results)
  // return
  // Generate CSV
  console.log('\n📄 Generating CSV file...')
  const csvHeaders = [
    'credit_account',
    'strategy',
    'liquidation_version',
    'pool_price_near_liquidation',
    'oracle_price_near_liquidation',
    'health_factor_near_liquidation',
    'low_liquidation_price_near_liquidation',
    'high_liquidation_price_near_liquidation',
    'last_action_name',
    'last_action_tx_version',
    'pool_price_at_last_action',
    'oracle_price_at_last_action',
    'health_factor_at_last_action',
    'low_liquidation_price_at_last_action',
    'high_liquidation_price_at_last_action',
    'pool_price_difference_percentage',
  ]

  const csvRows = results.map(result => [
    result.credit_account,
    result.strategy,
    result.liquidation_version.toString(),
    result.pool_price_near_liquidation.toString(),
    result.oracle_price_near_liquidation.toString(),
    result.health_factor_near_liquidation.toString(),
    result.low_liquidation_price_near_liquidation.toString(),
    result.high_liquidation_price_near_liquidation.toString(),
    result.last_action_name,
    result.last_action_tx_version.toString(),
    result.pool_price_at_last_action.toString(),
    result.oracle_price_at_last_action.toString(),
    result.health_factor_at_last_action.toString(),
    result.low_liquidation_price_at_last_action.toString(),
    result.high_liquidation_price_at_last_action.toString(),
    result.pool_price_difference_percentage.toString(),
  ])

  const csvContent = [csvHeaders, ...csvRows]
    .map(row => row.join(','))
    .join('\n')

  // Write to file
  const outputPath = 'liquidation_analysis_results.csv'
  fs.writeFileSync(outputPath, csvContent)

  console.log(`\n✅ Analysis complete! Results saved to: ${outputPath}`)
  console.log(`📊 Successfully analyzed ${results.length} out of ${total} accounts`)
}

/**
 * Main function
 */
async function main() {
  await analyzeLiquidationAccounts()
}

main().catch(console.error)

export { analyzeLiquidationAccounts }
