import type { Kink } from '../types'
import { bigDivRound, bigDivScaled, bigMulDivRound, ROUND_MODES, scale, unScale } from '@itsmnthn/big-utils'
import { DECIMALS, ZERO } from './constants'

/**
 * Converts a loan-to-value (LTV) ratio to leverage value
 * @param ltv - The loan-to-value ratio (scaled by 1e8)
 * @returns The calculated leverage value rounded to 1 decimal place
 */
export function ltvToLeverage(ltv: number) {
  ltv = ltv / 100000000 // 1e8
  return Number((ltv / (1 - ltv)).toFixed(1))
}

/**
 * Calculates the leverage ratio based on account value and debt
 * @param accountValue - The total value of the account in base units in ORACLE(6) decimals
 * @param debt - The debt value in USD (base units) in ORACLE(6) decimals
 * @returns The calculated leverage ratio, or 1 if no debt, or Infinity if debt is zero and account value is positive, or NaN if debt and account value are zero
 */
export function calcLeverage(
  accountValue: bigint,
  debt: bigint,
  decimals: number = DECIMALS.ORACLE,
): number {
  // Equity is the difference between account value and debt.
  const equity: bigint = accountValue - debt

  // If equity is zero, leverage is infinite.
  // We handle the 0/0 case as NaN, and positive/0 as Infinity.
  if (equity === 0n) {
    return accountValue === 0n ? Number.NaN : Infinity
  }

  // If there is no debt, leverage is always 1x.
  if (debt === 0n) {
    return 1
  }

  // Use bigDivScaled to divide the two scaled numbers while maintaining precision.
  const leverageScaled: bigint = bigDivScaled(
    accountValue,
    equity,
    decimals,
    ROUND_MODES.HALF_AWAY_ZERO,
  )

  const leverageString = Number(unScale(leverageScaled, decimals))

  return Number(leverageString.toFixed(2))
}

/**
 * Calculates the maximum amount that can be withdrawn while maintaining a specified leverage ratio
 *
 * @param accountValue - The total collateral value (e.g. in USD)
 * @param debtValue - The total borrowed amount (e.g. in USD)
 * @param maxLeverage - The maximum allowed leverage ratio (e.g. 2 for "2x" leverage)
 * @returns The maximum withdrawable amount in base units, or 0 if no amount can be withdrawn
 * @throws {Error} If maxLeverage is less than or equal to 0
 */
export function calcMaxWithdrawable(
  accountValue: bigint,
  debtValue: bigint,
  maxLeverage: number,
  decimals: number = DECIMALS.ORACLE,
): bigint {
  // If there's no debt, the entire account value is withdrawable.
  if (debtValue <= ZERO) {
    return accountValue
  }

  // If maxLeverage is 1, you can't have any debt.
  // If you do, nothing is withdrawable.
  if (maxLeverage <= 1) {
    return ZERO
  }

  // Calculate the current leverage to see if we're already over the limit.
  const currentLeverage = calcLeverage(accountValue, debtValue, decimals)
  if (currentLeverage >= maxLeverage) {
    return ZERO // Already at or above max leverage, nothing to withdraw.
  }

  // We need to scale the numbers to perform precise bigint arithmetic.
  const scaledMaxLeverage = scale(maxLeverage, decimals)
  const scaledMaxLeverageMinusOne = scale(maxLeverage - 1, decimals)

  // Formula to find the minimum account value to maintain max leverage:
  // minAccountValue = (maxLeverage * debtValue) / (maxLeverage - 1)
  // Use bigMulDivRound for precise calculation.
  const minAccountValue = bigMulDivRound(
    debtValue,
    scaledMaxLeverage,
    scaledMaxLeverageMinusOne,
    ROUND_MODES.UP, // Round up to be safe and not exceed max leverage
  )

  // Withdrawable amount is the difference between current and minimum required value.
  const withdrawableAmount = accountValue - minAccountValue

  return withdrawableAmount > ZERO ? withdrawableAmount : ZERO
}

