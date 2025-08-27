import type { Debt, Kink } from './common'
import { describe, expect, it } from 'vitest'
import { calcInterestForTime, calcLeverage, calcMaxWithdrawable, calcPiecewiseRate, calcWeightedInterestRate, calcWeights } from './common'

describe('calcLeverage', () => {
  // Test case 1: Standard leverage calculation
  it('should correctly calculate a standard leverage of 1.5x', () => {
    const accountValue = 150000000n // 150.00
    const debt = 50000000n // 50.00
    // Equity = 100. Leverage = 150 / 100 = 1.5
    expect(calcLeverage(accountValue, debt)).toBe(1.5)
  })

  // Test case 2: Higher leverage
  it('should correctly calculate a higher leverage of 6x', () => {
    const accountValue = 120000000n // 120.00
    const debt = 100000000n // 100.00
    // Equity = 20. Leverage = 120 / 20 = 6
    expect(calcLeverage(accountValue, debt)).toBe(6)
  })

  // Test case 3: No debt
  it('should return 1x leverage when there is no debt', () => {
    const accountValue = 500000000n // 500.00
    const debt = 0n // 0.00
    expect(calcLeverage(accountValue, debt)).toBe(1)
  })

  // Test case 4: Liquidation point (infinite leverage)
  it('should return Infinity when account value equals debt', () => {
    const accountValue = 99000000n // 99.00
    const debt = 99000000n // 99.00
    expect(calcLeverage(accountValue, debt)).toBe(Infinity)
  })

  // Test case 5: Zero account value and zero debt
  it('should return NaN when both account value and debt are zero', () => {
    const accountValue = 0n
    const debt = 0n
    expect(calcLeverage(accountValue, debt)).toBeNaN()
  })

  // Test case 6: Negative equity
  it('should correctly calculate leverage when equity is negative', () => {
    const accountValue = 80000000n // 80.00
    const debt = 100000000n // 100.00
    // Equity = -20. Leverage = 80 / -20 = -4
    expect(calcLeverage(accountValue, debt)).toBe(-4)
  })

  // Test case 7: A case that requires rounding
  it('should handle division with repeating decimals correctly', () => {
    const accountValue = 100000000n // 100.00
    const debt = 66666667n // 66.666667
    // Equity = 33333333. Leverage = 100 / 33.333333 = 3
    // bigUnscale will produce '3.000000' which becomes 3
    expect(calcLeverage(accountValue, debt)).toBeCloseTo(3)
  })
})

describe('calcMaxWithdrawable', () => {
  const SCALE = 6

  it('should allow withdrawing the correct amount to reach max leverage', () => {
    // Current state: AV=200, Debt=100 -> Equity=100, Leverage=2x
    const accountValue = 200000000n
    const debtValue = 100000000n
    const maxLeverage = 5 // Target 5x leverage

    // To reach 5x leverage: 5 = minAV / (minAV - 100) -> minAV = 125
    // Withdrawable = 200 - 125 = 75
    const expectedWithdrawable = 75000000n
    expect(calcMaxWithdrawable(accountValue, debtValue, maxLeverage, SCALE)).toBe(expectedWithdrawable)
  })

  it('should return 0 if current leverage is already over the max', () => {
    // Current state: AV=120, Debt=100 -> Leverage=6x
    const accountValue = 120000000n
    const debtValue = 100000000n
    const maxLeverage = 5

    expect(calcMaxWithdrawable(accountValue, debtValue, maxLeverage, SCALE)).toBe(0n)
  })

  it('should return the full account value if there is no debt', () => {
    const accountValue = 500000000n
    const debtValue = 0n
    const maxLeverage = 5

    expect(calcMaxWithdrawable(accountValue, debtValue, maxLeverage, SCALE)).toBe(accountValue)
  })

  it('should return 0 if max leverage is 1 and there is debt', () => {
    const accountValue = 200000000n
    const debtValue = 100000000n
    const maxLeverage = 1

    expect(calcMaxWithdrawable(accountValue, debtValue, maxLeverage, SCALE)).toBe(0n)
  })

  it('should handle a different scale correctly', () => {
    const scale18 = 18
    // Current state: AV=200e18, Debt=100e18 -> Leverage=2x
    const accountValue = 200000000000000000000n
    const debtValue = 100000000000000000000n
    const maxLeverage = 4 // Target 4x leverage

    // To reach 4x leverage: 4 = minAV / (minAV - 100) -> minAV = 133.33...
    // minAV = (4 * 100) / 3 = 133.333...
    // Withdrawable = 200 - 133.333... = 66.666...
    const expectedWithdrawable = 66666666666666666666n // Approx 66.66e18
    const result = calcMaxWithdrawable(accountValue, debtValue, maxLeverage, scale18)

    // Check if the result is close to the expected value
    const difference = result - expectedWithdrawable
    expect(difference < 10n && difference > -10n).toBe(true) // Allow for small rounding diff
  })

  it('supports fractional maxLeverage (3.5x)', () => {
    // AV=210, Debt=100; minAV = L*D/(L-1) = 3.5*100/2.5 = 140
    const av = 210000000n
    const debt = 100000000n
    const L = 3.5
    const SCALE = 6
    expect(calcMaxWithdrawable(av, debt, L, SCALE)).toBe(70000000n) // 210 - 140 = 70
  })

  it('returns 0 when insolvent (AV < Debt)', () => {
    const av = 90000000n
    const debt = 100000000n
    const L = 2
    const SCALE = 6
    expect(calcMaxWithdrawable(av, debt, L, SCALE)).toBe(0n)
  })

  it('maxLeverage <= 0 returns 0 when debt > 0', () => {
    const av = 200000000n
    const debt = 100000000n
    const L = 0
    const SCALE = 6
    expect(calcMaxWithdrawable(av, debt, L, SCALE)).toBe(0n)
  })
})

