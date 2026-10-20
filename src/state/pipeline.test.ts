import { noteToFreq } from '../music/notes'
import type { TargetConfig } from '../music/target'
import { findTuning } from '../music/tunings'
import { noise, SAMPLE_RATE, sawtooth } from '../test/synth'
import { createPipeline, sameScreen } from './pipeline'

const standard = findTuning('guitar-standard')!
const config: TargetConfig = { tuning: standard, capo: 0, locked: null }
const centsOff = (freq: number, cents: number) => freq * 2 ** (cents / 1200)

test('a detuned E2 becomes an active +12 cents reading on E2', () => {
  const process = createPipeline()
  const state = process(sawtooth(centsOff(noteToFreq('E2'), 12)), SAMPLE_RATE, 0, config)
  expect(state.status).toBe('active')
  if (state.status !== 'active') return
  expect(state.string.name).toBe('E2')
  expect(state.cents).toBeCloseTo(12, 0)
  expect(state.freq).toBeCloseTo(82.98, 1)
  expect(state.inTune).toBe(false)
})

test('an in-tune string is reported in tune', () => {
  const state = createPipeline()(sawtooth(noteToFreq('G3')), SAMPLE_RATE, 0, config)
  expect(state).toMatchObject({ status: 'active', inTune: true })
})

test('with capo 2, F#2 is E2 in tune', () => {
  const state = createPipeline()(sawtooth(noteToFreq('F#2')), SAMPLE_RATE, 0, {
    ...config,
    capo: 2,
  })
  expect(state).toMatchObject({ status: 'active', inTune: true, string: { name: 'E2' } })
})

test('silence starts idle with no last string', () => {
  expect(createPipeline()(new Float32Array(4096), SAMPLE_RATE, 0, config)).toEqual({
    status: 'idle',
    lastString: null,
  })
})

test('holds the reading through a short gap, then goes idle remembering the string', () => {
  const process = createPipeline()
  process(sawtooth(noteToFreq('A2')), SAMPLE_RATE, 0, config)
  expect(process(noise(4096, 0.001), SAMPLE_RATE, 500, config).status).toBe('active')
  const idle = process(noise(4096, 0.001), SAMPLE_RATE, 2000, config)
  expect(idle.status).toBe('idle')
  expect(idle.status === 'idle' && idle.lastString?.name).toBe('A2')
})

test('locked mode ignores a pitch far from the locked string', () => {
  const locked = { ...config, locked: standard.strings[0] }
  // E4 is 2400 cents above E2: outside the ±900 cent window.
  expect(createPipeline()(sawtooth(noteToFreq('E4')), SAMPLE_RATE, 0, locked).status).toBe('idle')
})

describe('sameScreen', () => {
  const E2 = standard.strings[0]
  const base = {
    status: 'active' as const,
    string: E2,
    freq: 82.98,
    cents: 12.2,
    inTune: false,
    settled: false,
  }

  test('ignores changes that do not show on screen', () => {
    expect(sameScreen(base, { ...base, cents: 11.8, freq: 82.981 })).toBe(true)
  })

  test('notices changes that do', () => {
    expect(sameScreen(base, { ...base, cents: 13 })).toBe(false)
    expect(sameScreen(base, { ...base, freq: 83.0 })).toBe(false)
    expect(sameScreen(base, { ...base, inTune: true })).toBe(false)
    expect(sameScreen(base, { ...base, settled: true })).toBe(false)
    expect(sameScreen(base, { status: 'idle', lastString: E2 })).toBe(false)
  })
})
