import {
  bigClamp,
  bigLogBaseScaled,
  bigMulDivRound,
  bigPowIntScaled,
  bigPrecomputeBase,
  bigRoundIntByStep,
  bigScale,
  bigUnscale,
  ROUND_MODES,
} from '@itsmnthn/big-utils'

export enum FeeTierIndex {
  PER_0_01_SPACING_1 = 0,
  PER_0_05_SPACING_5 = 1,
  PER_0_3_SPACING_60 = 2,
  PER_1_SPACING_200 = 3,
  PER_0_1_SPACING_20 = 4,
  PER_0_25_SPACING_50 = 5,
}
export const FeeTierStep = [1, 10, 60, 200, 20, 50] as const
export const LowestTickByStep = [-443636, -443630, -443580, -443600, -443620, -443600] as const
export const HighestTickByStep = [443636, 443630, 443580, 443600, 443620, 443600] as const

// TODO: refactor to be used for tapp also - only works for hyperion for now

// Pre-compute the logarithm of the base (1.0001) for efficiency in priceToTick calculations.
const LOG_BASE = bigPrecomputeBase('1.0001', 18) // Using 18 decimals for high precision internals

/**
 * Converts a price to its corresponding tick index using high-precision math.
 * Applies the fee tier's spacing and clamps the result to the valid range.
 *
 * @param {object} params - The parameters for the conversion.
 * @param {string | number | bigint} params.price - The input price.
 * @param {FeeTierIndex} params.feeTierIndex - The fee tier to determine tick spacing.
 * @param {number} params.xDecimals - The number of decimals for the X token.
 * @param {number} params.yDecimals - The number of decimals for the Y token.
 * @param {number} [params.scale=18] - The internal precision for calculations.
 * @returns {bigint | null} The calculated and clamped tick index, or null for invalid prices.
 */
export function priceToTick(params: {
  price: string | number | bigint
  feeTierIndex: FeeTierIndex
  xDecimals: number
  yDecimals: number
  scale?: number
}): bigint | null {
  const scale = params.scale ?? 18
  const priceScaled = bigScale(params.price, scale)

  if (priceScaled <= 0n) {
    return null
  }

  // Adjust price based on the decimal ratio between the two assets.
  // price_adjusted = price * 10^(yDecimals - xDecimals)
  const decimalDiff = params.yDecimals - params.xDecimals
  const decimalsRatio = 10n ** BigInt(Math.abs(decimalDiff))
  const priceAdjusted
    = decimalDiff >= 0
      ? bigMulDivRound(priceScaled, decimalsRatio, 1n, ROUND_MODES.TRUNC)
      : bigMulDivRound(priceScaled, 1n, decimalsRatio, ROUND_MODES.TRUNC)

  // Calculate the raw tick using the pre-computed log base.
  // tick = log_1.0001(price_adjusted)
  const rawTick = bigLogBaseScaled(
    priceAdjusted,
    LOG_BASE.baseScaled,
    scale,
    96,
    LOG_BASE.log2BaseScaled,
  )

  // Unscale the tick to get an integer value.
  const tickInt = bigUnscale(rawTick, scale, 0)
  const step = BigInt(FeeTierStep[params.feeTierIndex])

  // Round the tick to the nearest valid step for the fee tier.
  const spacedTick = bigRoundIntByStep(BigInt(tickInt), step, ROUND_MODES.HALF_AWAY_ZERO)

  // Clamp the tick to the min/max allowable values for the fee tier.
  return bigClamp(
    spacedTick,
    BigInt(LowestTickByStep[params.feeTierIndex]),
    BigInt(HighestTickByStep[params.feeTierIndex]),
  )
}

/**
 * Converts a tick index to its corresponding price using high-precision math.
 *
 * @param {object} params - The parameters for the conversion.
 * @param {bigint | number | string} params.tick - The input tick index.
 * @param {number} params.xDecimals - The number of decimals for the X token.
 * @param {number} params.yDecimals - The number of decimals for the Y token.
 * @param {number} [params.scale=18] - The desired precision (decimal places) for the output price.
 * @returns {bigint} The calculated price, scaled by `scale`.
 */
export function tickToPrice(params: {
  tick: bigint | number | string
  xDecimals: number
  yDecimals: number
  scale?: number
}): bigint {
  const scale = params.scale ?? 18
  const tick = BigInt(params.tick)

  // Calculate the raw price: price_raw = 1.0001^tick
  const base = bigScale('1.0001', scale)
  const priceRaw = bigPowIntScaled(base, tick, scale, ROUND_MODES.TRUNC)

  // Adjust the price for the decimal ratio between the two assets.
  // price = price_raw * 10^(xDecimals - yDecimals)
  const decimalDiff = params.xDecimals - params.yDecimals
  const decimalsRatio = 10n ** BigInt(Math.abs(decimalDiff))

  return decimalDiff >= 0
    ? bigMulDivRound(priceRaw, decimalsRatio, 1n, ROUND_MODES.TRUNC)
    : bigMulDivRound(priceRaw, 1n, decimalsRatio, ROUND_MODES.TRUNC)
}
