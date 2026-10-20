import type { TuningString } from '../music/tunings'

/** One measurement of a string, as the screen shows it. */
export type Reading = {
  string: TuningString
  freq: number
  cents: number
  /** Within ±2 cents: green background. */
  inTune: boolean
  /** Held within ±1 cent for 2 s: show the check mark. */
  settled: boolean
}

/** Everything the main screen needs to render; produced by `useTuner` (or a dev mock). */
export type TunerState =
  /** `resume`: the mic is open but the browser paused audio; one more tap restarts it. */
  | { status: 'start'; resume?: boolean }
  | { status: 'denied' }
  /** No signal. `last` is the final reading, kept on screen until the next note. */
  | { status: 'idle'; last: Reading | null }
  | ({ status: 'active' } & Reading)
