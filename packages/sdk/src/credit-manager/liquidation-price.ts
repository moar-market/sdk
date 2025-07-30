import type { Address, AnyNumber } from '../types'
import { absBig, formatAmount } from '@itsmnthn/big-utils'

// =============================================================================
// INTERFACES AND TYPES
// =============================================================================

/**
 * LTV ratios for different debt/collateral combinations
 * Values should be scaled by 1e8 (e.g., 0.75 = 75000000n)
 */
export interface PoolAssetLTVMatrix {
  X: Record<string, bigint> // LTV ratios for X debt against different collaterals
  Y: Record<string, bigint> // LTV ratios for Y debt against different collaterals
}

/**
 * Fungible Asset (FA) with correlation to pool price
 */
export interface FAAsset {
  assetAddress: Address
  amount: bigint // Amount scaled by asset decimals (will be converted to 1e8 internally)
  currentPrice: bigint // Current price in Y token terms, scaled by 1e8
  correlation: bigint // Correlation with X/Y pool price (-1e8 to 1e8)
  decimals: number // Asset decimals for proper scaling
}

/**
 * Concentrated liquidity position parameters (treated as non-FA asset)
 */
export interface CLMMPosition {
  positionId: Address // Position identifier for LTV lookup
  liquidity: bigint // Liquidity amount, scaled by 1e8
  tickLower: number // Lower tick
  tickUpper: number // Upper tick
  currentTick: number // Current tick
  debtX: bigint // X debt amount, scaled by asset decimals (will be converted to 1e8 internally)
  debtY: bigint // Y debt amount, scaled by asset decimals (will be converted to 1e8 internally)
  pending_fee_and_rewards_value: bigint // Pending fees and rewards value in Y terms, scaled by 1e8
}

/**
 * Parameters for LTV liquidation calculation
 */
export interface LTVLiquidationParams {
  position: CLMMPosition
  ltvMatrix: PoolAssetLTVMatrix
  faAssets: FAAsset[] // Fungible assets (including extraX, extraY)
  currentPrice: bigint // Current X/Y price scaled by 1e8
  xDecimals: number
  yDecimals: number
}

/**
 * Liquidation calculation result - all values scaled by 1e8
 */
export interface LiquidationResult {
  liquidationPrices: [bigint, bigint] // [lower, upper] prices scaled by 1e8
  currentMarginRatio: bigint // Current margin ratio scaled by 1e8
  isAtRisk: boolean // Whether position is at liquidation risk
  marginBuffer: bigint // Margin buffer scaled by 1e8
  liquidationDistance: {
    low: bigint // Distance to lower liquidation (scaled by 1e8)
    high: bigint // Distance to upper liquidation (scaled by 1e8)
  }
  breakdown: {
    totalAssets: bigint // Total asset value scaled by 1e8
    totalDebts: bigint // Total debt value in Y terms scaled by 1e8
    weightedDebtRequirement: bigint // Weighted debt requirement scaled by 1e8
    assetBreakdown: Record<string, bigint> // Individual asset values scaled by 1e8
  }
}

// =============================================================================
// MATH CONSTANTS AND UTILITIES
// =============================================================================

const DEFAULT_DECIMALS = 8
const SCALE_8 = 100000000n // 1e8
const MAX_PRICE = 100000000000000000n // Max price (1e17, very high)
const MIN_PRICE = 1n // Min price (very low)
const MAX_U64 = 18446744073709551615n // Max u64 value
const PRICE_DELTA = 10000n // 0.01% in 1e8 scale

/**
 * Adjust amount from source decimals to target decimals
 */
function adjustDecimalScale(amount: bigint, fromDecimals: number, toDecimals: number): bigint {
  if (fromDecimals === toDecimals) {
    return amount
  }
  return fromDecimals > toDecimals
    ? amount / (10n ** BigInt(fromDecimals - toDecimals))
    : amount * (10n ** BigInt(toDecimals - fromDecimals))
}

/**
 * Calculate sqrt of a bigint and return result scaled by 1e8
 * Input value should be scaled by 1e8
 */
