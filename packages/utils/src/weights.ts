/**
 * Calculates percentage weights for an array of numbers
 * @param {number[]} amounts - Array of numbers to calculate weights from
 * @returns {number[]} Array of percentage weights that sum to 100
 * @throws {Error} If any amount is negative
 */
export function calcWeights(amounts: number[]): number[] {
  let total = 0
  for (let i = 0; i < amounts.length; i++) {
    const amount = amounts[i] ?? 0
    if (amount < 0)
      throw new Error('amounts should not be negative')

    total += amount
  }

  const weights = []
  for (let i = 0; i < amounts.length; i++) {
    const weight = ((amounts[i] ?? 0) / total) * 100
    weights.push(Number.isNaN(weight) || !Number.isFinite(weight) ? 0 : weight)
  }

  return weights
}
