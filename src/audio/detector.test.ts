import { noteToFreq } from '../music/notes'
import { centsBetween } from '../music/notes'
import { mix, noise, SAMPLE_RATE, sawtooth, sine } from '../test/synth'
import { createDetector } from './detector'

const detect = createDetector()
const NOTES = ['C2', 'D2', 'E2', 'A2', 'G3', 'C4', 'G4', 'A4']

describe.each([
  ['sine', sine],
  ['sawtooth', sawtooth],
])('%s waves', (_name, wave) => {
  test.each(NOTES)('%s is detected within ±1 cent', (note) => {
    const freq = noteToFreq(note)
    const reading = detect(wave(freq), SAMPLE_RATE)
    expect(reading).not.toBeNull()
    expect(Math.abs(centsBetween(reading!.freq, freq))).toBeLessThan(1)
  })
})

test.each(NOTES)('%s with background noise is detected within ±1 cent', (note) => {
  const freq = noteToFreq(note)
  const reading = detect(mix(sawtooth(freq), noise(4096, 0.05)), SAMPLE_RATE)
  expect(reading).not.toBeNull()
  expect(Math.abs(centsBetween(reading!.freq, freq))).toBeLessThan(1)
})

test('works at 44.1 kHz too', () => {
  const freq = noteToFreq('E2')
  const reading = detect(sawtooth(freq, 4096, 0.5, 44100), 44100)
  expect(Math.abs(centsBetween(reading!.freq, freq))).toBeLessThan(1)
})

test('detuned strings report the actual pitch', () => {
  const freq = noteToFreq('E2') * 2 ** (12 / 1200)
  const reading = detect(sawtooth(freq), SAMPLE_RATE)
  expect(centsBetween(reading!.freq, noteToFreq('E2'))).toBeCloseTo(12, 0)
})

test('silence is rejected', () => {
  expect(detect(new Float32Array(4096), SAMPLE_RATE)).toBeNull()
})

test('quiet signals below the noise gate are rejected', () => {
  expect(detect(sine(110, 4096, 0.002), SAMPLE_RATE)).toBeNull()
})

test('a quiet but clear pluck, as a distant built-in mic hears it, is detected', () => {
  // RMS ≈ 0.004: well under the old 0.01 gate that made Safari on a Mac miss notes.
  const freq = noteToFreq('E2')
  const reading = detect(mix(sawtooth(freq, 4096, 0.006), noise(4096, 0.0006)), SAMPLE_RATE)
  expect(reading).not.toBeNull()
  expect(Math.abs(centsBetween(reading!.freq, freq))).toBeLessThan(1)
})

test('room noise at the measured floor is rejected', () => {
  expect(detect(noise(4096, 0.01), SAMPLE_RATE)).toBeNull()
})

test('white noise is rejected', () => {
  expect(detect(noise(), SAMPLE_RATE)).toBeNull()
})