/**
 * Calculates accrued interest for a debt position using the lending pool's interest rate.
 *
 * @param {bigint} debt - The current debt amount in base units
 * @param {bigint} interestRate - The current interest rate in base units (scaled by decimals)
 * @param {number} periodInSeconds - The time period in seconds since last update
 * @param {number} interestDecimals - The number of decimal places used for the interest rate
 * @returns {bigint} - The calculated interest in base units
 */
export function calcInterestForTime(
  debt: bigint,
  interestRate: bigint,
  periodInSeconds: number,
  interestDecimals: number = 8,
): bigint {
  // If no debt or invalid period, no interest
  if (debt <= ZERO || periodInSeconds <= 0)
    return ZERO

  const SECONDS_IN_YEAR = BigInt(365 * 24 * 60 * 60)

  // Calculate interest using the formula:
  // interest = (debt * interestRate * period) / (SECONDS_IN_YEAR * 10^interestDecimals)
  const numerator = debt * interestRate * BigInt(periodInSeconds)
  const denominator = scale(SECONDS_IN_YEAR, interestDecimals)

  return bigDivRound(numerator, denominator, ROUND_MODES.TRUNC)
}

/**
 * Given a utilization U and a sorted array of kinks, returns the interpolated rate.
 * All calculations are performed with scaled BigInts for precision.
 *
 * @param utilization - The utilization value, scaled.
 * @param kinks - A sorted array of kinks (utilization and rate points).
 * @returns The interpolated rate, scaled by `scale`.
 */
export function calcPiecewiseRate(utilization: number, kinks: Kink[]): number {
  if (kinks.length === 0) {
    throw new Error('Need at least one kink')
  }

  // Sort by util ascending; avoid mutating caller’s array
  const ks = kinks.slice().sort((a, b) => a.util - b.util)

  // Clamp U into the defined util range
  const minU = ks[0].util
  const maxU = ks[ks.length - 1].util
  const util = Math.max(minU, Math.min(maxU, utilization))

  // Below first knot or only one point
  if (util <= minU || ks.length === 1) {
    return ks[0].rate
  }

  // Above last knot
  if (util >= maxU) {
    return ks[ks.length - 1].rate
  }

  // Find segment and interpolate
  for (let i = 0; i < ks.length - 1; i++) {
    const { util: u0, rate: r0 } = ks[i]
    const { util: u1, rate: r1 } = ks[i + 1]

    if (u1 - u0 === 0) {
      return r0 // degenerate segment → left rate
    }

    // Linear interpolation formula: r0 + t * (r1 - r0)
    // where t = (util - u0) / (u1 - u0)
    if (util >= u0 && util <= u1) {
      const t = (util - u0) / (u1 - u0)
      return r0 + t * (r1 - r0)
    }
  }

  // Fallback (shouldn’t happen)
  return ks[ks.length - 1].rate
}

export interface Debt {
  debtUSD: number
  interestRate: number
}

export function calcWeightedInterestRate(
  debts: Debt[],
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

/**
 * Calculates the ratio between two decimal precisions.
 *
 * @param {number} decimalA - The first decimal precision.
 * @param {number} decimalB - The second decimal precision.
 * @returns {number} The ratio as a power of 10.
 */
export function calcDecimalRatio(decimalA: number, decimalB: number) {
  return 10 ** (decimalA - decimalB)
}

/**
 * Calculates percentage weights for an array of numbers
 * @param {number[]} amounts - Array of numbers to calculate weights from
 * @returns {number[]} Array of percentage weights that sum to 100
 * @throws {Error} If any amount is negative
 */
export function calcWeights(amounts: number[]): number[] {
  let total = 0
  for (let i = 0; i < amounts.length; i++) {
    const amount = amounts[i] ?? 0
    if (amount < 0)
      throw new Error('amounts should not be negative')

    total += amount
  }

  const weights: number[] = []
  for (let i = 0; i < amounts.length; i++) {
    const weight = ((amounts[i] ?? 0) / total) * 100
    // Handle the 0/0 case which results in NaN
    weights.push(Number.isNaN(weight) || !Number.isFinite(weight) ? 0 : weight)
  }

  return weights
}
