import type { TunerState } from '../state/tunerState'
import { BottomBar } from './BottomBar'
import { CentsDisplay } from './CentsDisplay'
import { InTuneMark } from './InTuneMark'
import styles from './TunerScreen.module.css'

type Props = {
  state: TunerState
  locked: string | null
  label: string
  onOpenSettings: () => void
}

export function TunerScreen({ state, locked, label, onOpenSettings }: Props) {
  const active = state.status === 'active' ? state : null
  const lastString = state.status === 'idle' ? state.lastString : null
  // A locked string is always the target, so show it even before anything is played.
  const note = active?.string.name ?? locked ?? lastString?.name ?? null

  return (
    <main className={`${styles.screen} ${active?.inTune ? styles.inTune : ''}`}>
      <div className={styles.centre}>
        {active && (active.inTune ? <InTuneMark /> : <CentsDisplay cents={active.cents} />)}
      </div>
      <BottomBar
        note={note}
        freq={active?.freq ?? null}
        locked={locked !== null}
        label={label}
        dimmed={!active}
        onOpenSettings={onOpenSettings}
      />
    </main>
  )
}
