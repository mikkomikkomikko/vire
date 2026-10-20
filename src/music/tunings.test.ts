import { findTuning, standardTuning, TUNINGS, tuningsFor } from './tunings'

// Reference equal-temperament frequencies at A4 = 440 Hz.
const REFERENCE_HZ: Record<string, number> = {
  C2: 65.41,
  D2: 73.42,
  Eb2: 77.78,
  E2: 82.41,
  G2: 98.0,
  Ab2: 103.83,
  A2: 110.0,
  B2: 123.47,
  C3: 130.81,
  Db3: 138.59,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  Gb3: 185.0,
  'F#3': 185.0,
  G3: 196.0,
  'G#3': 207.65,
  A3: 220.0,
  Bb3: 233.08,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  Eb4: 311.13,
  E4: 329.63,
  'F#4': 369.99,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
}

test.each(TUNINGS.flatMap((t) => t.strings.map((s) => [t.id, s.name, s.freq] as const)))(
  '%s %s has the reference frequency',
  (_id, name, freq) => {
    expect(REFERENCE_HZ[name]).toBeDefined()
    expect(Math.abs(freq - REFERENCE_HZ[name])).toBeLessThan(0.01)
  },
)

test('tuning ids are unique', () => {
  expect(new Set(TUNINGS.map((t) => t.id)).size).toBe(TUNINGS.length)
})

test('string names are unique within a tuning, so they can identify a locked string', () => {
  for (const t of TUNINGS) {
    expect(new Set(t.strings.map((s) => s.name)).size).toBe(t.strings.length)
  }
})

test('guitar tunings have six strings, ukulele tunings four', () => {
  for (const t of tuningsFor('guitar')) expect(t.strings).toHaveLength(6)
  for (const t of tuningsFor('ukulele')) expect(t.strings).toHaveLength(4)
})

test('standard tunings', () => {
  expect(
    standardTuning('guitar')
      .strings.map((s) => s.name)
      .join(' '),
  ).toBe('E2 A2 D3 G3 B3 E4')
  expect(
    standardTuning('ukulele')
      .strings.map((s) => s.name)
      .join(' '),
  ).toBe('G4 C4 E4 A4')
})

test('findTuning', () => {
  expect(findTuning('guitar-drop-d')?.name).toBe('Drop D')
  expect(findTuning('nope')).toBeUndefined()
})
