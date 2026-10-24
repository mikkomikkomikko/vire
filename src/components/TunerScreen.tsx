import { useState } from 'react'
import type { TuningString } from '../music/tunings'
import type { TunerState } from '../state/tunerState'
import { BottomBar } from './BottomBar'
import { CentsDisplay } from './CentsDisplay'
import { StartPrompt } from './StartPrompt'
import { TopBar } from './TopBar'
import styles from './TunerScreen.module.css'
import { useThemeColor } from './useThemeColor'

// Same values as --color-bg / --color-bg-in-tune in tokens.css.
const BG = '#F5F6F5'
const BG_IN_TUNE = '#B0E1CA'

type Props = {
  state: TunerState
  strings: readonly TuningString[]
  locked: TuningString | null
  tuning: string
  capo: number
  onLock: (name: string | null) => void
  onStart: () => void
  onOpenSettings: () => void
  onOpenPrivacy: () => void
}

export function TunerScreen({
  state,
  strings,
  locked,
  tuning,
  capo,
  onLock,
  onStart,
  onOpenSettings,
  onOpenPrivacy,
}: Props) {
  // While idle, the last reading stays frozen on screen until the next note.
  const reading = state.status === 'active' ? state : state.status === 'idle' ? state.last : null
  // Set by the number once it has shown 0 for a couple of seconds.
  const [inTune, setInTune] = useState(false)
  const green = !!reading && inTune
  useThemeColor(green ? BG_IN_TUNE : BG)
  const prompt = state.status === 'start' || state.status === 'denied'

  return (
    <main className={`${styles.screen} ${green ? styles.inTune : ''}`}>
      <div className={styles.centre}>
        {/* In tune is shown by the green background alone; the number and band stay on it. */}
        {reading && <CentsDisplay cents={reading.cents} onInTune={setInTune} />}
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
      {/* The prompt has the screen to itself; the strings and tuning come back once it's gone. */}
      {!prompt && (
        <>
          <TopBar tuning={tuning} capo={capo} onOpenSettings={onOpenSettings} />
          <BottomBar
            strings={strings}
            locked={locked?.name ?? null}
            detected={reading?.string.name ?? null}
            onLock={onLock}
          />
        </>
      )}
    </main>
  )
}
