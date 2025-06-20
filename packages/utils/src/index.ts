/**
 * Moar Market SDK Utilities
 *
 * Common utility functions used across the SDK and required for integration
 */

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
