import { findTuning, INSTRUMENTS, standardTuning } from '../music/tunings'
import type { Instrument, Tuning, TuningString } from '../music/tunings'

export const STORAGE_KEY = 'vire.settings.v1'
export const MAX_CAPO = 7

export type Settings = {
  instrument: Instrument
  tuningId: string
  /** Name of the locked string (e.g. `E2`), or null for auto mode. */
  lockedString: string | null
  capo: number
}

export const DEFAULT_SETTINGS: Settings = {
  instrument: 'guitar',
  tuningId: standardTuning('guitar').id,
  lockedString: null,
  capo: 0,
}

export function currentTuning(settings: Settings): Tuning {
  return findTuning(settings.tuningId) ?? standardTuning(settings.instrument)
}

export function lockedTuningString(settings: Settings): TuningString | null {
  if (!settings.lockedString) return null
  return currentTuning(settings).strings.find((s) => s.name === settings.lockedString) ?? null
}

/** Bottom-right label: "Standard", "Drop D · Capo 2", "Ukulele Standard". */
export function tuningLabel(settings: Settings): string {
  const tuning = currentTuning(settings)
  const name = tuning.instrument === 'ukulele' ? `Ukulele ${tuning.name}` : tuning.name
  return settings.capo > 0 ? `${name} · Capo ${settings.capo}` : name
}

export function withInstrument(settings: Settings, instrument: Instrument): Settings {
  if (instrument === settings.instrument) return settings
  return { ...settings, instrument, tuningId: standardTuning(instrument).id, lockedString: null }
}

export function withTuning(settings: Settings, tuningId: string): Settings {
  const tuning = findTuning(tuningId)
  if (!tuning || tuning.instrument !== settings.instrument) return settings
  if (tuningId === settings.tuningId) return settings
  return { ...settings, tuningId, lockedString: null }
}

export function withLockedString(settings: Settings, name: string | null): Settings {
  if (name !== null && !currentTuning(settings).strings.some((s) => s.name === name)) {
    return settings
  }
  return { ...settings, lockedString: name }
}

export function withCapo(settings: Settings, capo: number): Settings {
  return { ...settings, capo: clampCapo(capo) }
}

function clampCapo(capo: number): number {
  return Math.min(MAX_CAPO, Math.max(0, Math.round(capo)))
}

/** Repairs anything that came out of storage; invalid parts fall back to defaults. */
export function parseSettings(value: unknown): Settings {
  if (typeof value !== 'object' || value === null) return DEFAULT_SETTINGS
  const raw = value as Record<string, unknown>

  const instrument = INSTRUMENTS.find((i) => i === raw.instrument)
  if (!instrument) return DEFAULT_SETTINGS

  let settings = withInstrument(DEFAULT_SETTINGS, instrument)
  if (typeof raw.tuningId === 'string') settings = withTuning(settings, raw.tuningId)
  if (typeof raw.lockedString === 'string') settings = withLockedString(settings, raw.lockedString)
  if (typeof raw.capo === 'number' && Number.isFinite(raw.capo)) {
    settings = withCapo(settings, raw.capo)
  }
  return settings
}

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function loadSettings(): Settings {
  try {
    const json = storage()?.getItem(STORAGE_KEY)
    return json ? parseSettings(JSON.parse(json)) : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Private mode or full storage: settings just won't persist.
  }
}
