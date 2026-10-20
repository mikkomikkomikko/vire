import { useCallback, useState } from 'react'
import { loadSettings, saveSettings, type Settings } from './settings'

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  const update = useCallback((change: (current: Settings) => Settings) => {
    setSettings((current) => {
      const next = change(current)
      if (next !== current) saveSettings(next)
      return next
    })
  }, [])

  return [settings, update] as const
}
