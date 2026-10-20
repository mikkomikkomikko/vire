import { analyserInput, type AudioInput } from '../audio/input'

/** Dev-only stand-in for the mic: a silent sawtooth at `freq`, for checking the pipeline end to end. */
export async function openTone(freq: number): Promise<AudioInput> {
  const context = new AudioContext()
  await context.resume()
  const oscillator = context.createOscillator()
  oscillator.type = 'sawtooth'
  oscillator.frequency.value = freq
  const gain = context.createGain()
  gain.gain.value = 0.5
  oscillator.connect(gain)
  oscillator.start()
  return analyserInput(context, gain, () => oscillator.stop())
}
