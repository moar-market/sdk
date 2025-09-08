import type { Address } from '../types'
import {
  bigAbs,
  bigMax,
  bigMulDivRound,
  bigRescale,
  bigSqrtScaled,
  formatAmount,
  ROUND_MODES,
} from '@itsmnthn/big-utils'
import { tickToPrice as tickToPriceUtil } from '../utils/tick-price'

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
const SCALE_4 = 10000n // 1e4
const MAX_PRICE = 100000000000000000n // Max price (1e17, very high)
const MIN_PRICE = 1n // Min price (very low)
const MAX_U64 = 18446744073709551615n // Max u64 value
const PRICE_DELTA = 10000n // 0.01% in 1e8 scale

/**
 * Adjust amount from source decimals to target decimals
 */
function adjustDecimalScale(amount: bigint, fromDecimals: number, toDecimals: number): bigint {
  return bigRescale(amount, fromDecimals, toDecimals, ROUND_MODES.TRUNC)
}

/**
 * sqrt(value) with value at 1e8 scale → returns sqrt at 1e8 scale using big-utils.
 */
function bigIntSqrt(value: bigint): bigint {
  if (value < 0n)
    throw new Error('Cannot calculate sqrt of negative number')
  return bigSqrtScaled(value, 8, ROUND_MODES.HALF_EVEN)
}

