/**
 * Returns the larger of two BigInt values.
 * @param {bigint} a - The first BigInt value to compare
 * @param {bigint} b - The second BigInt value to compare
 * @returns {bigint} The larger of the two BigInt values
 * @example
 * BigIntMax(2n, 3n) // Returns 3n
 * BigIntMax(-1n, 0n) // Returns 0n
 */
export function BigIntMax(a: bigint, b: bigint): bigint {
  return a > b ? a : b
}

/**
 * Returns the smaller of two BigInt values.
 * @param {bigint} a - The first BigInt value to compare
 * @param {bigint} b - The second BigInt value to compare
 * @returns {bigint} The smaller of the two BigInt values
 * @example
 * BigIntMin(2n, 3n) // Returns 2n
 * BigIntMin(-1n, 0n) // Returns -1n
 */
export function BigIntMin(a: bigint, b: bigint): bigint {
  return a < b ? a : b
}
