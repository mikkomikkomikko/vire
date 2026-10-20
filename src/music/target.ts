import { centsBetween } from './notes'
import type { Tuning, TuningString } from './tunings'

export const AUTO_RANGE_CENTS = 500
export const LOCKED_RANGE_CENTS = 900
// ±2 is about what a good clip-on tuner shows as in tune; ±5 (the first choice) hid every
// reading under 6 cents in device testing. The wider exit keeps a ringing string from flickering.
export const IN_TUNE_ENTER_CENTS = 2
export const IN_TUNE_EXIT_CENTS = 4
export const AUTO_SWITCH_MS = 150
/** The check mark needs the reading to hold within ±1 cent for this long. */
export const SETTLE_CENTS = 1
export const SETTLE_MS = 2000

export type Target = { string: TuningString; cents: number }

export type TargetConfig = {
  tuning: Tuning
  capo: number
  /** When set, only this string is ever targeted. */
  locked: TuningString | null
}

export type TrackedTarget = Target & {
  inTune: boolean
  /** Held within ±SETTLE_CENTS for SETTLE_MS: the string is done. */
  settled: boolean
}

/** The pitch an open string actually sounds with a capo on `capo`. */
export function soundingFreq(string: TuningString, capo: number): number {
  return string.freq * 2 ** (capo / 12)
}

/** Nearest string to `freq`, or null when the pitch is too far from any candidate. */
export function resolveTarget(freq: number, { tuning, capo, locked }: TargetConfig): Target | null {
  const candidates = locked ? [locked] : tuning.strings
  let best: Target | null = null
  for (const string of candidates) {
    const cents = centsBetween(freq, soundingFreq(string, capo))
    if (!best || Math.abs(cents) < Math.abs(best.cents)) best = { string, cents }
  }
  const range = locked ? LOCKED_RANGE_CENTS : AUTO_RANGE_CENTS
  return best && Math.abs(best.cents) <= range ? best : null
}

export function configKey({ tuning, capo, locked }: TargetConfig): string {
  return `${tuning.id}|${capo}|${locked?.name ?? ''}`
}

/**
 * Adds hysteresis on top of `resolveTarget`: in auto mode a new string must stay nearest for
 * AUTO_SWITCH_MS before it becomes the target, and the in-tune state uses separate enter/exit
 * thresholds so the screen doesn't flicker at the boundary.
 */
export function createTargetTracker() {
  let key = ''
  let current: TuningString | null = null
  let candidate: TuningString | null = null
  let candidateSince = 0
  let inTune = false
  let settledSince: number | null = null

  function reset() {
    current = null
    candidate = null
    inTune = false
    settledSince = null
  }

  function update(freq: number, nowMs: number, config: TargetConfig): TrackedTarget | null {
    const nextKey = configKey(config)
    if (nextKey !== key) {
      key = nextKey
      reset()
    }

    const nearest = resolveTarget(freq, config)
    if (!nearest) return null

    if (!current) {
      current = nearest.string
      candidate = null
    } else if (nearest.string === current) {
      candidate = null
    } else if (nearest.string !== candidate) {
      candidate = nearest.string
      candidateSince = nowMs
    } else if (nowMs - candidateSince >= AUTO_SWITCH_MS) {
      current = candidate
      candidate = null
      inTune = false
      settledSince = null
    }

    const cents = centsBetween(freq, soundingFreq(current, config.capo))
    // Decide on the rounded value so the state always agrees with the number on screen.
    inTune = Math.abs(Math.round(cents)) <= (inTune ? IN_TUNE_EXIT_CENTS : IN_TUNE_ENTER_CENTS)
    if (Math.abs(Math.round(cents)) <= SETTLE_CENTS) settledSince ??= nowMs
    else settledSince = null
    const settled = settledSince !== null && nowMs - settledSince >= SETTLE_MS
    return { string: current, cents, inTune, settled }
  }

  return { update, reset }
}
