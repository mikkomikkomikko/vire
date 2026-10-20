import { createDetector } from '../audio/detector'
import { createSmoother } from '../audio/smoothing'
import { createTargetTracker, resolveTarget, type TargetConfig } from '../music/target'
import type { TuningString } from '../music/tunings'
import type { TunerState } from './tunerState'

type RunningState = Extract<TunerState, { status: 'idle' | 'active' }>

/** One audio frame in, one screen state out: detect → range check → smooth → track. */
export function createPipeline(detect = createDetector()) {
  const smooth = createSmoother()
  const tracker = createTargetTracker()
  let lastString: TuningString | null = null

  return function process(
    buffer: Float32Array,
    sampleRate: number,
    nowMs: number,
    config: TargetConfig,
  ): RunningState {
    const reading = detect(buffer, sampleRate)
    // Out-of-range pitches (voices, other instruments) count as silence.
    const freq = reading && resolveTarget(reading.freq, config) ? reading.freq : null
    const smoothed = smooth(freq, nowMs)

    const tracked = smoothed.freq === null ? null : tracker.update(smoothed.freq, nowMs, config)
    if (!tracked || smoothed.freq === null) {
      if (smoothed.idle) tracker.reset()
      return { status: 'idle', lastString }
    }

    lastString = tracked.string
    return {
      status: 'active',
      string: tracked.string,
      freq: smoothed.freq,
      cents: tracked.cents,
      inTune: tracked.inTune,
      settled: tracked.settled,
    }
  }
}

/** True when two states would render identically, so React can skip the update. */
export function sameScreen(a: TunerState, b: TunerState): boolean {
  if (a.status !== b.status) return false
  if (a.status === 'idle' && b.status === 'idle') return a.lastString === b.lastString
  if (a.status === 'active' && b.status === 'active') {
    return (
      a.string === b.string &&
      a.inTune === b.inTune &&
      a.settled === b.settled &&
      Math.round(a.cents) === Math.round(b.cents) &&
      a.freq.toFixed(2) === b.freq.toFixed(2)
    )
  }
  return true
}
