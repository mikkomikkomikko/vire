import type { TuningString } from '../music/tunings'

/** Everything the main screen needs to render; produced by `useTuner` (or a dev mock). */
export type TunerState =
  /** `resume`: the mic is open but the browser paused audio; one more tap restarts it. */
  | { status: 'start'; resume?: boolean }
  | { status: 'denied' }
  | { status: 'idle'; lastString: TuningString | null }
  | { status: 'active'; string: TuningString; freq: number; cents: number; inTune: boolean }
