import { useState } from 'react'
import { openMic } from './audio/input'
import { diagnostics } from './audio/diagnostics'
import { PrivacySheet } from './components/PrivacySheet'
import { DebugOverlay } from './components/DebugOverlay'
import { SettingsSheet } from './components/SettingsSheet'
import { TunerScreen } from './components/TunerScreen'
import { mockState } from './dev/mockState'
import { openTone } from './dev/tone'
import { currentTuning, lockedTuningString, tuningName, withLockedString } from './state/settings'
import { useSettings } from './state/useSettings'
import { useTuner } from './state/useTuner'

// Dev only: `?mock=sharp` fixes the screen state; `?tone=82.41` replaces the mic with a test tone.
const params = new URLSearchParams(window.location.search)
const mock = import.meta.env.DEV ? mockState(window.location.search) : null
const tone = import.meta.env.DEV ? Number(params.get('tone')) : 0
const openInput = tone > 0 ? () => openTone(tone) : openMic

export function App() {
  const [settings, updateSettings] = useSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const { state, start } = useTuner(
    { tuning: currentTuning(settings), capo: settings.capo, locked: lockedTuningString(settings) },
    openInput,
  )

  return (
    <>
      <TunerScreen
        state={mock ?? state}
        strings={currentTuning(settings).strings}
        locked={lockedTuningString(settings)}
        tuning={tuningName(settings)}
        capo={settings.capo}
        onLock={(name) => updateSettings((s) => withLockedString(s, name))}
        onStart={() => void start()}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenPrivacy={() => setPrivacyOpen(true)}
      />
      <SettingsSheet
        open={settingsOpen}
        settings={settings}
        onChange={updateSettings}
        onClose={() => setSettingsOpen(false)}
      />
      <PrivacySheet open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      {diagnostics.enabled && <DebugOverlay />}
      {tone > 0 && <div className="dev-badge">Test tone {tone} Hz · not the mic</div>}
    </>
  )
}
