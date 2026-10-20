import type { TunerState } from '../state/tunerState'
import { BottomBar } from './BottomBar'
import { CentsDisplay } from './CentsDisplay'
import { InTuneMark } from './InTuneMark'
import { StartPrompt } from './StartPrompt'
import styles from './TunerScreen.module.css'

type Props = {
  state: TunerState
  locked: string | null
  tuning: string
  capo: number
  onStart: () => void
  onOpenSettings: () => void
}

export function TunerScreen({ state, locked, tuning, capo, onStart, onOpenSettings }: Props) {
  const active = state.status === 'active' ? state : null
  const lastString = state.status === 'idle' ? state.lastString : null
  // A locked string is always the target, so show it even before anything is played.
  const note = active?.string.name ?? locked ?? lastString?.name ?? null

  return (
    <main className={`${styles.screen} ${active?.inTune ? styles.inTune : ''}`}>
      <div className={styles.centre}>
        {active && (active.inTune ? <InTuneMark /> : <CentsDisplay cents={active.cents} />)}
      </div>
      {(state.status === 'start' || state.status === 'denied') && (
        <StartPrompt reason={state.status} onStart={onStart} />
      )}
      <BottomBar
        note={note}
        freq={active?.freq ?? null}
        locked={locked !== null}
        tuning={tuning}
        capo={capo}
        dimmed={!active}
        onOpenSettings={onOpenSettings}
      />
    </main>
  )
}
