import { noteToFreq } from '../music/notes'
import { standardTuning } from '../music/tunings'
import type { TunerState } from '../state/tunerState'

const E2 = standardTuning('guitar').strings[0]

/**
 * Dev-only fixed states for checking visuals against the Paper artboards:
 * `?mock=sharp|flat|intune|idle|start|resume|denied`, optionally with `&cents=30`.
 */
export function mockState(search: string): TunerState | null {
  const params = new URLSearchParams(search)
  const mock = params.get('mock')
  const centsParam = params.get('cents')

  const active = (cents: number): TunerState => ({
    status: 'active',
    string: E2,
    freq: noteToFreq('E2') * 2 ** (cents / 1200),
    cents,
  })

  switch (mock) {
    case 'sharp':
      return active(centsParam ? Number(centsParam) : 12)
    case 'flat':
      return active(centsParam ? Number(centsParam) : -6)
    case 'intune':
      // `?mock=intune` is dead on: the screen turns moon grey after IN_TUNE_HOLD_MS.
      return active(centsParam ? Number(centsParam) : 0)
    case 'idle':
      return { status: 'idle', last: null }
    case 'start':
      return { status: 'start' }
    case 'resume':
      return { status: 'start', resume: true }
    case 'denied':
      return { status: 'denied' }
    default:
      return null
  }
}