function bigIntSqrt(value: bigint): bigint {
  if (value < 0n)
    throw new Error('Cannot calculate sqrt of negative number')
  if (value < 2n)
    return value * 10000n // Scale small values to 1e8

  // For values scaled by 1e8, we want sqrt to also be scaled by 1e8
  // So we multiply by 1e8 before taking sqrt, then the result is scaled by 1e8
  const scaledValue = value * SCALE_8

  let x = scaledValue
  let y = (scaledValue + 1n) / 2n

  while (y < x) {
    x = y
    y = (x + scaledValue / x) / 2n
  }

  return x
}

/**
 * Convert tick to price scaled by 1e8
 */
function tickToPrice(tick: number, xDecimals: number, yDecimals: number): bigint {
  // Convert tick to price using: price = 1.0001^tick * 1e8
  const base = 1.0001
  const price = base ** tick
  // since above price is in token Y / token X price, we need to convert it 1e8
  const netMultiplier = SCALE_8 * (10n ** BigInt(xDecimals)) / (10n ** BigInt(yDecimals))
  return BigInt(Math.floor(price * Number(netMultiplier)))
}

// =============================================================================
// CONCENTRATED LIQUIDITY MATH
// =============================================================================

/**
 * Calculate X token amount from liquidity and price range
 * Uses correct concentrated liquidity formula: X(p) = L × (√pb - √p) / (√p × √pb)
 */
function calculateXFromLiquidity(liquidity: bigint, price: bigint, priceLower: bigint, priceUpper: bigint): bigint {
  if (price <= priceLower) {
    // All liquidity in X tokens: X = L × (√pb - √pa) / (√pa × √pb)
    // Both prices are scaled by 1e8, sqrt returns values scaled by 1e8
    const sqrtPriceLower = bigIntSqrt(priceLower)
    const sqrtPriceUpper = bigIntSqrt(priceUpper)

    // Safety check: avoid division by zero
    const denominator = sqrtPriceLower * sqrtPriceUpper
    if (denominator === 0n) {
      return MAX_U64
    }

    // Avoid truncation: multiply first, then divide
    return (liquidity * (sqrtPriceUpper - sqrtPriceLower) * SCALE_8) / denominator
  }
  else if (price >= priceUpper) {
    // No X tokens
    return 0n
  }
  else {
    // Partial X: X(p) = L × (√pb - √p) / (√p × √pb)
    const sqrtPrice = bigIntSqrt(price)
    const sqrtPriceUpper = bigIntSqrt(priceUpper)

    // Safety check: avoid division by zero
    const denominator = sqrtPrice * sqrtPriceUpper
    if (denominator === 0n) {
      return MAX_U64
    }

    return (liquidity * (sqrtPriceUpper - sqrtPrice) * SCALE_8) / denominator
  }
}

/**
 * Calculate Y token amount from liquidity and price range
 * Uses correct concentrated liquidity formula: Y(p) = L × (√p - √pa)
 */
function calculateYFromLiquidity(liquidity: bigint, price: bigint, priceLower: bigint, priceUpper: bigint): bigint {
  if (price <= priceLower) {
    // No Y tokens
    return 0n
  }
  else if (price >= priceUpper) {
    // All liquidity in Y tokens: Y = L × (√pb - √pa)
    // Both prices are scaled by 1e8, sqrt returns values scaled by 1e8
    const sqrtPriceLower = bigIntSqrt(priceLower)
    const sqrtPriceUpper = bigIntSqrt(priceUpper)
    // sqrt values are scaled by 1e8, so divide by 1e8 to get token amount
    return (liquidity * (sqrtPriceUpper - sqrtPriceLower)) / SCALE_8
  }
  else {
    // Partial Y: Y(p) = L × (√p - √pa)
    const sqrtPrice = bigIntSqrt(price)
    const sqrtPriceLower = bigIntSqrt(priceLower)
    return (liquidity * (sqrtPrice - sqrtPriceLower)) / SCALE_8
  }
}

// =============================================================================
// LIQUIDATION MATH IMPLEMENTATION
// =============================================================================

/**
 * Calculate total asset value in Y token terms, all values scaled by 1e8
 */
