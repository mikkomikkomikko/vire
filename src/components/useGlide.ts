import { useEffect, useRef, useState } from 'react'
import { median } from '../audio/smoothing'

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

// Cubic Hermite from p0 to p1 over t ∈ [0, 1]; m0 and m1 are the slopes per period at each end.
const hermite = (p0: number, m0: number, p1: number, m1: number, t: number) =>
  p0 * (2 * t ** 3 - 3 * t ** 2 + 1) +
  m0 * (t ** 3 - 2 * t ** 2 + t) +
  p1 * (-2 * t ** 3 + 3 * t ** 2) +
  m1 * (t ** 3 - t ** 2)
const hermiteSlope = (p0: number, m0: number, p1: number, m1: number, t: number) =>
  p0 * (6 * t ** 2 - 6 * t) +
  m0 * (3 * t ** 2 - 4 * t + 1) +
  p1 * (-6 * t ** 2 + 6 * t) +
  m1 * (3 * t ** 2 - 2 * t)

/**
 * Samples `value` once per `periodMs` (the median of the readings since the last sample, so a
 * stray glitch can't drag it) and glides to each sample over the next period. Each glide starts
 * at the speed the last one ended with, so the motion never stops and starts at the period
 * boundaries. Starts at `value`; with reduced motion it jumps to each sample.
 */
export function useGlide(value: number, periodMs = 1000): number {
  const [shown, setShown] = useState(value)
  const readings = useRef<number[]>([])
  const segment = useRef({ p0: value, m0: 0, p1: value, m1: 0, start: -Infinity })

  useEffect(() => {
    readings.current.push(value)
  }, [value])

  useEffect(() => {
    const reduce = reducedMotion()
    let frame = 0
    const at = (now: number) => Math.min(1, (now - segment.current.start) / periodMs)

    const draw = (now: number) => {
      const { p0, m0, p1, m1 } = segment.current
      const t = at(now)
      setShown(hermite(p0, m0, p1, m1, t))
      frame = t < 1 ? requestAnimationFrame(draw) : 0
    }

    const sample = setInterval(() => {
      if (readings.current.length === 0) return
      const target = median(readings.current)
      readings.current = []
      const now = performance.now()
      if (reduce) {
        setShown(target)
        return
      }
      const { p0, m0, p1, m1 } = segment.current
      const t = at(now)
      const from = hermite(p0, m0, p1, m1, t)
      segment.current = {
        p0: from,
        m0: t < 1 ? hermiteSlope(p0, m0, p1, m1, t) : 0,
        p1: target,
        m1: target - from,
        start: now,
      }
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(draw)
    }, periodMs)

    return () => {
      clearInterval(sample)
      cancelAnimationFrame(frame)
    }
  }, [periodMs])

  return shown
}
