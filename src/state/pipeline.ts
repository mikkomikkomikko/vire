import { createDetector } from '../audio/detector'
import { createSmoother } from '../audio/smoothing'
import { configKey, createTargetTracker, resolveTarget, type TargetConfig } from '../music/target'
import type { Reading, TunerState } from './tunerState'

type RunningState = Extract<TunerState, { status: 'idle' | 'active' }>

/** One audio frame in, one screen state out: detect → range check → smooth → track. */
export function createPipeline(detect = createDetector()) {
  const smooth = createSmoother()
  const tracker = createTargetTracker()
  // The final reading stays on screen through the silence that follows, until the next note.
  let last: Reading | null = null
  let lastKey = ''

  return function process(
    buffer: Float32Array,
    sampleRate: number,
    nowMs: number,
    config: TargetConfig,
  ): RunningState {
    const key = configKey(config)
    if (key !== lastKey) {
      // A result for another tuning, capo or lock no longer applies.
      lastKey = key
      last = null
    }

    const reading = detect(buffer, sampleRate)
    // Out-of-range pitches (voices, other instruments) count as silence.
    const freq = reading && resolveTarget(reading.freq, config) ? reading.freq : null
    const smoothed = smooth(freq, nowMs)

    const tracked = smoothed.freq === null ? null : tracker.update(smoothed.freq, nowMs, config)
    if (!tracked || smoothed.freq === null) {
      if (smoothed.idle) tracker.reset()
      return { status: 'idle', last }
    }

    last = {
      string: tracked.string,
      freq: smoothed.freq,
      cents: tracked.cents,
      inTune: tracked.inTune,
      settled: tracked.settled,
    }
    return { status: 'active', ...last }
  }
}

/** True when two readings would render identically. */
function sameReading(a: Reading | null, b: Reading | null): boolean {
  if (!a || !b) return a === b
  return (
    a.string === b.string &&
    a.inTune === b.inTune &&
    a.settled === b.settled &&
    Math.round(a.cents) === Math.round(b.cents) &&
    a.freq.toFixed(2) === b.freq.toFixed(2)
  )
}

/** True when two states would render identically, so React can skip the update. */
export function sameScreen(a: TunerState, b: TunerState): boolean {
  if (a.status !== b.status) return false
  if (a.status === 'idle' && b.status === 'idle') return sameReading(a.last, b.last)
  if (a.status === 'active' && b.status === 'active') return sameReading(a, b)
  return true
}