describe('calcInterestForTime', () => {
  const INTEREST_DECIMALS = 8

  it('should calculate correct interest for a full year', () => {
    const debt = 10_000_000_000n // 100 tokens
    const interestRate = 5_000_000n // 5% annual rate (0.05 scaled by 8)
    const secondsInYear = 31_536_000

    // Expected interest: 100 * 0.05 = 5 tokens
    const expectedInterest = 500_000_000n
    const calculatedInterest = calcInterestForTime(debt, interestRate, secondsInYear, INTEREST_DECIMALS)
    expect(calculatedInterest).toBe(expectedInterest)
  })

  it('should calculate correct interest for half a year', () => {
    const debt = 20_000_000_000n // 200 tokens
    const interestRate = 10_000_000n // 10% (scaled by 1e8)
    const secondsInHalfYear = 31_536_000 / 2
    const expectedInterest = 1_000_000_000n // 10 tokens
    const calculatedInterest = calcInterestForTime(debt, interestRate, secondsInHalfYear, INTEREST_DECIMALS)
    expect(calculatedInterest).toBe(expectedInterest)
  })

  it('should return 0 for zero debt', () => {
    const debt = 0n
    const interestRate = 5_000_000n
    const seconds = 100_000

    expect(calcInterestForTime(debt, interestRate, seconds, INTEREST_DECIMALS)).toBe(0n)
  })

  it('should return 0 for a zero or negative time period', () => {
    const debt = 10_000_000_000n
    const interestRate = 5_000_000n

    expect(calcInterestForTime(debt, interestRate, 0, INTEREST_DECIMALS)).toBe(0n)
    expect(calcInterestForTime(debt, interestRate, -100, INTEREST_DECIMALS)).toBe(0n)
  })

  it('should handle small time periods and truncate correctly', () => {
    const debt = 1_000_000_000_000n // 10,000 tokens
    const interestRate = 10_000_000n // 10%
    const oneSecond = 1

    // Interest per second = (10000 * 0.10) / 31536000 = 0.0000317...
    // Scaled by 8 decimals, this is 3170.
    const expectedInterest = 3_170n
    const calculatedInterest = calcInterestForTime(debt, interestRate, oneSecond, INTEREST_DECIMALS)
    expect(calculatedInterest).toBe(expectedInterest)
  })
})

