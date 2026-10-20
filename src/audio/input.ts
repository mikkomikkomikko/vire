import { BUFFER_SIZE } from './detector'

/** A running audio source the tuner can sample from. */
export type AudioInput = {
  sampleRate: number
  /** Fills `buffer` with the most recent samples. */
  read(buffer: Float32Array): void
  suspend(): Promise<void>
  resume(): Promise<boolean>
  stop(): void
  /** Called if the source dies on its own (e.g. iOS revokes the mic in the background). */
  onEnded: (() => void) | null
}

export function analyserInput(
  context: AudioContext,
  source: AudioNode,
  cleanup: () => void = () => {},
): AudioInput {
  const analyser = context.createAnalyser()
  analyser.fftSize = BUFFER_SIZE
  analyser.smoothingTimeConstant = 0
  source.connect(analyser)

  return {
    sampleRate: context.sampleRate,
    read: (buffer) => analyser.getFloatTimeDomainData(buffer as Float32Array<ArrayBuffer>),
    suspend: () => context.suspend(),
    resume: async () => {
      await context.resume()
      return context.state === 'running'
    },
    stop: () => {
      source.disconnect()
      cleanup()
      void context.close()
    },
    onEnded: null,
  }
}

/**
 * Must be called from a user gesture: iOS Safari only lets an AudioContext start inside one.
 * Browser echo cancellation, noise suppression and auto gain are off because they distort pitch.
 */
export async function openMic(): Promise<AudioInput> {
  const context = new AudioContext()
  const resumed = context.resume()
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
    await resumed
    const input = analyserInput(context, context.createMediaStreamSource(stream), () =>
      stream.getTracks().forEach((track) => track.stop()),
    )
    stream.getAudioTracks()[0]?.addEventListener('ended', () => input.onEnded?.())
    return input
  } catch (error) {
    void context.close()
    throw error
  }
}
