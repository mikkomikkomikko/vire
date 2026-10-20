import { PitchDetector } from 'pitchy'

export const BUFFER_SIZE = 4096
export const NOISE_GATE_RMS = 0.01
export const MIN_CLARITY = 0.9
// Comfortably outside every tuning (C2 = 65 Hz … B4 + 7 fret capo ≈ 740 Hz).
const MIN_FREQ = 40
const MAX_FREQ = 1500

export type PitchReading = { freq: number; clarity: number }

export function rms(buffer: Float32Array): number {
  let sum = 0
  for (const sample of buffer) sum += sample * sample
  return Math.sqrt(sum / buffer.length)
}

/** McLeod pitch detection with a volume gate and clarity threshold; null means "no usable pitch". */
export function createDetector(bufferSize = BUFFER_SIZE) {
  const detector = PitchDetector.forFloat32Array(bufferSize)

  return function detect(buffer: Float32Array, sampleRate: number): PitchReading | null {
    if (rms(buffer) < NOISE_GATE_RMS) return null
    const [freq, clarity] = detector.findPitch(buffer, sampleRate)
    if (clarity < MIN_CLARITY || freq < MIN_FREQ || freq > MAX_FREQ) return null
    return { freq, clarity }
  }
}
