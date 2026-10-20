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
}

export function TunerScreen({ state, locked, tuning, capo, onStart, onOpenSettings }: Props) {
  const active = state.status === 'active' ? state : null
  const lastString = state.status === 'idle' ? state.lastString : null
  // A locked string is always the target, so show it even before anything is played.
  const target = active?.string ?? locked ?? lastString
  // The pitch to tune to (capo included); the measured pitch is already shown as cents.
  const targetFreq = target ? soundingFreq(target, capo) : null
  useThemeColor(active?.inTune ? BG_IN_TUNE : BG)

  return (
    <main className={`${styles.screen} ${active?.inTune ? styles.inTune : ''}`}>
      <div className={styles.centre}>
        {active && (active.inTune ? <InTuneMark /> : <CentsDisplay cents={active.cents} />)}
      </div>
      {state.status === 'start' && (
        <StartPrompt reason={state.resume ? 'resume' : 'start'} onStart={onStart} />
      )}
      {state.status === 'denied' && <StartPrompt reason="denied" onStart={onStart} />}
      <BottomBar
        note={target?.name ?? null}
        freq={targetFreq}
        locked={locked !== null}
        tuning={tuning}
        capo={capo}
        dimmed={!active}
        onOpenSettings={onOpenSettings}
      />
    </main>
  )
}
