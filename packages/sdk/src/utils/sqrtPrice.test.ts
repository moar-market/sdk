import { ROUND_MODES } from '@itsmnthn/big-utils'
import { describe, expect, it } from 'vitest'
import { bigPriceFromSqrtQ64 } from './sqrtPrice'

describe('bigPriceFromSqrtQ64 — success cases', () => {
  it('should be equal to move module', () => {
    // input & output from move module - hyperion_lens
    expect(bigPriceFromSqrtQ64(3860534275239885696n, 2, 8, ROUND_MODES.HALF_AWAY_ZERO)).toBe(437981110n)
  })
})
