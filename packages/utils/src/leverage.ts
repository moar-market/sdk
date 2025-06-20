import { calcUnits, decreaseByPercentage, formatAmount, increaseByPercentage, scale } from '@itsmnthn/big-utils'
import { DECIMALS, ZERO } from './constants'

/**
 * Converts a loan-to-value (LTV) ratio to leverage value
 * @param ltv - The loan-to-value ratio (scaled by 1e8)
 * @returns The calculated leverage value rounded to 1 decimal place
 */
export function ltvToLeverage(ltv: number) {
  ltv = ltv / 1e8
  return Number((ltv / (1 - ltv)).toFixed(1))
}

/**
 * Calculates the leverage ratio based on account value and debt
 * @param accountValue - The total value of the account in base units in ORACLE(6) decimals
 * @param debtUSD - The debt value in USD (base units) in ORACLE(6) decimals
 * @returns The calculated leverage ratio, or 0 if invalid inputs
 */
export function calcLeverage(accountValue: bigint, debtUSD: bigint) {
  if (accountValue <= debtUSD || debtUSD === ZERO)
    return 0

  return Number(
    formatAmount(
      calcUnits(debtUSD, accountValue - debtUSD, DECIMALS.ORACLE, DECIMALS.ORACLE),
      DECIMALS.ORACLE,
      2,
    ).display,
  )
}

/**
 * Decreases an amount based on a leverage factor
 * @param amount - The amount to decrease as bigint or string
 * @param decimals - Number of decimals for the amount
 * @param leverage - The leverage factor to apply
 * @returns The decreased amount
 */
export function decreaseByLeverage(amount: bigint | string, decimals: number, leverage: number) {
  return decreaseByPercentage(amount, ((1 - (1 / leverage)) * 100).toFixed(2), decimals)
}

/**
 * Increases an amount based on a leverage factor
 * @param amount - The amount to increase as bigint or string
 * @param decimals - Number of decimals for the amount
 * @param leverage - The leverage factor to apply
 * @returns The increased amount
 */
export function increaseByLeverage(amount: bigint | string, decimals: number, leverage: number) {
  return increaseByPercentage(amount, ((leverage - 1) * 100).toFixed(2), decimals)
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
export function calcMaxWithdrawable(accountValue: bigint, debtValue: bigint, maxLeverage: number): bigint {
  if (maxLeverage <= 0) {
    throw new Error('maxLeverage must be > 0')
  }

  // minimum collateral you must keep = debtValue / maxLeverage, calcUnits is safe division total/price
  const scaledMaxLev = scale(maxLeverage, DECIMALS.ORACLE)

  const minCollateral = calcUnits(debtValue, scaledMaxLev, DECIMALS.ORACLE, DECIMALS.ORACLE)
  const withdrawable = (accountValue - debtValue) - minCollateral

  // can't withdraw negative amount
  return withdrawable > ZERO ? withdrawable : ZERO
}
