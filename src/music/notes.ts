export const A4_HZ = 440
const A4_MIDI = 69

const PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const NOTE_PATTERN = /^([A-G])([#b]?)(-?\d)$/

/** Parses scientific pitch notation like `E2`, `F#3` or `Eb4` into a MIDI note number. */
export function noteToMidi(name: string): number {
  const match = NOTE_PATTERN.exec(name)
  if (!match) throw new Error(`Invalid note name: ${name}`)
  const [, letter, accidental, octave] = match
  const offset = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0
  return (Number(octave) + 1) * 12 + PITCH_CLASS[letter] + offset
}

export function midiToFreq(midi: number): number {
  return A4_HZ * 2 ** ((midi - A4_MIDI) / 12)
}

export function noteToFreq(name: string): number {
  return midiToFreq(noteToMidi(name))
}

/** Signed distance from `ref` to `freq` in cents; positive means `freq` is sharp. */
export function centsBetween(freq: number, ref: number): number {
  return 1200 * Math.log2(freq / ref)
}
