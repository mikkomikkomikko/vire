import type { TuningString } from '../music/tunings'

/** Everything the main screen needs to render; produced by `useTuner` (or a dev mock). */
export type TunerState =
  /** `resume`: the mic is open but the browser paused audio; one more tap restarts it. */
  | { status: 'start'; resume?: boolean }
  | { status: 'denied' }
  /** `settled`: the last string reached the check; keep showing it until the next signal. */
  | { status: 'idle'; lastString: TuningString | null; settled?: boolean }
  | {
      status: 'active'
      string: TuningString
      freq: number
      cents: number
      /** Within ±2 cents: green background. */
      inTune: boolean
      /** Held within ±1 cent for 2 s: show the check mark. */
      settled: boolean
    }