function calculateTotalAssets(
  price: bigint,
  position: CLMMPosition,
  faAssets: FAAsset[],
  currentPrice: bigint,
  xDecimals: number,
  yDecimals: number,
): { totalValue: bigint, breakdown: Record<string, bigint> } {
  const priceLower = tickToPrice(position.tickLower, xDecimals, yDecimals)
  const priceUpper = tickToPrice(position.tickUpper, xDecimals, yDecimals)

  // Calculate CLMM position value (treated as single non-FA asset)
  const xFromLP = calculateXFromLiquidity(position.liquidity, price, priceLower, priceUpper)
  const yFromLP = calculateYFromLiquidity(position.liquidity, price, priceLower, priceUpper)

  // Convert LP position to Y terms and include pending fees/rewards
  const xValueInY = (xFromLP * price) / SCALE_8
  const positionValue = xValueInY + yFromLP + position.pending_fee_and_rewards_value

  const breakdown: Record<string, bigint> = {
    [position.positionId]: positionValue,
  }

  let totalValue = positionValue

  // Add FA asset values (all scaled by 1e8)
  for (const asset of faAssets) {
    const priceRatio = (price * SCALE_8) / currentPrice
    const priceChangeRatio = (asset.correlation * (priceRatio - SCALE_8)) / SCALE_8
    const correlatedPrice = (asset.currentPrice * (SCALE_8 + priceChangeRatio)) / SCALE_8

    // Scale asset amount to 1e8
    const scaledAmount = adjustDecimalScale(asset.amount, asset.decimals, DEFAULT_DECIMALS)

    const assetValue = (scaledAmount * correlatedPrice) / SCALE_8

    breakdown[asset.assetAddress] = assetValue
    totalValue += assetValue
  }

  return { totalValue, breakdown }
}

/**
 * Calculate weighted debt requirement using LTV matrix, all values scaled by 1e8
 */
function calculateWeightedDebtRequirement(
  price: bigint,
  position: CLMMPosition,
  ltvMatrix: PoolAssetLTVMatrix,
  assetBreakdown: Record<string, bigint>,
  xDecimals: number,
  yDecimals: number,
): bigint {
  // Scale debt amounts to 1e8
  const debtXScaled = adjustDecimalScale(position.debtX, xDecimals, DEFAULT_DECIMALS)
  const yDebtValue = adjustDecimalScale(position.debtY, yDecimals, DEFAULT_DECIMALS)

  // Convert debt amounts to values in Y terms (scaled by 1e8)
  const xDebtValue = (debtXScaled * price) / SCALE_8

  // Calculate total asset value for weighted average LTV (already scaled by 1e8)
  const totalAssetValue = Object.values(assetBreakdown).reduce((sum, value) => sum + value, 0n)

  if (totalAssetValue === 0n) {
    return 0n
  }

  // Calculate WDR using correct formula from Move code: Σ_debt_type Σ_asset_type (debt_value × asset_weight / LTV)
  // Where asset_weight = asset_value / total_asset_value
  let minAssetValue = 0n

  for (const [assetType, assetValue] of Object.entries(assetBreakdown)) {
    // For X debt: X_debt_value × asset_weight / LTV[X][asset]
    const xLtv = ltvMatrix.X[assetType]
    if (xLtv && xLtv > 0n) {
      minAssetValue += (xDebtValue * assetValue * SCALE_8) / (totalAssetValue * xLtv)
    }

    // For Y debt: Y_debt_value × asset_weight / LTV[Y][asset]
    const yLtv = ltvMatrix.Y[assetType]
    if (yLtv && yLtv > 0n) {
      minAssetValue += (yDebtValue * assetValue * SCALE_8) / (totalAssetValue * yLtv)
    }
  }

  return minAssetValue
}

/**
 * Calculate margin ratio: Total Assets / Weighted Debt Requirement
 */
function calculateMarginRatio(totalAssets: bigint, weightedDebtRequirement: bigint): bigint {
  if (weightedDebtRequirement === 0n) {
    return SCALE_8 * 1000000n // Very high margin ratio
  }
  return (totalAssets * SCALE_8) / weightedDebtRequirement
}

/**
 * Newton-Raphson solver for liquidation price
 */
