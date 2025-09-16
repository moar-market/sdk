export { bigPriceFromSqrtQ64 } from '@itsmnthn/big-utils' // only needed this for hyperion clamm

// this same calc is included in @itsmnthn/big-utils as bigPriceFromSqrt

// import type { AnyNumber, BigRounding } from '@itsmnthn/big-utils'
// import { bigMulDivRound, bigPow10, ROUND_MODES } from '@itsmnthn/big-utils'

// /**
//  * Computes the price from a fixed-point square root price representation (Q-format),
//  * applying a decimal delta and rounding to a specified output scale.
//  *
//  * The price is calculated as:
//  *   price = (sqrtQ^2 * 10^(decimalsDelta + outScale)) / 2^(2 * sqrtBits)
//  * for decimalsDelta >= 0, or
//  *   price = (sqrtQ^2 * 10^outScale) / (2^(2 * sqrtBits) * 10^(-decimalsDelta))
//  * for decimalsDelta < 0.
//  *
//  * @param {AnyNumber} sqrtQ - The square root of the price, in Q{sqrtBits} fixed-point format (e.g., Q64, Q96).
//  * @param {number} [sqrtBits=64] - The number of fractional bits in the Q-format (must be a positive integer, e.g., 64 or 96).
//  * @param {number} [decimalsDelta=0] - The decimal exponent difference (tokenADecimals - tokenBDecimals), can be negative.
//  * @param {number} [outScale=8] - The number of decimal places for the returned bigint (must be a non-negative integer).
//  * @param {BigRounding} [mode='half_even'] - The rounding mode to use: 'trunc', 'half_up', or 'half_even'.
//  * @returns {bigint} The computed price, scaled by 10^outScale.
//  * @throws {RangeError} If sqrtBits is not a positive integer, outScale is negative, or sqrtQ is negative.
//  */
// export function bigPriceFromSqrt(
//   sqrtQ: AnyNumber,
//   sqrtBits: number = 64,
//   decimalsDelta: number = 0,
//   outScale: number = 8,
//   mode: BigRounding = ROUND_MODES.HALF_EVEN,
// ): bigint {
//   if (!Number.isInteger(sqrtBits) || sqrtBits <= 0) {
//     throw new RangeError('sqrtBits must be a positive integer (e.g., 64 or 96)')
//   }
//   if (!Number.isInteger(outScale) || outScale < 0) {
//     throw new RangeError('outScale must be a non-negative integer')
//   }

//   const s = typeof sqrtQ === 'bigint' ? sqrtQ : BigInt(String(sqrtQ).trim())
//   if (s < 0n)
//     throw new RangeError('sqrtQ must be non-negative')

//   // numerator: s^2
//   const num = s * s
//   // denominator: 2^(2*sqrtBits)
//   const den = 1n << BigInt(2 * sqrtBits)

//   // incorporate decimalsDelta and outScale exactly, with a single rounded division
//   if (decimalsDelta >= 0) {
//     // multiply numerator by 10^(decimalsDelta + outScale)
//     const pow = bigPow10(decimalsDelta + outScale)
//     // (s^2 * 10^(k+out)) / 2^(2N)
//     return bigMulDivRound(num, pow, den, mode)
//   }
//   else {
//     // multiply denominator by 10^(-decimalsDelta), numerator by 10^outScale
//     const numPow = bigPow10(outScale)
//     const denPow = den * bigPow10(-decimalsDelta)
//     // (s^2 * 10^out) / (2^(2N) * 10^(-k))
//     return bigMulDivRound(num, numPow, denPow, mode)
//   }
// }

// /**
//  * Computes the price from a Q64.64 fixed-point square root price representation.
//  *
//  * @param {AnyNumber} sqrtQ64 - The square root of the price in Q64.64 format.
//  * @param {number} decimalsDelta - The decimal exponent difference (tokenADecimals - tokenBDecimals).
//  * @param {number} [outScale=8] - The number of decimal places for the returned bigint.
//  * @param {BigRounding} [mode='half_even'] - The rounding mode to use.
//  * @returns {bigint} The computed price, scaled by 10^outScale.
//  */
// export function bigPriceFromSqrtQ64(
//   sqrtQ64: AnyNumber,
//   decimalsDelta: number,
//   outScale = 8,
//   mode: BigRounding = ROUND_MODES.HALF_EVEN,
// ): bigint {
//   return bigPriceFromSqrt(sqrtQ64, 64, decimalsDelta, outScale, mode)
// }

// /**
//  * Computes the price from a Q96.96 fixed-point square root price representation.
//  *
//  * @param {AnyNumber} sqrtQ96 - The square root of the price in Q96.96 format.
//  * @param {number} decimalsDelta - The decimal exponent difference (tokenADecimals - tokenBDecimals).
//  * @param {number} [outScale=8] - The number of decimal places for the returned bigint.
//  * @param {BigRounding} [mode='half_even'] - The rounding mode to use.
//  * @returns {bigint} The computed price, scaled by 10^outScale.
//  */
// export function bigPriceFromSqrtQ96(
//   sqrtQ96: AnyNumber,
//   decimalsDelta: number,
//   outScale = 8,
//   mode: BigRounding = ROUND_MODES.HALF_EVEN,
// ): bigint {
//   return bigPriceFromSqrt(sqrtQ96, 96, decimalsDelta, outScale, mode)
// }
