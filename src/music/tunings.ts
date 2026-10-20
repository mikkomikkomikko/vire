import { noteToFreq } from './notes'

export type Instrument = 'guitar' | 'ukulele'

export type TuningString = { name: string; freq: number }

export type Tuning = {
  id: string
  instrument: Instrument
  name: string
  /** Physical order, low string first (ukulele G4 comes first even though C4 is lower). */
  strings: readonly TuningString[]
}

function tuning(id: string, instrument: Instrument, name: string, notes: string): Tuning {
  const strings = notes.split(' ').map((note) => ({ name: note, freq: noteToFreq(note) }))
  return { id, instrument, name, strings }
}

export const TUNINGS: readonly Tuning[] = [
  tuning('guitar-standard', 'guitar', 'Standard', 'E2 A2 D3 G3 B3 E4'),
  tuning('guitar-drop-d', 'guitar', 'Drop D', 'D2 A2 D3 G3 B3 E4'),
  tuning('guitar-half-step-down', 'guitar', 'Half Step Down', 'Eb2 Ab2 Db3 Gb3 Bb3 Eb4'),
  tuning('guitar-drop-c', 'guitar', 'Drop C', 'C2 G2 C3 F3 A3 D4'),
  tuning('guitar-dadgad', 'guitar', 'DADGAD', 'D2 A2 D3 G3 A3 D4'),
  tuning('guitar-open-g', 'guitar', 'Open G', 'D2 G2 D3 G3 B3 D4'),
  tuning('guitar-open-d', 'guitar', 'Open D', 'D2 A2 D3 F#3 A3 D4'),
  tuning('guitar-open-e', 'guitar', 'Open E', 'E2 B2 E3 G#3 B3 E4'),
  tuning('ukulele-standard', 'ukulele', 'Standard', 'G4 C4 E4 A4'),
  tuning('ukulele-low-g', 'ukulele', 'Low G', 'G3 C4 E4 A4'),
  tuning('ukulele-d', 'ukulele', 'D Tuning', 'A4 D4 F#4 B4'),
  tuning('ukulele-baritone', 'ukulele', 'Baritone', 'D3 G3 B3 E4'),
]

export const INSTRUMENTS: readonly Instrument[] = ['guitar', 'ukulele']

export function tuningsFor(instrument: Instrument): Tuning[] {
  return TUNINGS.filter((t) => t.instrument === instrument)
}

export function findTuning(id: string): Tuning | undefined {
  return TUNINGS.find((t) => t.id === id)
}

/** The first tuning listed for each instrument is its standard tuning. */
export function standardTuning(instrument: Instrument): Tuning {
  return tuningsFor(instrument)[0]
}