describe('calcPiecewiseRate', () => {
  it('throws when no kinks provided', () => {
    expect(() => calcPiecewiseRate(0.5, [])).toThrow('Need at least one kink')
  })

  it('with a single kink, always returns that rate (any utilization)', () => {
    const kinks: Kink[] = [{ util: 0, rate: 0.07 }]
    expect(calcPiecewiseRate(-1, kinks)).toBe(0.07)
    expect(calcPiecewiseRate(0, kinks)).toBe(0.07)
    expect(calcPiecewiseRate(0.5, kinks)).toBe(0.07)
    expect(calcPiecewiseRate(1, kinks)).toBe(0.07)
    expect(calcPiecewiseRate(2, kinks)).toBe(0.07)
  })

  it('clamps below min and above max to edge rates', () => {
    const kinks: Kink[] = [
      { util: 0, rate: 0.05 },
      { util: 1, rate: 0.20 },
    ]
    expect(calcPiecewiseRate(-0.1, kinks)).toBe(0.05) // below min → first rate
    expect(calcPiecewiseRate(2.0, kinks)).toBe(0.20) // above max → last rate
  })

  it('returns exact rates at kink boundaries and interpolates inside', () => {
    const kinks: Kink[] = [
      { util: 0, rate: 0.05 },
      { util: 1, rate: 0.20 },
    ]
    // Boundaries
    expect(calcPiecewiseRate(0, kinks)).toBe(0.05)
    expect(calcPiecewiseRate(1, kinks)).toBe(0.20)

    // Midpoint (t = 0.5): 0.05 + 0.5*(0.15) = 0.125
    expect(calcPiecewiseRate(0.5, kinks)).toBeCloseTo(0.125, 12)

    // Quarter (t = 0.25): 0.05 + 0.25*(0.15) = 0.0875
    expect(calcPiecewiseRate(0.25, kinks)).toBeCloseTo(0.0875, 12)
  })

  it('handles multiple segments with correct segment selection + interpolation', () => {
    const kinks: Kink[] = [
      { util: 0.0, rate: 0.02 },
      { util: 0.7, rate: 0.12 },
      { util: 0.9, rate: 0.40 },
      { util: 1.0, rate: 1.00 },
    ]

    // On kinks
    expect(calcPiecewiseRate(0.7, kinks)).toBeCloseTo(0.12, 12)
    expect(calcPiecewiseRate(0.9, kinks)).toBeCloseTo(0.40, 12)

    // Inside [0.7, 0.9]: t = (0.8-0.7)/(0.9-0.7) = 0.5 → 0.12 + 0.5*(0.28) = 0.26
    expect(calcPiecewiseRate(0.8, kinks)).toBeCloseTo(0.26, 12)

    // Inside [0.9, 1.0]: t = 0.05/0.1 = 0.5 → 0.4 + 0.5*(0.6) = 0.7
    expect(calcPiecewiseRate(0.95, kinks)).toBeCloseTo(0.7, 12)
  })

  it('handles degenerate segments where consecutive kinks share the same util', () => {
    const kinks: Kink[] = [
      { util: 0.4, rate: 0.10 },
      { util: 0.5, rate: 0.11 },
      { util: 0.5, rate: 0.90 }, // u1 - u0 === 0 → function should return r0 (0.11)
      { util: 0.8, rate: 0.30 },
    ]

    // At util=0.5, the first time we hit a degenerate segment, code returns r0
    expect(calcPiecewiseRate(0.5, kinks)).toBeCloseTo(0.11, 12)

    // the first time we hit a degenerate segment, code returns r0
    // Between 0.5 (0.11) and 0.8 (0.30), midpoint 0.65 → 0.11 + 0.5*(0.19) = 0.205
    expect(calcPiecewiseRate(0.65, kinks)).toBeCloseTo(0.11, 12)
  })

  it('handles unsorted kinks by sorting internally', () => {
    const unsorted: Kink[] = [
      { util: 1.0, rate: 1.0 },
      { util: 0.0, rate: 0.05 },
      { util: 0.7, rate: 0.12 },
    ]
    const sorted: Kink[] = [
      { util: 0.0, rate: 0.05 },
      { util: 0.7, rate: 0.12 },
      { util: 1.0, rate: 1.0 },
    ]
    expect(calcPiecewiseRate(0.5, unsorted)).toBeCloseTo(calcPiecewiseRate(0.5, sorted), 12)
  })

  it('does not mutate the input array', () => {
    const input: Kink[] = [
      { util: 0.7, rate: 0.12 },
      { util: 0.0, rate: 0.05 },
      { util: 1.0, rate: 1.0 },
    ]
    const snapshot = JSON.parse(JSON.stringify(input))
    void calcPiecewiseRate(0.8, input)
    expect(input).toEqual(snapshot)
  })

  it('clamps below min and above max, and interpolates inside', () => {
    const kinks: Kink[] = [
      { util: 0.0, rate: 0.02 },
      { util: 0.7, rate: 0.12 },
      { util: 0.9, rate: 0.40 },
      { util: 1.0, rate: 1.00 },
    ]
    expect(calcPiecewiseRate(-1, kinks)).toBeCloseTo(0.02, 12) // below min
    expect(calcPiecewiseRate(2, kinks)).toBeCloseTo(1.00, 12) // above max
    expect(calcPiecewiseRate(0.7, kinks)).toBeCloseTo(0.12, 12) // kink
    expect(calcPiecewiseRate(0.8, kinks)).toBeCloseTo(0.26, 12) // mid of [0.7,0.9]
    expect(calcPiecewiseRate(0.95, kinks)).toBeCloseTo(0.70, 12) // mid of [0.9,1.0]
  })

  it('handles degenerate consecutive kinks (same util) by returning left rate', () => {
    const kinks: Kink[] = [
      { util: 0.4, rate: 0.10 },
      { util: 0.5, rate: 0.11 },
      { util: 0.5, rate: 0.90 }, // degenerate segment
      { util: 0.8, rate: 0.30 },
    ]
    expect(calcPiecewiseRate(0.5, kinks)).toBeCloseTo(0.11, 12)
  })
})

