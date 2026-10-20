import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BUFFER_SIZE, rms } from '../audio/detector'
import { diagnostics, stage } from '../audio/diagnostics'
import { openMic, type AudioInput } from '../audio/input'
import type { TargetConfig } from '../music/target'
import { createPipeline, sameScreen } from './pipeline'
import type { TunerState } from './tunerState'

const PAUSED: TunerState = { status: 'start', resume: true }

/**
 * Owns the audio lifecycle. `start` must be called from a tap: the first tap opens the mic, and
 * later taps restart audio that the browser paused (iOS does this after the permission prompt,
 * calls, Siri, and sometimes after the app was in the background). Runs the pipeline once per
 * animation frame and pauses while the page is hidden.
 */
export function useTuner(config: TargetConfig, openInput: () => Promise<AudioInput> = openMic) {
  const [state, setState] = useState<TunerState>({ status: 'start' })
  const configRef = useRef(config)
  const inputRef = useRef<AudioInput | null>(null)
  const frameRef = useRef(0)
  const startingRef = useRef(false)

  useLayoutEffect(() => {
    configRef.current = config
  })

  const loop = useCallback((input: AudioInput) => {
    cancelAnimationFrame(frameRef.current)
    const process = createPipeline()
    const buffer = new Float32Array(BUFFER_SIZE)
    const tick = (now: number) => {
      input.read(buffer)
      const next = process(buffer, input.sampleRate, now, configRef.current)
      if (diagnostics.enabled) {
        diagnostics.frames++
        diagnostics.rms = rms(buffer)
        if (diagnostics.rms >= diagnostics.peak || now - diagnostics.peakAt > 2000) {
          diagnostics.peak = diagnostics.rms
          diagnostics.peakAt = now
        }
        diagnostics.freq = next.status === 'active' ? next.freq : 0
      }
      setState((prev) => (sameScreen(prev, next) ? prev : next))
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [])

  const pause = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    setState(PAUSED)
  }, [])

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    inputRef.current?.stop()
    inputRef.current = null
  }, [])

  const start = useCallback(async () => {
    if (startingRef.current) return
    startingRef.current = true
    try {
      let input = inputRef.current
      if (input) {
        // This tap is the user gesture iOS needs to restart paused audio; resume() is called
        // before anything else awaits so it still counts as part of the tap.
        if (!(await input.resume())) return pause()
        stage('running')
      } else {
        input = await openInput()
        input.onEnded = () => {
          stop()
          setState({ status: 'start' })
        }
        input.onInterrupted = pause
        inputRef.current = input
        if (!input.isRunning()) return pause()
      }
      setState({ status: 'idle', last: null })
      loop(input)
    } catch {
      stop()
      setState({ status: 'denied' })
    } finally {
      startingRef.current = false
    }
  }, [openInput, loop, pause, stop])

  useEffect(() => {
    const onVisibility = () => {
      const input = inputRef.current
      if (!input) return
      if (document.hidden) {
        cancelAnimationFrame(frameRef.current)
        void input.suspend()
        return
      }
      void input.resume().then((running) => {
        if (inputRef.current !== input) return
        if (running) loop(input)
        else pause()
      })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
    }
  }, [loop, pause, stop])

  return { state, start }
}
