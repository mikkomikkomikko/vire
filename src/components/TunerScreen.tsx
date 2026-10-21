import { soundingFreq } from '../music/target'
import type { TuningString } from '../music/tunings'
import type { TunerState } from '../state/tunerState'
import { BottomBar } from './BottomBar'
import { CentsDisplay } from './CentsDisplay'
import { InTuneMark } from './InTuneMark'
import { StartPrompt } from './StartPrompt'
import styles from './TunerScreen.module.css'
import { useThemeColor } from './useThemeColor'

// Same values as --color-bg / --color-bg-in-tune in tokens.css.
const BG = '#F5F6F5'
const BG_IN_TUNE = '#CFECDE'

type Props = {
  state: TunerState
  locked: TuningString | null
  tuning: string
  capo: number
  onStart: () => void
  onOpenSettings: () => void
  onOpenPrivacy: () => void
}

export function TunerScreen({ state, locked, tuning, capo, onStart, onOpenSettings, onOpenPrivacy }: Props) {
  // While idle, the last reading stays frozen on screen until the next note.
  const reading = state.status === 'active' ? state : state.status === 'idle' ? state.last : null
  const green = !!reading && (reading.inTune || reading.settled)
  // A locked string is always the target, so show it even before anything is played.
  const target = reading?.string ?? locked
  // The pitch to tune to (capo included); the measured pitch is already shown as cents.
  const targetFreq = target ? soundingFreq(target, capo) : null
  useThemeColor(green ? BG_IN_TUNE : BG)
  const prompt = state.status === 'start' || state.status === 'denied'

  return (
    <main className={`${styles.screen} ${green ? styles.inTune : ''}`}>
      <div className={styles.centre}>
        {/* Green from ±2 cents; the check only once the reading has held within ±1 for 2 s. */}
        {reading && (reading.settled ? <InTuneMark /> : <CentsDisplay cents={reading.cents} />)}
      </div>
      {state.status === 'start' && (
        <StartPrompt
          reason={state.resume ? 'resume' : 'start'}
          onStart={onStart}
          onPrivacy={onOpenPrivacy}
        />
      )}
      {state.status === 'denied' && (
        <StartPrompt reason="denied" onStart={onStart} onPrivacy={onOpenPrivacy} />
      )}
      {/* The prompt has the screen to itself; the note and tuning come back once it's gone. */}
      {!prompt && (
        <BottomBar
          note={target?.name ?? null}
          freq={targetFreq}
          locked={locked !== null}
          tuning={tuning}
          capo={capo}
          dimmed={!reading}
          onOpenSettings={onOpenSettings}
        />
      )}
    </main>
  )
}
