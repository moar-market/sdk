import { priceToTick as hPriceToTick, tickToPrice as hTickToPrice } from '@hyperionxyz/sdk'
import { bigAbs, bigPriceFromSqrtQ64, bigScale, ROUND_MODES } from '@itsmnthn/big-utils'
import { describe, expect, it } from 'vitest'
import { FeeTierIndex, FeeTierStep, priceToTick, tickToPrice } from './tick-price'
import { toInt32 } from './twos-complement'

describe('tick-price conversion with big-utils', () => {
  it('should match move module for tick to price', () => {
    const xDecimals = 8 // apt
    const yDecimals = 6 // usdc
    const pDecimals = 8

    const moduleSqrtPrice = 3854955334329891128n // from move module at ledger version 3303075404
    const module_64x64Tick = 4294935983n // from move module at ledger version 3303075404
    const modulePrice = 436716153n

    const sPrice = bigPriceFromSqrtQ64(moduleSqrtPrice, xDecimals - yDecimals, pDecimals, ROUND_MODES.HALF_AWAY_ZERO)
    expect(sPrice).toBe(modulePrice)

    const tick = toInt32(module_64x64Tick)

    const price = tickToPrice({
      tick,
      xDecimals,
      yDecimals,
      scale: pDecimals,
    }) // uses big10Pow // no loss

    const hPrice = hTickToPrice({
      tick,
      decimalsRatio: 10 ** (xDecimals - yDecimals),
    }) // uses Math.pow // lossy

    const hPriceScaled = bigScale(hPrice, pDecimals)
    const difference = bigAbs(price - hPriceScaled)

    // Calculate the tolerance (0.001% of the price)
    // We use a slightly larger tolerance to avoid flaky tests
    const tolerance = price / 100000n // 0.001%

    // Assert that the difference is smaller than the tolerance
    expect(difference).toBeLessThan(tolerance)
  })
})

it('should have a minuscule difference compared to the floating-point SDK for priceToTick', () => {
  const xDecimals = 8
  const yDecimals = 6
  const feeTierIndex = FeeTierIndex.PER_0_05_SPACING_5 // Spacing of 5
  const price = 4.36716153

  // Tick from your high-precision bigint function
  const myTick = priceToTick({
    price,
    feeTierIndex,
    xDecimals,
    yDecimals,
  })

  // Tick from the floating-point SDK
  const hTick = hPriceToTick({
    price,
    decimalsRatio: 10 ** (xDecimals - yDecimals),
    feeTierIndex: feeTierIndex as any,
  })

  // Ensure both ticks are not null before proceeding
  expect(myTick).not.toBeNull()
  expect(hTick).not.toBeNull()

  // Calculate the absolute difference between the two ticks
  const difference = bigAbs(myTick! - BigInt(hTick!.toString()))

  // The difference should be at most one tick step due to rounding discrepancies.
  // This is the most robust way to compare the two implementations.
  const tolerance = BigInt(FeeTierStep[feeTierIndex])

  // Assert that the difference is within the acceptable tolerance
  expect(difference).toBeLessThanOrEqual(tolerance)
})
