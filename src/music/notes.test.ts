import { centsBetween, midiToFreq, noteToFreq, noteToMidi } from './notes'

describe('noteToMidi', () => {
  test.each([
    ['C4', 60],
    ['A4', 69],
    ['E2', 40],
    ['F#3', 54],
    ['Eb2', 39],
    ['C-1', 0],
  ])('%s → %i', (name, midi) => {
    expect(noteToMidi(name)).toBe(midi)
  })

  test.each(['H2', 'E', 'e2', 'E#', 'Ebb2', ''])('rejects %j', (name) => {
    expect(() => noteToMidi(name)).toThrow()
  })
})

describe('frequencies', () => {
  test.each([
    ['A4', 440],
    ['E2', 82.41],
    ['Eb2', 77.78],
    ['C2', 65.41],
    ['G4', 392.0],
    ['F#2', 92.5],
  ])('%s ≈ %f Hz', (name, hz) => {
    expect(noteToFreq(name)).toBeCloseTo(hz, 2)
  })

  test('midiToFreq doubles per octave', () => {
    expect(midiToFreq(81) / midiToFreq(69)).toBeCloseTo(2, 10)
  })
})

describe('centsBetween', () => {
  test('is zero at the reference', () => {
    expect(centsBetween(440, 440)).toBe(0)
  })

  test('one semitone is 100 cents, sign follows direction', () => {
    expect(centsBetween(noteToFreq('A#4'), 440)).toBeCloseTo(100, 6)
    expect(centsBetween(noteToFreq('Ab4'), 440)).toBeCloseTo(-100, 6)
  })

  test('an octave is 1200 cents', () => {
    expect(centsBetween(880, 440)).toBeCloseTo(1200, 6)
  })
})
