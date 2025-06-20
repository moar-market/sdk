import type { FormattedAmount } from '@itsmnthn/big-utils'
import { formatAmount, scale, shortenDecimals } from '@itsmnthn/big-utils'
import { ZERO, ZERO_FORMATTED } from './constants'

/**
 * Formats a number into a compact string representation with K, M, or B suffixes
 * @param value - The number or string to format
 * @returns The formatted string with appropriate suffix (K for thousands, M for millions, B for billions)
 */
export function formatNumberCompact(value: number | string): string {
  value = Number(value)

  if (value >= 1000 && value < 1000000)
    return `${(value / 1000).toFixed(1)}K`.replace('.0', '')
  else if (value >= 1000000 && value < 1000000000)
    return `${(value / 1000000).toFixed(1)}M`.replace('.0', '')
  else if (value >= 1000000000)
    return `${(value / 1000000000).toFixed(1)}B`.replace('.0', '')
  return value.toString()
}

/**
 * Formats an amount into a compact representation with appropriate decimals
 * @param value - The amount as bigint or string to format
 * @param decimals - Number of decimals to use for formatting (default: 8)
 * @param displayDecimals - Number of decimals to display (default: 2)
 * @param minNum - Whether to use minimum number of decimals (default: true)
 * @returns FormattedAmount object containing base value, formatted string and display string
 */
export function formatAmountCompact(value: bigint | string, decimals = 8, displayDecimals = 2, minNum = true): FormattedAmount {
  value = BigInt(value)
  if (value === ZERO)
    return ZERO_FORMATTED

  const amount = formatAmount(value, decimals, displayDecimals)
  if (amount.base > scale(9999, decimals)) {
    return {
      base: amount.base,
      formatted: amount.formatted,
      display: formatNumberCompact(amount.formatted),
    }
  }

  if (amount.base > BigInt(0)) {
    amount.display = shortenDecimals(amount.formatted, displayDecimals, minNum)
  }

  return amount
}
