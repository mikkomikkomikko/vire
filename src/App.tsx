import { openMic } from './audio/input'
import { TunerScreen } from './components/TunerScreen'
import { mockState } from './dev/mockState'
import { openTone } from './dev/tone'
import { currentTuning, lockedTuningString, tuningLabel } from './state/settings'
import { useSettings } from './state/useSettings'
import { useTuner } from './state/useTuner'

// Dev only: `?mock=sharp` fixes the screen state; `?tone=82.41` replaces the mic with a test tone.
const params = new URLSearchParams(window.location.search)
const mock = import.meta.env.DEV ? mockState(window.location.search) : null
const tone = import.meta.env.DEV ? Number(params.get('tone')) : 0
const openInput = tone > 0 ? () => openTone(tone) : openMic

export function App() {
  const [settings] = useSettings()
  const { state, start } = useTuner(
    { tuning: currentTuning(settings), capo: settings.capo, locked: lockedTuningString(settings) },
    openInput,
  )

  return (
    <>
      <TunerScreen
        state={mock ?? state}
        locked={settings.lockedString}
        label={tuningLabel(settings)}
        onStart={() => void start()}
        onOpenSettings={() => {}}
      />
      {tone > 0 && <div className="dev-badge">Test tone {tone} Hz · not the mic</div>}
    </>
  )
}