// Use shared high-precision implementation
function tickToPrice(tick: number, xDecimals: number, yDecimals: number): bigint {
  return tickToPriceUtil({ tick, xDecimals, yDecimals, scale: 8 })
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
    return bigMulDivRound(liquidity * (sqrtPriceUpper - sqrtPriceLower), SCALE_8, denominator, ROUND_MODES.TRUNC)
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

    return bigMulDivRound(liquidity * (sqrtPriceUpper - sqrtPrice), SCALE_8, denominator, ROUND_MODES.TRUNC)
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
    return bigMulDivRound(liquidity, (sqrtPriceUpper - sqrtPriceLower), SCALE_8, ROUND_MODES.TRUNC)
  }
  else {
    // Partial Y: Y(p) = L × (√p - √pa)
    const sqrtPrice = bigIntSqrt(price)
    const sqrtPriceLower = bigIntSqrt(priceLower)
    return bigMulDivRound(liquidity, (sqrtPrice - sqrtPriceLower), SCALE_8, ROUND_MODES.TRUNC)
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
  const xValueInY = bigMulDivRound(xFromLP, price, SCALE_8, ROUND_MODES.TRUNC)
  const positionValue = xValueInY + yFromLP + position.pending_fee_and_rewards_value

  const breakdown: Record<string, bigint> = {
    [position.positionId]: positionValue,
  }

  let totalValue = positionValue

  // Add FA asset values (all scaled by 1e8)
  for (const asset of faAssets) {
    const priceRatio = bigMulDivRound(price, SCALE_8, currentPrice, ROUND_MODES.TRUNC)
    const priceChangeRatio = bigMulDivRound(asset.correlation, (priceRatio - SCALE_8), SCALE_8, ROUND_MODES.TRUNC)
    const correlatedPrice = bigMax(MIN_PRICE, bigMulDivRound(asset.currentPrice, (SCALE_8 + priceChangeRatio), SCALE_8, ROUND_MODES.TRUNC))

    // Scale asset amount to 1e8
    const scaledAmount = adjustDecimalScale(asset.amount, asset.decimals, DEFAULT_DECIMALS)

    const assetValue = bigMulDivRound(scaledAmount, correlatedPrice, SCALE_8, ROUND_MODES.TRUNC)

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
  for (const key of Object.keys(assetBreakdown)) {
    const xL = ltvMatrix.X[key]
    const yL = ltvMatrix.Y[key]
    if (xL === undefined || yL === undefined) {
      throw new Error(`Missing LTV entry for asset in breakdown: ${key}`)
    }
    if (xL <= 0n || yL <= 0n) {
      throw new Error(`Non-positive LTV for asset in breakdown: ${key}`)
    }
  }

  // Scale debt amounts to 1e8
  const debtXScaled = adjustDecimalScale(position.debtX, xDecimals, DEFAULT_DECIMALS)
  const yDebtValue = adjustDecimalScale(position.debtY, yDecimals, DEFAULT_DECIMALS)

  // Convert debt amounts to values in Y terms (scaled by 1e8)
  const xDebtValue = bigMulDivRound(debtXScaled, price, SCALE_8, ROUND_MODES.TRUNC)

  // Calculate total asset value for weighted average LTV (already scaled by 1e8)
  const totalAssetValue = Object.values(assetBreakdown).reduce((sum, value) => sum + value, 0n)

  if (totalAssetValue === 0n) {
    return 0n
  }

  // Calculate WDR using correct formula from Move code: Σ_debt_type Σ_asset_type (debt_value × asset_weight / LTV)
  // Where asset_weight = asset_value / total_asset_value
  let wdr = 0n // wdr = weighted debt requirement

  for (const [assetType, assetValue] of Object.entries(assetBreakdown)) {
    // For X debt: X_debt_value × asset_weight / LTV[X][asset]
    const xLtv = ltvMatrix.X[assetType]
    wdr += bigMulDivRound(xDebtValue * assetValue, SCALE_8, (totalAssetValue * xLtv), ROUND_MODES.TRUNC)

    // For Y debt: Y_debt_value × asset_weight / LTV[Y][asset]
    const yLtv = ltvMatrix.Y[assetType]
    wdr += bigMulDivRound(yDebtValue * assetValue, SCALE_8, (totalAssetValue * yLtv), ROUND_MODES.TRUNC)
  }

  return wdr
}

/**
 * Calculate margin ratio: Total Assets / Weighted Debt Requirement
 */
function calculateMarginRatio(totalAssets: bigint, weightedDebtRequirement: bigint): bigint {
  if (weightedDebtRequirement === 0n) {
    return SCALE_8 * 1000000n // Very high margin ratio
  }
  return bigMulDivRound(totalAssets, SCALE_8, weightedDebtRequirement, ROUND_MODES.TRUNC)
}

/**
 * Check if account is healthy at a given price and return margin factor
 */
function isAccountHealthy(price: bigint, params: LTVLiquidationParams): { isHealthy: boolean, marginFactor: bigint, totalAssets: bigint, breakdown: Record<string, bigint>, wdr: bigint } {
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

  const marginFactor = calculateMarginRatio(totalAssets, wdr)
  const isHealthy = totalAssets >= wdr // Account is healthy if total assets >= weighted debt requirement

  return { isHealthy, marginFactor, totalAssets, breakdown, wdr }
}

/**
 * Custom error for when derivative is too small in Newton-Raphson
 */
class DerivativeTooSmallError extends Error {
  constructor(
    public readonly price: bigint,
    public readonly searchingLower: boolean,
    message?: string,
  ) {
    super(message || 'Derivative too small, cannot continue Newton-Raphson')
    this.name = 'DerivativeTooSmallError'
  }
}

/**
 * Handle the edge case when derivative is too small in Newton-Raphson
 */
function handleDerivativeTooSmallError(
  error: DerivativeTooSmallError,
  params: LTVLiquidationParams,
): bigint {
  // Get position price boundaries from ticks
  let priceLower = tickToPrice(params.position.tickLower, params.xDecimals, params.yDecimals)
  let priceUpper = tickToPrice(params.position.tickUpper, params.xDecimals, params.yDecimals)
  if (priceLower < MIN_PRICE)
    priceLower = MIN_PRICE
  if (priceUpper < MIN_PRICE)
    priceUpper = MIN_PRICE

  if (error.price >= priceLower && error.price <= priceUpper) {
    const epsilon = 1n // 1e-8
    const adjustedGuess = error.searchingLower
      ? (priceLower + epsilon)
      : (priceUpper > epsilon ? priceUpper - epsilon : priceUpper)

    try {
      return newtonRaphsonSolve(params, adjustedGuess)
    }
    catch {
      return error.searchingLower ? priceLower : priceUpper // safe worst-case
    }
  }

  // Determine boundary price based on search direction
  const boundaryPrice = error.searchingLower ? priceLower : priceUpper

  // Check account health at boundary
  const { isHealthy: healthyAtBoundary } = isAccountHealthy(boundaryPrice, params)

  if (!healthyAtBoundary) {
    // Account is unhealthy at boundary, try with adjustment
    // Adjust guess to be slightly inside the position range
    // For lower search: slightly higher than lower boundary
    // For upper search: slightly lower than upper boundary
    const adjustedGuess = error.searchingLower
      ? priceLower + (priceLower / 100n) // +1% from lower boundary
      : priceUpper - (priceUpper / 100n) // -1% from upper boundary

    try {
      // Try Newton-Raphson again with adjusted guess
      return newtonRaphsonSolve(params, adjustedGuess)
    }
    catch (retryError) {
      if (retryError instanceof DerivativeTooSmallError) {
        throw new TypeError('Failed to find liquidation price even with boundary adjustment')
      }
      throw retryError
    }
  }
  else {
    // Account is healthy at boundary, return MIN/MAX price
    return error.searchingLower ? MIN_PRICE : MAX_PRICE
  }
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

    if (bigAbs(f) <= tolerance) {
      //   console.log('Newton-Raphson converged', price, i)
      return price // Converged
    }

    if (price <= SCALE_8 / PRICE_DELTA) {
      return MIN_PRICE
    }

    // Calculate numerical derivative (simplified)
    const delta = bigMax(MIN_PRICE, bigMulDivRound(price, PRICE_DELTA, SCALE_8, ROUND_MODES.TRUNC))
    const pMinus = price > delta ? price - delta : MIN_PRICE
    const { totalValue: totalAssetsMinus, breakdown: brkMinus } = calculateTotalAssets(
      pMinus,
      params.position,
      params.faAssets,
      params.currentPrice,
      params.xDecimals,
      params.yDecimals,
    )
    const wdrMinus = calculateWeightedDebtRequirement(
      pMinus,
      params.position,
      params.ltvMatrix,
      brkMinus,
      params.xDecimals,
      params.yDecimals,
    )
    const fMinus = totalAssetsMinus - wdrMinus

    const pPlus = price + delta <= MAX_PRICE ? price + delta : MAX_PRICE
    const { totalValue: totalAssetsPlus, breakdown: brkPlus } = calculateTotalAssets(
      pPlus,
      params.position,
      params.faAssets,
      params.currentPrice,
      params.xDecimals,
      params.yDecimals,
    )
    const wdrPlus = calculateWeightedDebtRequirement(
      pPlus,
      params.position,
      params.ltvMatrix,
      brkPlus,
      params.xDecimals,
      params.yDecimals,
    )
    const fPlus = totalAssetsPlus - wdrPlus
    // Calculate numerical derivative F'(p) = (F(p + delta) - F(p - delta)) / (2 * delta).
    // This approach is used instead of the analytical derivative for implementation
    // simplicity and robustness, as the analytical form is highly complex.
    // const fprime = bigMulDivRound((fPlus - f), SCALE_8, delta, ROUND_MODES.TRUNC)
    const fprime = bigMulDivRound((fPlus - fMinus), SCALE_8, (2n * delta), ROUND_MODES.TRUNC)

    if (bigAbs(fprime) <= SCALE_4) {
      // 1) Secant using symmetric samples
      const secantDen = (fPlus - fMinus)
      if (secantDen !== 0n) {
        const secantStep = bigMulDivRound(2n * delta, f, secantDen, ROUND_MODES.TRUNC)
        const pTry = price - secantStep
        if (pTry > MIN_PRICE && pTry < MAX_PRICE) {
          price = pTry
          continue
        }
      }
      // 2) Damped step toward reducing |F|
      const step = bigMax(1n, delta >> 2n) // quarter of delta, floor 1
      price = f > 0n ? (price + step) : (price - step)
      if (price <= MIN_PRICE)
        price = MIN_PRICE
      if (price >= MAX_PRICE)
        price = MAX_PRICE
      continue
    }

    const step = bigMulDivRound(f, SCALE_8, fprime, ROUND_MODES.TRUNC)
    const priceNext = price - step

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
    const change = bigAbs(priceNext - price)
    if (change <= bigMulDivRound(tolerance, price, SCALE_8, ROUND_MODES.TRUNC)) {
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
export function calculateLiquidationPrices(params: LTVLiquidationParams): LiquidationResult {
  const currentPrice = params.currentPrice

  // Check if account is already in liquidation zone
  const {
    isHealthy: currentlyHealthy,
    marginFactor: currentMarginRatio,
    totalAssets: currentTotalAssets,
    breakdown: currentBreakdown,
    wdr: currentWDR,
  } = isAccountHealthy(currentPrice, params)

  if (!currentlyHealthy) {
    return {
      liquidationPrices: [currentPrice, currentPrice],
      currentMarginRatio, // Use actual calculated ratio
      isAtRisk: true,
      marginBuffer: currentMarginRatio - SCALE_8, // Can be negative
      liquidationDistance: { low: 0n, high: 0n },
      breakdown: {
        totalAssets: currentTotalAssets,
        totalDebts: (() => {
          // Scale debt amounts to 1e8 for consistency
          const debtXScaled = adjustDecimalScale(params.position.debtX, params.xDecimals, DEFAULT_DECIMALS)
          const debtYScaled = adjustDecimalScale(params.position.debtY, params.yDecimals, DEFAULT_DECIMALS)

          // Convert to Y terms and sum (scaled by 1e8)
          const xDebtInY = bigMulDivRound(debtXScaled, currentPrice, SCALE_8, ROUND_MODES.TRUNC)

          return xDebtInY + debtYScaled
        })(),
        weightedDebtRequirement: currentWDR,
        assetBreakdown: currentBreakdown,
      },
    }
  }

  // (Position metrics already calculated above)

  // Find liquidation prices
  let liquidationLow = MIN_PRICE
  let liquidationHigh = MAX_PRICE

  // Search for lower liquidation price (start below current)
  const searchLow = bigMulDivRound(currentPrice, 7n, 10n, ROUND_MODES.TRUNC) // 70% of current
  try {
    liquidationLow = newtonRaphsonSolve(params, searchLow)
  }
  catch (error) {
    if (error instanceof DerivativeTooSmallError) {
      liquidationLow = handleDerivativeTooSmallError(error, params)
    }
    else {
      throw error
    }
  }

  // Verify it's actually lower
  if (liquidationLow >= currentPrice) {
    liquidationLow = MIN_PRICE
  }

  // Search for upper liquidation price (start above current)
  const searchHigh = bigMulDivRound(currentPrice, 13n, 10n, ROUND_MODES.TRUNC) // 130% of current
  try {
    liquidationHigh = newtonRaphsonSolve(params, searchHigh)
  }
  catch (error) {
    if (error instanceof DerivativeTooSmallError) {
      liquidationHigh = handleDerivativeTooSmallError(error, params)
    }
    else {
      throw error
    }
  }

  // Verify it's actually higher
  if (liquidationHigh <= currentPrice) {
    liquidationHigh = MAX_PRICE
  }

  // Calculate risk metrics
  const marginBuffer = currentMarginRatio - SCALE_8
  const isAtRisk = marginBuffer <= (SCALE_8 / 10n) // 10% buffer threshold

  const liquidationDistanceLow = liquidationLow > MIN_PRICE
    ? bigMulDivRound((currentPrice - liquidationLow), SCALE_8, currentPrice, ROUND_MODES.TRUNC)
    : SCALE_8 // 100% distance if no lower liquidation

  const liquidationDistanceHigh = liquidationHigh < MAX_PRICE
    ? bigMulDivRound((liquidationHigh - currentPrice), SCALE_8, currentPrice, ROUND_MODES.TRUNC)
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
        const xDebtInY = bigMulDivRound(debtXScaled, currentPrice, SCALE_8, ROUND_MODES.TRUNC)
        return xDebtInY + debtYScaled
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
 * @param matrix.X Object with LTV ratios for X token
 * @param matrix.Y Object with LTV ratios for Y token
 * @returns LTV matrix with BigInt values scaled by 1e8
 */
export function createLTVMatrix(matrix: {
  X: Record<string, number | bigint>
  Y: Record<string, number | bigint>
}): PoolAssetLTVMatrix {
  const scaledMatrix: PoolAssetLTVMatrix = { X: {}, Y: {} }

  for (const [asset, ltv] of Object.entries(matrix.X)) {
    scaledMatrix.X[asset] = typeof ltv === 'bigint' ? ltv : BigInt(Math.floor(ltv * Number(SCALE_8)))
  }

  for (const [asset, ltv] of Object.entries(matrix.Y)) {
    scaledMatrix.Y[asset] = typeof ltv === 'bigint' ? ltv : BigInt(Math.floor(ltv * Number(SCALE_8)))
  }

  return scaledMatrix
}

/**
 * Create FA asset with scaled values
 */
export function createFAAsset(
  assetAddress: Address,
  amount: bigint, // scaled by asset decimals
  currentPrice: bigint, // scaled by 1e8
  correlation: bigint, // scaled by 1e8
  decimals: number,
): FAAsset {
  return {
    assetAddress,
    amount,
    currentPrice,
    correlation,
    decimals,
  }
}
