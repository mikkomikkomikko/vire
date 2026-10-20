export const SAMPLE_RATE = 48000

export function sine(freq: number, length = 4096, amplitude = 0.5, sampleRate = SAMPLE_RATE) {
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++)
    out[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / sampleRate)
  return out
}

/** Band-limited sawtooth: rich in harmonics like a plucked string, the usual cause of octave errors. */
export function sawtooth(freq: number, length = 4096, amplitude = 0.5, sampleRate = SAMPLE_RATE) {
  const out = new Float32Array(length)
  const harmonics = Math.floor(sampleRate / 2 / freq)
  for (let k = 1; k <= Math.min(harmonics, 30); k++) {
    for (let i = 0; i < length; i++) {
      out[i] +=
        ((amplitude * 2) / Math.PI / k) * Math.sin((2 * Math.PI * k * freq * i) / sampleRate)
    }
  }
  return out
}

/** Deterministic white noise so tests never flake. */
export function noise(length = 4096, amplitude = 0.5, seed = 1) {
  const out = new Float32Array(length)
  let state = seed
  for (let i = 0; i < length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0
    out[i] = amplitude * ((state / 2 ** 32) * 2 - 1)
  }
  return out
}

export function mix(a: Float32Array, b: Float32Array) {
  return a.map((v, i) => v + b[i])
}
