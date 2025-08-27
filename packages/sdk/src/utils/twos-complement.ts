// -----------------------------------------------------------------------------
// Two's-complement helpers
// - 32-bit helpers return `number` and use bitwise fast paths for number inputs.
// // - Generic N-bit & 64-bit helpers return `bigint` (safe beyond 2^53-1).
// -----------------------------------------------------------------------------

/** Build masks for an N-bit two’s-complement space. */
function tcBits(bits: number) {
  if (!Number.isInteger(bits) || bits < 1) {
    throw new Error('bits must be a positive integer')
  }

  const B = BigInt(bits)
  const ONE = BigInt(1)
  const MASK = (ONE << B) - ONE // 2^bits - 1
  const SIGN = ONE << (B - ONE) // sign bit
  const FULL = ONE << B // 2^bits

  return { MASK, SIGN, FULL }
}

// ───────────────────────────── 32-bit (number) ───────────────────────────────

/**
 * Unsigned 32-bit projection (x mod 2^32) as a JS number.
 * Fast path when `x` is already a number (`x >>> 0`).
 *
 * Always exact: result ∈ [0, 2^32 − 1] ⊂ Number’s exact range.
 *
 * @example toUnsignedInt32(-1)            // 4294967295
 * @example toUnsignedInt32(2**32 + 123)   // 123
 */
export function toUnsignedInt32(x: number | string | bigint): number {
  if (typeof x === 'number') {
    return x >>> 0 // fast path (ToUint32)
  }

  const { MASK } = tcBits(32)
  return Number(BigInt(x) & MASK) // exact after mask
}

/**
 * Signed 32-bit interpretation (two’s complement) as a JS number.
 * Fast path when `x` is already a number (`x << 0` or `x | 0`).
 *
 * Always exact: result ∈ [−2^31, 2^31 − 1].
 *
 * @example toInt32(4294967295)  // -1
 * @example toInt32(2147483648)  // -2147483648
 */
export function toInt32(x: number | string | bigint): number {
  if (typeof x === 'number') {
    return x << 0 // fast path (ToInt32)
  }

  const { MASK, SIGN, FULL } = tcBits(32)
  const u = BigInt(x) & MASK
  return Number((u & SIGN) ? u - FULL : u) // exact after mask
}
