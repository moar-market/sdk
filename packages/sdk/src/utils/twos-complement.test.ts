import { describe, expect, it } from 'vitest'
import { toInt32, toUnsignedInt32 } from './twos-complement' // adjust path

describe('toUnsignedInt32', () => {
  it('returns exact values for small non-negative numbers', () => {
    expect(toUnsignedInt32(0)).toBe(0)
    expect(toUnsignedInt32(1)).toBe(1)
    expect(toUnsignedInt32(1234)).toBe(1234)
  })

  it('wraps negatives into [0, 2^32-1]', () => {
    // -1 → 0xFFFF_FFFF
    expect(toUnsignedInt32(-1)).toBe(0xFFFF_FFFF)
    // -2^32 → 0
    expect(toUnsignedInt32(-(2 ** 32))).toBe(0)
    // -2^32 - 5 → 2^32 - 5
    expect(toUnsignedInt32(-(2 ** 32) - 5)).toBe((2 ** 32) - 5)
  })

  it('reduces values modulo 2^32 (large positives)', () => {
    // 2^32 → 0
    expect(toUnsignedInt32(2 ** 32)).toBe(0)
    // 2^32 + 123 → 123
    expect(toUnsignedInt32((2 ** 32) + 123)).toBe(123)
  })

  it('matches >>> 0 semantics for fractional numbers', () => {
    expect(toUnsignedInt32(1.9)).toBe(1) // truncates toward 0
    expect(toUnsignedInt32(-1.9)).toBe(0xFFFF_FFFF) // truncates then wraps
  })

  it('accepts string & bigint inputs identically', () => {
    // 2^32 + 1 → 1
    expect(toUnsignedInt32('4294967297')).toBe(1)
    expect(toUnsignedInt32(4294967297n)).toBe(1)

    // A very large bigint → masked
    const huge = (1n << 64n) + 5n
    expect(toUnsignedInt32(huge)).toBe(5)
    // Hex string accepted by BigInt ctor
    expect(toUnsignedInt32('0xFFFFFFFF')).toBe(0xFFFF_FFFF)
  })
})

describe('toInt32', () => {
  it('preserves small 32-bit signed values exactly', () => {
    expect(toInt32(0)).toBe(0)
    expect(toInt32(1)).toBe(1)
    expect(toInt32(-1)).toBe(-1)
    expect(toInt32(0x7FFF_FFFF)).toBe(0x7FFF_FFFF) //  2147483647
    expect(toInt32(-0x8000_0000)).toBe(-0x8000_0000) // -2147483648
  })

  it('interprets unsigned 32-bit numbers in two’s complement', () => {
    expect(toInt32(0xFFFF_FFFF)).toBe(-1) // 4294967295 → -1
    expect(toInt32(0x8000_0000)).toBe(-0x8000_0000) // 2147483648 → -2147483648
  })

  it('wraps large magnitudes modulo 2^32', () => {
    // 2^32 + 5 → 5
    expect(toInt32((2 ** 32) + 5)).toBe(5)
    // -2^32 - 1 → -1
    expect(toInt32(-(2 ** 32) - 1)).toBe(-1)
  })

  it('truncates fractional numbers like (x << 0)', () => {
    expect(toInt32(1.9)).toBe(1)
    expect(toInt32(-1.9)).toBe(-1)
  })

  it('accepts string & bigint inputs identically', () => {
    // 0x8000_0000 as string/bigint → -2147483648
    expect(toInt32('2147483648')).toBe(-2147483648)
    expect(toInt32(2147483648n)).toBe(-2147483648) // returns number; bigint literal for clarity
    // A huge bigint reduced then signed
    const huge = (1n << 40n) + 0x7FFF_FFFFn
    expect(toInt32(huge)).toBe(0x7FFF_FFFF) // 2147483647
  })

  it('matches unsigned wrap for boundary negatives', () => {
    // -2147483649 → 2147483647 (wrap then signed)
    expect(toInt32(-2147483649)).toBe(2147483647)
  })
})
