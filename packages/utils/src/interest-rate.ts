import { unScaleToBase } from '@itsmnthn/big-utils'

/**
 * Calculates accrued interest for a debt position using the lending pool's interest rate.
 *
 * @param {bigint} debt - The current debt amount in base units
 * @param {bigint} interestRate - The current interest rate in base units (scaled by decimals)
 * @param {number} periodInSeconds - The time period in seconds since last update
 * @param {number} debtDecimals - The number of decimal places used for the debt
 * @param {number} interestDecimals - The number of decimal places used for the interest rate
 * @returns {bigint} - The calculated interest in base units
 */
export function calcInterestForTime(
  debt: bigint,
  interestRate: bigint,
  periodInSeconds: number,
  debtDecimals: number = 8,
  interestDecimals: number = 8,
): bigint {
  // If no debt or invalid period, no interest
  if (debt <= BigInt(0) || periodInSeconds <= 0)
    return BigInt(0)

  const SECONDS_IN_YEAR = BigInt(365 * 24 * 60 * 60)

  // Calculate interest using the formula:
  // interest = (debt * rate * time) / (SECONDS_IN_YEAR)
  const interest = (debt * interestRate * BigInt(periodInSeconds)) / SECONDS_IN_YEAR

  return unScaleToBase(interest, interestDecimals + debtDecimals, debtDecimals)
}

/**
 * A “knot” in a piecewise linear curve.
 * util: [0…100] (percent utilization) — 0 is the minimum utilization, 100 is the maximum utilization
 * rate: [0…∞) (APR in %, e.g. 10 = 10%) — 0 is the minimum rate, ∞ is the maximum rate
 */
export interface Kink {
  util: number
  rate: number
}

/**
 * Given U ∈ [0…100] and a sorted array of kinks,
 * returns the interpolated APR (in %).
 */
export function calcPiecewiseRate(utilization: number, kinks: Kink[]): number {
  if (kinks.length === 0) {
    throw new Error('Need at least one kink')
  }

  // Clamp U into the defined util range
  const minU = kinks[0].util
  const maxU = kinks[kinks.length - 1].util
  const util = Math.max(minU, Math.min(maxU, utilization))

  // Below first knot or only one point
  if (util <= minU || kinks.length === 1) {
    return kinks[0].rate
  }

  // Above last knot
  if (util >= maxU) {
    return kinks[kinks.length - 1].rate
  }

  // Find segment and interpolate
  for (let i = 0; i < kinks.length - 1; i++) {
    const { util: u0, rate: r0 } = kinks[i]
    const { util: u1, rate: r1 } = kinks[i + 1]

    if (util >= u0 && util <= u1) {
      const t = (util - u0) / (u1 - u0) // fraction through this segment
      return r0 + t * (r1 - r0) // linear interpolation in %
    }
  }

  // Fallback (shouldn’t happen)
  return kinks[kinks.length - 1].rate
}

export function calcWeightedInterestRate(
  debts: {
    debtUSD: number
    interestRate: number
  }[],
): number {
  const totalDebtUSD = debts.reduce((sum, item) => sum + item.debtUSD, 0)

  if (totalDebtUSD === 0) {
    return 0
  }

  return Number(debts
    .filter(debt => debt.debtUSD !== 0)
    .reduce((acc, debt) => {
      const weight = debt.debtUSD / totalDebtUSD
      return acc + (debt.interestRate * weight)
    }, 0).toFixed(2),
  )
}