function newtonRaphsonSolve(
  params: LTVLiquidationParams,
  initialGuess: bigint,
  tolerance: bigint = SCALE_8 / 1000000n, // 1e-6
  maxIterations: number = 100,
): bigint {
  let price = initialGuess

  for (let i = 0; i < maxIterations; i++) {
    // Calculate F(price) = TA(price) - WDR(price)
    const { totalValue: totalAssets, breakdown } = calculateTotalAssets(
      price,
      params.position,
      params.faAssets,
      params.currentPrice,
      params.xDecimals,
      params.yDecimals,
    )

    const wdr = calculateWeightedDebtRequirement(
      price,
      params.position,
      params.ltvMatrix,
      breakdown,
      params.xDecimals,
      params.yDecimals,
    )

    const f = totalAssets - wdr

    if (absBig(f) <= tolerance) {
      //   console.log('Newton-Raphson converged', price, i)
      return price // Converged
    }

    if (price <= SCALE_8 / PRICE_DELTA) {
      return 0n
    }

    // Calculate numerical derivative (simplified)
    const delta = price * PRICE_DELTA / SCALE_8 // 0.01% change
    const pricePlus = price + delta
    const { totalValue: totalAssetsPlus } = calculateTotalAssets(
      pricePlus,
      params.position,
      params.faAssets,
      params.currentPrice,
      params.xDecimals,
      params.yDecimals,
    )
    const wdrPlus = calculateWeightedDebtRequirement(
      pricePlus,
      params.position,
      params.ltvMatrix,
      breakdown,
      params.xDecimals,
      params.yDecimals,
    )
    const fPlus = totalAssetsPlus - wdrPlus

    const fprime = (fPlus - f) * SCALE_8 / delta

    if (absBig(fprime) <= SCALE_8 / 1000000000000n) {
      throw new Error('Derivative too small, cannot continue Newton-Raphson')
    }

    const priceNext = price - (f * SCALE_8) / fprime

    // Ensure price stays within bounds
    if (priceNext <= MIN_PRICE) {
      price = (price + MIN_PRICE) / 2n
      continue
    }
    if (priceNext >= MAX_PRICE) {
      price = (price + MAX_PRICE) / 2n
      continue
    }

    // Check for convergence
    const change = absBig(priceNext - price)
    if (change <= (tolerance * price) / SCALE_8) {
      //   console.log('Newton-Raphson converged', priceNext, i)
      return priceNext
    }

    price = priceNext
  }

  throw new Error(`Newton-Raphson failed to converge after ${maxIterations} iterations`)
}

// =============================================================================
// MAIN LIQUIDATION CALCULATION FUNCTION
// =============================================================================

/**
 * Calculate LTV-based liquidation prices for CLMM position
 */
export async function calculateLiquidationPrices(
  params: LTVLiquidationParams,
): Promise<LiquidationResult> {
  const currentPrice = params.currentPrice

  // Calculate current position metrics
  const { totalValue: currentTotalAssets, breakdown: currentBreakdown } = calculateTotalAssets(
    currentPrice,
    params.position,
    params.faAssets,
    currentPrice,
    params.xDecimals,
    params.yDecimals,
  )

  const currentWDR = calculateWeightedDebtRequirement(
    currentPrice,
    params.position,
    params.ltvMatrix,
    currentBreakdown,
    params.xDecimals,
    params.yDecimals,
  )

  const currentMarginRatio = calculateMarginRatio(currentTotalAssets, currentWDR)

  // Find liquidation prices
  let liquidationLow = MIN_PRICE
  let liquidationHigh = MAX_PRICE

  // Search for lower liquidation price (start below current)
  const searchLow = (currentPrice * 5n) / 10n // 50% of current
  liquidationLow = newtonRaphsonSolve(params, searchLow)

  // Verify it's actually lower
  if (liquidationLow >= currentPrice) {
    liquidationLow = MIN_PRICE
  }

  // Search for upper liquidation price (start above current)
  const searchHigh = (currentPrice * 15n) / 10n // 150% of current
  liquidationHigh = newtonRaphsonSolve(params, searchHigh)

  // Verify it's actually higher
  if (liquidationHigh <= currentPrice) {
    liquidationHigh = MAX_PRICE
  }

  // Calculate risk metrics
  const marginBuffer = currentMarginRatio - SCALE_8
  const isAtRisk = marginBuffer <= (SCALE_8 / 10n) // 10% buffer threshold

  const liquidationDistanceLow = liquidationLow > MIN_PRICE
    ? ((currentPrice - liquidationLow) * SCALE_8) / currentPrice
    : SCALE_8 // 100% distance if no lower liquidation

  const liquidationDistanceHigh = liquidationHigh < MAX_PRICE
    ? ((liquidationHigh - currentPrice) * SCALE_8) / currentPrice
    : SCALE_8 // 100% distance if no upper liquidation

  return {
    liquidationPrices: [liquidationLow, liquidationHigh],
    currentMarginRatio,
    isAtRisk,
    marginBuffer,
    liquidationDistance: {
      low: liquidationDistanceLow,
      high: liquidationDistanceHigh,
    },
    breakdown: {
      totalAssets: currentTotalAssets,
      totalDebts: (() => {
        // Scale debt amounts to 1e8 for consistency
        const debtXScaled = adjustDecimalScale(params.position.debtX, params.xDecimals, DEFAULT_DECIMALS)
        const debtYScaled = adjustDecimalScale(params.position.debtY, params.yDecimals, DEFAULT_DECIMALS)

        // Convert to Y terms and sum (scaled by 1e8)
        const xDebtInY = (debtXScaled * currentPrice) / SCALE_8
        const xDebtScaled = adjustDecimalScale(xDebtInY, params.xDecimals, params.yDecimals)

        return xDebtScaled + debtYScaled
      })(),
      weightedDebtRequirement: currentWDR,
      assetBreakdown: currentBreakdown,
    },
  }
}

