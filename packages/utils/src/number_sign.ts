import type { DeltaSign } from './types'

/**
 * Gets the sign of a number represented as a string, or number.
 * @param num {string | number} The number in string or number format to be used for deciding the sign.
 * @returns 0 if num is zero, 1 if num is positive, -1 if num is negative.
 */
export function getNumberSign(num: string | number): DeltaSign {
  num = Number(num)
  return num === 0 ? 0 : num > 0 ? 1 : -1
}