describe('calcWeightedInterestRate', () => {
  it('returns 0 for empty input', () => {
    const debts: Debt[] = []
    expect(calcWeightedInterestRate(debts)).toBe(0)
  })

  it('returns 0 when all debts are zero', () => {
    const debts: Debt[] = [
      { debtUSD: 0, interestRate: 5 },
      { debtUSD: 0, interestRate: 12 },
    ]
    expect(calcWeightedInterestRate(debts)).toBe(0)
  })

  it('computes weighted average with equal weights', () => {
    // Total debt = 100 + 100 = 200; weights = 0.5 each
    // Rate = 0.5*5 + 0.5*7 = 6.00
    const debts: Debt[] = [
      { debtUSD: 100, interestRate: 5 },
      { debtUSD: 100, interestRate: 7 },
    ]
    expect(calcWeightedInterestRate(debts)).toBe(6.00)
  })

  it('computes weighted average with different weights', () => {
    // Total debt = 100 + 300 = 400
    // Weighted rate = (100*5 + 300*12)/400 = 10.25
    const debts: Debt[] = [
      { debtUSD: 100, interestRate: 5 },
      { debtUSD: 300, interestRate: 12 },
    ]
    expect(calcWeightedInterestRate(debts)).toBe(10.25)
  })

  it('ignores zero-debt entries (weight 0) without changing the result', () => {
    // Same as the previous test but with a zero-debt outlier
    // The zero-debt item must not affect the average
    const debts: Debt[] = [
      { debtUSD: 100, interestRate: 5 },
      { debtUSD: 300, interestRate: 12 },
      { debtUSD: 0, interestRate: 99 }, // ignored by function
    ]
    expect(calcWeightedInterestRate(debts)).toBe(10.25)
  })

  it('rounds to 2 decimals (uses toFixed(2))', () => {
    // Total = 150; weighted = (100*10 + 50*0)/150 = 6.666... -> 6.67
    const debts: Debt[] = [
      { debtUSD: 100, interestRate: 10 },
      { debtUSD: 50, interestRate: 0 },
    ]
    expect(calcWeightedInterestRate(debts)).toBe(6.67)
  })

  it('handles multiple items with exact 2-decimal outcome', () => {
    // Sum = 1000; numerator = 200*7.33 + 300*8.88 + 500*10.12 = 9190
    // 9190/1000 = 9.19 exactly → 9.19 after toFixed(2)
    const debts: Debt[] = [
      { debtUSD: 200, interestRate: 7.33 },
      { debtUSD: 300, interestRate: 8.88 },
      { debtUSD: 500, interestRate: 10.12 },
    ]
    expect(calcWeightedInterestRate(debts)).toBe(9.19)
  })
})

describe('calcWeights', () => {
  it('should calculate correct weights for a simple integer array', () => {
    const amounts = [10, 20, 70]
    const expectedWeights = [10, 20, 70]
    expect(calcWeights(amounts)).toEqual(expectedWeights)
  })

  it('should calculate correct weights for an array with decimal values', () => {
    const amounts = [25.5, 40.5, 34.0] // Total = 100
    const expectedWeights = [25.5, 40.5, 34.0]
    const result = calcWeights(amounts)
    result.forEach((weight, index) => {
      expect(weight).toBeCloseTo(expectedWeights[index])
    })
  })

  it('should handle an array where one amount is zero', () => {
    const amounts = [50, 0, 150] // Total = 200
    const expectedWeights = [25, 0, 75]
    expect(calcWeights(amounts)).toEqual(expectedWeights)
  })

  it('should return an array of zeros if all amounts are zero', () => {
    const amounts = [0, 0, 0]
    const expectedWeights = [0, 0, 0]
    expect(calcWeights(amounts)).toEqual(expectedWeights)
  })

  it('should throw an error if any amount is negative', () => {
    const amounts = [10, -5, 15]
    expect(() => calcWeights(amounts)).toThrow('amounts should not be negative')
  })

  it('should handle an array with a single non-zero value', () => {
    const amounts = [0, 100, 0]
    const expectedWeights = [0, 100, 0]
    expect(calcWeights(amounts)).toEqual(expectedWeights)
  })

  it('should handle an empty array', () => {
    const amounts: number[] = []
    const expectedWeights: number[] = []
    expect(calcWeights(amounts)).toEqual(expectedWeights)
  })
})
