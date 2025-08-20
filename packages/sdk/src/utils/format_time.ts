import { formatTime } from '@itsmnthn/big-utils'

/**
 * Formats a number of seconds into a human-readable time string.
 * Can optionally include days in the output format.
 *
 * @param {number} seconds - The number of seconds to format
 * @param {boolean} [allowDays] - Whether to include days in the output
 * @returns {string} A formatted time string (e.g. "1h 1m 1s" or "1d 1h 1m 1s")
 *
 * @example
 * formatFromSeconds(3661) // Returns "1h 1m 1s"
 * formatFromSeconds(90061, true) // Returns "1d 1h 1m 1s"
 * formatFromSeconds(60) // Returns "1m"
 */
export function formatFromSeconds(seconds: number, allowDays = false): string {
  if (allowDays) {
    return formatTime({
      days: Math.floor(seconds / (3600 * 24)),
      hours: Math.floor((seconds % (3600 * 24)) / 3600),
      mins: Math.floor((seconds % 3600) / 60),
      secs: seconds % 60,
    })
  }

  return formatTime({
    hours: Math.floor(seconds / 3600),
    mins: Math.floor((seconds % 3600) / 60),
    secs: seconds % 60,
  })
}
