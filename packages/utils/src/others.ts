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
