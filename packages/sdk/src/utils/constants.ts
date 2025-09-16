import type { FormattedAmount } from '@itsmnthn/big-utils'

export const DECIMALS = {
  ORACLE: 8,
  INTEREST: 8,
  HEALTH_FACTOR: 8,
} as const
export const ZERO = BigInt(0)
export const ZERO_FORMATTED: FormattedAmount = { base: ZERO, formatted: '0', display: '0' } as const
