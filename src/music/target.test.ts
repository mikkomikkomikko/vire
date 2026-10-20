import { midiToFreq, noteToFreq, noteToMidi } from './notes'
import { createTargetTracker, resolveTarget, soundingFreq, type TargetConfig } from './target'
import { findTuning, type Tuning } from './tunings'

const standard = findTuning('guitar-standard')!
const ukulele = findTuning('ukulele-standard')!
const string = (tuning: Tuning, name: string) => tuning.strings.find((s) => s.name === name)!
const auto = (tuning: Tuning, capo = 0): TargetConfig => ({ tuning, capo, locked: null })
const centsOff = (freq: number, cents: number) => freq * 2 ** (cents / 1200)

describe('soundingFreq', () => {
  test('capo 2 turns E2 into F#2 (~92.50 Hz)', () => {
    expect(soundingFreq(string(standard, 'E2'), 2)).toBeCloseTo(92.5, 2)
    expect(soundingFreq(string(standard, 'E2'), 2)).toBeCloseTo(noteToFreq('F#2'), 6)
  })

  test('capo 0 is the open string', () => {
    expect(soundingFreq(string(standard, 'A2'), 0)).toBe(string(standard, 'A2').freq)
  })
})

describe('resolveTarget (auto)', () => {
  test.each(standard.strings.map((s) => s.name))('an in-tune %s targets itself', (name) => {
    const target = resolveTarget(noteToFreq(name), auto(standard))
    expect(target?.string.name).toBe(name)
    expect(target?.cents).toBeCloseTo(0, 6)
  })

  test('reports signed cents', () => {
    expect(resolveTarget(centsOff(noteToFreq('E2'), 12), auto(standard))?.cents).toBeCloseTo(12, 6)
    expect(resolveTarget(centsOff(noteToFreq('E2'), -6), auto(standard))?.cents).toBeCloseTo(-6, 6)
  })

  test('picks the nearest string', () => {
    // 40 cents above D3 is still closer to D3 than to G3.
    expect(resolveTarget(centsOff(noteToFreq('D3'), 40), auto(standard))?.string.name).toBe('D3')
    // A2 played 300 cents sharp (C3) is nearer to D3.
    expect(resolveTarget(noteToFreq('C3'), auto(standard))?.string.name).toBe('D3')
  })

  test('with a capo, the open-string name targets the transposed pitch', () => {
    const target = resolveTarget(noteToFreq('F#2'), auto(standard, 2))
    expect(target?.string.name).toBe('E2')
    expect(target?.cents).toBeCloseTo(0, 6)
  })

  test('rejects pitches more than 500 cents outside the tuning', () => {
    expect(resolveTarget(centsOff(noteToFreq('E2'), -499), auto(standard))).not.toBeNull()
    expect(resolveTarget(centsOff(noteToFreq('E2'), -501), auto(standard))).toBeNull()
    expect(resolveTarget(centsOff(noteToFreq('E4'), 501), auto(standard))).toBeNull()
  })

  test('re-entrant ukulele: G4 is matched even though it sits above C4 and E4', () => {
    expect(resolveTarget(noteToFreq('G4'), auto(ukulele))?.string.name).toBe('G4')
    expect(resolveTarget(noteToFreq('C4'), auto(ukulele))?.string.name).toBe('C4')
  })
})

describe('resolveTarget (locked)', () => {
  const lockedE2: TargetConfig = { tuning: standard, capo: 0, locked: string(standard, 'E2') }

  test('always targets the locked string, even when another string is nearer', () => {
    const target = resolveTarget(noteToFreq('A2'), lockedE2)
    expect(target?.string.name).toBe('E2')
    expect(target?.cents).toBeCloseTo(500, 6)
  })

  test('accepts up to ±900 cents and rejects beyond', () => {
    expect(resolveTarget(centsOff(noteToFreq('E2'), -900), lockedE2)).not.toBeNull()
    expect(resolveTarget(centsOff(noteToFreq('E2'), 901), lockedE2)).toBeNull()
    expect(resolveTarget(centsOff(noteToFreq('E2'), -901), lockedE2)).toBeNull()
  })

  test('applies the capo to the locked string', () => {
    const target = resolveTarget(noteToFreq('F#2'), { ...lockedE2, capo: 2 })
    expect(target?.cents).toBeCloseTo(0, 6)
  })
})

describe('createTargetTracker', () => {
  const G3 = noteToFreq('G3')
  const B3 = noteToFreq('B3')
  // Halfway between G3 and B3, nudged either side.
  const nearG3 = midiToFreq(noteToMidi('A3') - 0.1)
  const nearB3 = midiToFreq(noteToMidi('A3') + 0.1)

  test('adopts the first target immediately', () => {
    const tracker = createTargetTracker()
    expect(tracker.update(G3, 0, auto(standard))?.string.name).toBe('G3')
  })

  test('waits 150 ms before switching to a new nearest string', () => {
    const tracker = createTargetTracker()
    tracker.update(G3, 0, auto(standard))
    expect(tracker.update(B3, 10, auto(standard))?.string.name).toBe('G3')
    expect(tracker.update(B3, 100, auto(standard))?.string.name).toBe('G3')
    expect(tracker.update(B3, 160, auto(standard))?.string.name).toBe('B3')
  })

  test('does not flicker when the pitch wobbles between two strings', () => {
    const tracker = createTargetTracker()
    tracker.update(nearG3, 0, auto(standard))
    for (let t = 16; t < 1000; t += 16) {
      const freq = (t / 16) % 2 ? nearB3 : nearG3
      expect(tracker.update(freq, t, auto(standard))?.string.name).toBe('G3')
    }
  })

  test('reports cents against the held target while a switch is pending', () => {
    const tracker = createTargetTracker()
    tracker.update(G3, 0, auto(standard))
    expect(tracker.update(B3, 10, auto(standard))?.cents).toBeCloseTo(400, 6)
  })

  test('in-tune hysteresis on displayed (rounded) cents: enter at ≤2, stay until >4', () => {
    const tracker = createTargetTracker()
    const at = (cents: number, t: number) => tracker.update(centsOff(G3, cents), t, auto(standard))
    expect(at(3, 0)?.inTune).toBe(false)
    expect(at(2.6, 5)?.inTune).toBe(false)
    expect(at(2.4, 10)?.inTune).toBe(true)
    expect(at(4.4, 20)?.inTune).toBe(true)
    expect(at(-4.4, 30)?.inTune).toBe(true)
    expect(at(4.6, 40)?.inTune).toBe(false)
    expect(at(3, 50)?.inTune).toBe(false)
    expect(at(-2, 60)?.inTune).toBe(true)
  })

  test('changing tuning, capo or lock resets the held target', () => {
    const tracker = createTargetTracker()
    tracker.update(G3, 0, auto(standard))
    expect(tracker.update(B3, 10, auto(standard, 0))?.string.name).toBe('G3')
    expect(tracker.update(B3, 20, auto(standard, 1))?.string.name).toBe('B3')
  })

  test('reset() forgets the target', () => {
    const tracker = createTargetTracker()
    tracker.update(G3, 0, auto(standard))
    tracker.reset()
    expect(tracker.update(B3, 10, auto(standard))?.string.name).toBe('B3')
  })

  test('returns null for out-of-range pitches', () => {
    expect(createTargetTracker().update(30, 0, auto(standard))).toBeNull()
  })
})
