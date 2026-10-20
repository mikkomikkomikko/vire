import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BUFFER_SIZE } from '../audio/detector'
import { openMic, type AudioInput } from '../audio/input'
import type { TargetConfig } from '../music/target'
import { createPipeline, sameScreen } from './pipeline'
import type { TunerState } from './tunerState'

/**
 * Owns the audio lifecycle: `start` must be called from a tap. Runs the pipeline once per
 * animation frame, pauses while the page is hidden, and falls back to the start screen if the
 * browser takes the mic away.
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
    const process = createPipeline()
    const buffer = new Float32Array(BUFFER_SIZE)
    const tick = (now: number) => {
      input.read(buffer)
      const next = process(buffer, input.sampleRate, now, configRef.current)
      setState((prev) => (sameScreen(prev, next) ? prev : next))
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [])

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    inputRef.current?.stop()
    inputRef.current = null
  }, [])

  const start = useCallback(async () => {
    if (inputRef.current || startingRef.current) return
    startingRef.current = true
    try {
      const input = await openInput()
      input.onEnded = () => {
        stop()
        setState({ status: 'start' })
      }
      inputRef.current = input
      setState({ status: 'idle', lastString: null })
      loop(input)
    } catch {
      setState({ status: 'denied' })
    } finally {
      startingRef.current = false
    }
  }, [openInput, loop, stop])

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
        if (running) {
          loop(input)
        } else {
          stop()
          setState({ status: 'start' })
        }
      })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
    }
  }, [loop, stop])

  return { state, start }
}
