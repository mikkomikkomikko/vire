import { act, renderHook } from '@testing-library/react'
import {
  DEFAULT_SETTINGS,
  loadSettings,
  lockedTuningString,
  parseSettings,
  saveSettings,
  STORAGE_KEY,
  tuningLabel,
  withCapo,
  withInstrument,
  withLockedString,
  withTuning,
  type Settings,
} from './settings'
import { useSettings } from './useSettings'

const dropD: Settings = {
  instrument: 'guitar',
  tuningId: 'guitar-drop-d',
  lockedString: 'D2',
  capo: 2,
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('defaults', () => {
  test('guitar, standard, auto, no capo', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      instrument: 'guitar',
      tuningId: 'guitar-standard',
      lockedString: null,
      capo: 0,
    })
  })
})

describe('reset rules', () => {
  test('changing instrument resets tuning to its standard and string to auto, keeps capo', () => {
    expect(withInstrument(dropD, 'ukulele')).toEqual({
      instrument: 'ukulele',
      tuningId: 'ukulele-standard',
      lockedString: null,
      capo: 2,
    })
  })

  test('choosing the same instrument changes nothing', () => {
    expect(withInstrument(dropD, 'guitar')).toBe(dropD)
  })

  test('changing tuning resets string to auto, keeps capo', () => {
    expect(withTuning(dropD, 'guitar-dadgad')).toEqual({
      ...dropD,
      tuningId: 'guitar-dadgad',
      lockedString: null,
    })
  })

  test('a tuning from another instrument is ignored', () => {
    expect(withTuning(dropD, 'ukulele-standard')).toBe(dropD)
  })

  test('locking only accepts strings of the current tuning', () => {
    expect(withLockedString(dropD, 'E4').lockedString).toBe('E4')
    expect(withLockedString(dropD, 'E2')).toBe(dropD)
    expect(withLockedString(dropD, null).lockedString).toBeNull()
  })

  test('capo is clamped to 0–7 whole frets', () => {
    expect(withCapo(dropD, 9).capo).toBe(7)
    expect(withCapo(dropD, -1).capo).toBe(0)
    expect(withCapo(dropD, 3.4).capo).toBe(3)
  })
})

describe('derived values', () => {
  test('lockedTuningString', () => {
    expect(lockedTuningString(dropD)?.name).toBe('D2')
    expect(lockedTuningString(DEFAULT_SETTINGS)).toBeNull()
  })

  test.each([
    [DEFAULT_SETTINGS, 'Standard'],
    [dropD, 'Drop D · Capo 2'],
    [withInstrument(DEFAULT_SETTINGS, 'ukulele'), 'Ukulele Standard'],
    [withTuning(withInstrument(DEFAULT_SETTINGS, 'ukulele'), 'ukulele-low-g'), 'Ukulele Low G'],
  ])('tuningLabel %#', (settings, label) => {
    expect(tuningLabel(settings)).toBe(label)
  })
})

describe('parseSettings', () => {
  test('round-trips valid settings', () => {
    expect(parseSettings(JSON.parse(JSON.stringify(dropD)))).toEqual(dropD)
  })

  test.each([null, 'x', 42, [], {}, { instrument: 'banjo' }])('invalid %j → defaults', (value) => {
    expect(parseSettings(value)).toEqual(DEFAULT_SETTINGS)
  })

  test('repairs individual bad fields', () => {
    expect(
      parseSettings({
        instrument: 'ukulele',
        tuningId: 'guitar-drop-d',
        lockedString: 'E2',
        capo: 'two',
      }),
    ).toEqual({ instrument: 'ukulele', tuningId: 'ukulele-standard', lockedString: null, capo: 0 })
    expect(parseSettings({ ...dropD, lockedString: 'Z9', capo: 99 })).toEqual({
      ...dropD,
      lockedString: null,
      capo: 7,
    })
  })
})

describe('storage', () => {
  test('save then load', () => {
    saveSettings(dropD)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(dropD)
    expect(loadSettings()).toEqual(dropD)
  })

  test('missing or corrupt storage → defaults', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  test('throwing storage never breaks the app', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
    expect(() => saveSettings(dropD)).not.toThrow()
  })
})

describe('useSettings', () => {
  test('loads stored settings and persists updates', () => {
    saveSettings(dropD)
    const { result } = renderHook(() => useSettings())
    expect(result.current[0]).toEqual(dropD)

    act(() => result.current[1]((s) => withCapo(s, 4)))
    expect(result.current[0].capo).toBe(4)
    expect(loadSettings().capo).toBe(4)
  })
})
