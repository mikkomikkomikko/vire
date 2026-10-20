import { BUFFER_SIZE } from './detector'
import { diagnostics, stage } from './diagnostics'

const RESUME_TIMEOUT_MS = 1000

/** A running audio source the tuner can sample from. */
export type AudioInput = {
  sampleRate: number
  /** Fills `buffer` with the most recent samples. */
  read(buffer: Float32Array): void
  isRunning(): boolean
  suspend(): Promise<void>
  /** Tries to (re)start audio; resolves false if the browser keeps it paused. */
  resume(): Promise<boolean>
  stop(): void
  /** Called if the source dies on its own (e.g. iOS revokes the mic in the background). */
  onEnded: (() => void) | null
  /** Called when the browser pauses audio by itself (iOS: permission prompt, calls, Siri). */
  onInterrupted: (() => void) | null
}

/** Resolves when `promise` settles or after `ms`, whichever is first; never rejects. */
function settleWithin(promise: Promise<unknown>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    promise.then(
      () => {
        clearTimeout(timer)
        resolve()
      },
      () => {
        clearTimeout(timer)
        resolve()
      },
    )
  })
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
  // WebKit (Safari, every iOS browser) only renders nodes that lead to the speakers; an analyser
  // left dangling reads silence. Route it through a muted gain so it runs without making sound.
  const sink = context.createGain()
  sink.gain.value = 0
  analyser.connect(sink).connect(context.destination)

  let pausedByUs = false
  const isRunning = () => context.state === 'running'

  const input: AudioInput = {
    sampleRate: context.sampleRate,
    read: (buffer) => analyser.getFloatTimeDomainData(buffer as Float32Array<ArrayBuffer>),
    isRunning,
    suspend: () => {
      pausedByUs = true
      return context.suspend()
    },
    resume: async () => {
      pausedByUs = false
      // iOS may never settle resume() when it refuses, so don't wait forever.
      await settleWithin(context.resume(), RESUME_TIMEOUT_MS)
      return isRunning()
    },
    stop: () => {
      context.onstatechange = null
      source.disconnect()
      sink.disconnect()
      cleanup()
      void context.close()
    },
    onEnded: null,
    onInterrupted: null,
  }

  diagnostics.sampleRate = context.sampleRate
  diagnostics.contextState = context.state
  context.onstatechange = () => {
    // Safari also reports a non-standard 'interrupted' state.
    diagnostics.contextState = context.state
    if (!isRunning() && !pausedByUs) input.onInterrupted?.()
  }

  return input
}

/**
 * Must be called from a user gesture: iOS Safari only lets an AudioContext start inside one, so
 * the context is created and resumed before the (async) permission prompt.
 * Browser echo cancellation, noise suppression and auto gain are off because they distort pitch.
 */
export async function openMic(): Promise<AudioInput> {
  diagnostics.error = ''
  stage('creating audio context')
  const context = new AudioContext()
  context.resume().catch(() => {})
  try {
    stage('requesting microphone')
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
    stage('microphone granted')
    const track = stream.getAudioTracks()[0]
    const input = analyserInput(context, context.createMediaStreamSource(stream), () =>
      stream.getTracks().forEach((t) => t.stop()),
    )
    const updateTrack = () => {
      diagnostics.track = track ? `${track.readyState}${track.muted ? ', muted' : ''}` : 'none'
    }
    updateTrack()
    track?.addEventListener('mute', updateTrack)
    track?.addEventListener('unmute', updateTrack)
    track?.addEventListener('ended', () => {
      updateTrack()
      input.onEnded?.()
    })
    // The permission prompt often leaves iOS audio paused; one more nudge, then let the caller decide.
    const running = await input.resume()
    stage(running ? 'running' : 'audio paused by the browser')
    return input
  } catch (error) {
    diagnostics.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    stage('failed')
    void context.close()
    throw error
  }
}
