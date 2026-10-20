import { TunerScreen } from './components/TunerScreen'
import { mockState } from './dev/mockState'
import { tuningLabel } from './state/settings'
import type { TunerState } from './state/tunerState'
import { useSettings } from './state/useSettings'

const mock = import.meta.env.DEV ? mockState(window.location.search) : null

export function App() {
  const [settings] = useSettings()
  // Audio is wired up in Phase 4; until then only dev mocks drive the screen.
  const state: TunerState = mock ?? { status: 'idle', lastString: null }

  return (
    <TunerScreen
      state={state}
      locked={settings.lockedString}
      label={tuningLabel(settings)}
      onOpenSettings={() => {}}
    />
  )
}
