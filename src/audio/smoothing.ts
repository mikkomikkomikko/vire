export const MEDIAN_WINDOW = 5
export const IDLE_AFTER_MS = 1500

export type Smoothed = { freq: number; idle: false } | { freq: null; idle: boolean }

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Median of the last few accepted readings. Rejected frames (null) hold the last value until
 * nothing has been accepted for IDLE_AFTER_MS, then the tuner goes idle and the window clears.
 */
export function createSmoother(window = MEDIAN_WINDOW, idleAfterMs = IDLE_AFTER_MS) {
  let readings: number[] = []
  let lastAcceptedAt = -Infinity

  return function push(freq: number | null, nowMs: number): Smoothed {
    if (freq !== null) {
      readings.push(freq)
      if (readings.length > window) readings.shift()
      lastAcceptedAt = nowMs
      return { freq: median(readings), idle: false }
    }
    if (readings.length === 0) return { freq: null, idle: true }
    if (nowMs - lastAcceptedAt >= idleAfterMs) {
      readings = []
      return { freq: null, idle: true }
    }
    return { freq: median(readings), idle: false }
  }
}
