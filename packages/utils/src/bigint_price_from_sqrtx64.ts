/**
 * Compute human-readable price from a Q64.64 √price, in BigInt only.
 *
 * This function converts a square root price in Q64.64 fixed-point format
 * (commonly used in AMM protocols like Uniswap V3) to a human-readable decimal price.
 *
 * @param {string|bigint} sqrtX64str – the on-chain sqrtPriceX64, e.g. "4189422669926903626"
 * @param {number} decimalsRatio – Must be Math.pow(10, decimalA - decimalB) where decimalA and decimalB are integers
 * @param {number} finalPrecision – how many digits after the decimal you want (default 8, min 0)
 * @returns {bigint} – price scaled by 10^prec (e.g. 515990617n for price 5.15990617 with prec=8)
 * @throws {Error} When input parameters are invalid
 */
export function priceFromSqrtX64WithRatio(
  sqrtX64str: string | bigint,
  decimalsRatio: number,
  finalPrecision: number = 8,
): bigint {
  // ——— validations ———
  if (finalPrecision < 0 || !Number.isInteger(finalPrecision)) {
    throw new Error('`finalPrecision` must be a non-negative integer')
  }
  if ((typeof sqrtX64str === 'string' && !sqrtX64str.trim())
    || (typeof sqrtX64str !== 'string' && typeof sqrtX64str !== 'bigint')) {
    throw new Error('`sqrtX64str` must be a non-empty string or bigint')
  }
  if (typeof decimalsRatio !== 'number' || decimalsRatio <= 0 || !Number.isFinite(decimalsRatio)) {
    throw new Error(
      '`decimalsRatio` must be a positive finite number computed as Math.pow(10, decimalA - decimalB)',
    )
  }

  // --- calculate price ---
  const x = BigInt(sqrtX64str)
  let num = x * x // 128.128 fixed numerator
    * (10n ** BigInt(finalPrecision)) // shift for precision
  let denom = 1n << 128n // 2**128

  // figure out k such that decimalsRatio === 10**k
  // (decimalsRatio is guaranteed to be Math.pow(10, decimalA - decimalB))
  const k = Math.round(Math.log10(decimalsRatio))
  if (10 ** k !== decimalsRatio) {
    throw new Error('`decimalsRatio` must be an exact power of 10')
  }
  // incorporate that factor exactly:
  if (k > 0) {
    num *= 10n ** BigInt(k)
  }
  else if (k < 0) {
    denom *= 10n ** BigInt(-k)
  }

  // one big-int division gives floor(truePrice * 10^precision)
  return num / denom
}

/**
 * Compute human-readable price from a Q64.64 √price, in BigInt only.
 *
 * This function converts a square root price in Q64.64 fixed-point format
 * (commonly used in AMM protocols like Uniswap V3) to a human-readable decimal price.
 *
 * @param sqrtX64str - The square root price in Q64.64 format as a string or bigint
 * @param decimals0 - The number of decimals of the first token
 * @param decimals1 - The number of decimals of the second token
 * @param finalPrecision - Number of decimal places in the output (default: 8)
 * @returns A BigInt representing the price scaled by 10^finalPrecision
 */
export function priceFromSqrtX64(
  sqrtX64str: string | bigint,
  decimals0: number,
  decimals1: number,
  finalPrecision: number = 8,
): bigint {
  const decimalsRatio = 10 ** (decimals0 - decimals1)
  return priceFromSqrtX64WithRatio(sqrtX64str, decimalsRatio, finalPrecision)
}