// =============================================================================
// UTILITY FUNCTIONS FOR FORMATTING AND DISPLAY
// =============================================================================

/**
 * Format liquidation result for display
 */
export function formatLiquidationResult(result: LiquidationResult, decimals: number = 6): {
  liquidationPrices: [string, string]
  currentMarginRatio: string
  marginBuffer: string
  liquidationDistance: { low: string, high: string }
  riskLevel: 'SAFE' | 'WARNING' | 'DANGER'
} {
  // Get prices directly (no conversion needed)
  const [lowPrice, highPrice] = result.liquidationPrices

  const riskLevel = result.isAtRisk
    ? (result.marginBuffer <= 0n ? 'DANGER' : 'WARNING')
    : 'SAFE'

  return {
    liquidationPrices: [
      formatAmount(lowPrice, DEFAULT_DECIMALS, decimals).display,
      formatAmount(highPrice, DEFAULT_DECIMALS, decimals).display,
    ],
    currentMarginRatio: formatAmount(result.currentMarginRatio, DEFAULT_DECIMALS, 4).display,
    marginBuffer: formatAmount(result.marginBuffer, DEFAULT_DECIMALS, 4).display,
    liquidationDistance: {
      low: formatAmount(result.liquidationDistance.low, DEFAULT_DECIMALS, 4).display,
      high: formatAmount(result.liquidationDistance.high, DEFAULT_DECIMALS, 4).display,
    },
    riskLevel,
  }
}

/**
 * Create LTV matrix with scaled values
 * @param matrix Object with LTV ratios as numbers (e.g., 0.75 for 75%)
 * @returns LTV matrix with BigInt values scaled by 1e8
 */
export function createLTVMatrix(matrix: {
  X: Record<string, number>
  Y: Record<string, number>
}): PoolAssetLTVMatrix {
  const scaledMatrix: PoolAssetLTVMatrix = { X: {}, Y: {} }

  for (const [asset, ltv] of Object.entries(matrix.X)) {
    scaledMatrix.X[asset] = BigInt(Math.floor(ltv * Number(SCALE_8)))
  }

  for (const [asset, ltv] of Object.entries(matrix.Y)) {
    scaledMatrix.Y[asset] = BigInt(Math.floor(ltv * Number(SCALE_8)))
  }

  return scaledMatrix
}

/**
 * Create FA asset with scaled values
 */
export function createFAAsset(
  assetAddress: Address,
  amount: AnyNumber,
  currentPrice: number,
  correlation: number,
  decimals: number,
): FAAsset {
  return {
    assetAddress,
    amount: BigInt(amount),
    currentPrice: BigInt(Math.floor(currentPrice * Number(SCALE_8))),
    correlation: BigInt(Math.floor(correlation * Number(SCALE_8))),
    decimals,
  }
}
