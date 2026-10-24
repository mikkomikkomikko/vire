import { useEffect, useRef, useState } from 'react'

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Integrate in steps no longer than this, so a long frame can't make the spring blow up. */
const STEP_S = 1 / 240
/** A frame longer than this (a backgrounded tab) is treated as this long. */
const MAX_FRAME_S = 1 / 20
/** Close enough to the target, and slow enough, to stop animating. */
const REST_DELTA = 0.005
const REST_SPEED = 0.05

export type SpringOptions = {
  /** Seconds for one undamped swing; lower is snappier. */
  response?: number
  /** 1 settles without overshoot; below 1 swings past the target a little first. */
  damping?: number
}

/**
 * Follows `value` like a meter needle: a mass on a damped spring pulled towards the latest
 * reading. Every reading moves it, so it answers at once, but the needle's inertia averages out
 * frame-to-frame jitter and it eases into place with a slight overshoot. Starts at `value`; with
 * reduced motion the spring is critically damped, so it settles without swinging past.
 */
export function useSpring(value: number, { response = 0.45, damping = 0.75 }: SpringOptions = {}) {
  const [shown, setShown] = useState(value)
  const target = useRef(value)
  const state = useRef({ x: value, v: 0, last: -1 })
  const frame = useRef(0)
  const tick = useRef<(now: number) => void>(() => {})

  useEffect(() => {
    const omega = (2 * Math.PI) / response
    const zeta = reducedMotion() ? 1 : damping
    const s = state.current

    tick.current = (now: number) => {
      let left = s.last < 0 ? 1 / 60 : Math.min(MAX_FRAME_S, (now - s.last) / 1000)
      s.last = now
      // Semi-implicit Euler: stable for a stiff spring at these step sizes.
      while (left > 0) {
        const dt = Math.min(STEP_S, left)
        s.v += (omega * omega * (target.current - s.x) - 2 * zeta * omega * s.v) * dt
        s.x += s.v * dt
        left -= dt
      }
      if (Math.abs(target.current - s.x) < REST_DELTA && Math.abs(s.v) < REST_SPEED) {
        s.x = target.current
        s.v = 0
        s.last = -1
        frame.current = 0
      } else {
        frame.current = requestAnimationFrame(tick.current)
      }
      setShown(s.x)
    }

    return () => {
      cancelAnimationFrame(frame.current)
      frame.current = 0
      s.last = -1
    }
  }, [response, damping])

  useEffect(() => {
    target.current = value
    if (frame.current === 0 && value !== state.current.x) {
      frame.current = requestAnimationFrame(tick.current)
    }
  }, [value, response, damping])

  return shown
}
