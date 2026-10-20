import { act, renderHook } from '@testing-library/react'
import type { AudioInput } from '../audio/input'
import { noteToFreq } from '../music/notes'
import type { TargetConfig } from '../music/target'
import { findTuning } from '../music/tunings'
import { SAMPLE_RATE, sawtooth } from '../test/synth'
import { useTuner } from './useTuner'

const config: TargetConfig = { tuning: findTuning('guitar-standard')!, capo: 0, locked: null }

let frames: FrameRequestCallback[] = []
let now = 0

function runFrames(count: number) {
  for (let i = 0; i < count; i++) {
    const pending = frames
    frames = []
    now += 16
    act(() => pending.forEach((cb) => cb(now)))
  }
}

function fakeInput(freq: number, { running = true } = {}) {
  const signal = sawtooth(freq)
  let isRunning = running
  const input: AudioInput & { resumeSucceeds: boolean } = {
    sampleRate: SAMPLE_RATE,
    read: (buffer: Float32Array) => buffer.set(signal),
    isRunning: () => isRunning,
    suspend: vi.fn(async () => {
      isRunning = false
    }),
    resume: vi.fn(async (): Promise<boolean> => {
      isRunning = input.resumeSucceeds
      return isRunning
    }),
    stop: vi.fn(),
    onEnded: null,
    onInterrupted: null,
    resumeSucceeds: true,
  }
  return input
}

beforeEach(() => {
  frames = []
  now = 0
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb))
  vi.stubGlobal('cancelAnimationFrame', () => {
    frames = []
  })
})

afterEach(() => vi.unstubAllGlobals())

test('starts on the start screen and only opens audio on start()', async () => {
  const open = vi.fn(async () => fakeInput(noteToFreq('A2')))
  const { result } = renderHook(() => useTuner(config, open))
  expect(result.current.state).toEqual({ status: 'start' })
  expect(open).not.toHaveBeenCalled()

  await act(() => result.current.start())
  expect(open).toHaveBeenCalledOnce()
  runFrames(1)
  expect(result.current.state).toMatchObject({
    status: 'active',
    string: { name: 'A2' },
    inTune: true,
  })
})

test('a refused or missing mic shows the denied state, and start() can retry', async () => {
  const open = vi
    .fn<() => Promise<AudioInput>>()
    .mockRejectedValueOnce(new DOMException('nope', 'NotAllowedError'))
    .mockResolvedValueOnce(fakeInput(noteToFreq('A2')))
  const { result } = renderHook(() => useTuner(config, open))

  await act(() => result.current.start())
  expect(result.current.state).toEqual({ status: 'denied' })

  await act(() => result.current.start())
  expect(result.current.state.status).toBe('idle')
})

test('settings changes apply to the running loop', async () => {
  const { result, rerender } = renderHook(
    ({ c }) => useTuner(c, async () => fakeInput(noteToFreq('F#2'))),
    {
      initialProps: { c: config },
    },
  )
  await act(() => result.current.start())
  runFrames(1)
  // Without a capo, F#2 is E2 two semitones sharp.
  expect(result.current.state).toMatchObject({
    status: 'active',
    string: { name: 'E2' },
    inTune: false,
  })
  rerender({ c: { ...config, capo: 2 } })
  runFrames(1)
  expect(result.current.state).toMatchObject({
    status: 'active',
    string: { name: 'E2' },
    inTune: true,
  })
})

test('pauses while hidden and resumes when visible again', async () => {
  const input = fakeInput(noteToFreq('A2'))
  const { result } = renderHook(() => useTuner(config, async () => input))
  await act(() => result.current.start())

  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  act(() => void document.dispatchEvent(new Event('visibilitychange')))
  expect(input.suspend).toHaveBeenCalled()
  expect(frames).toHaveLength(0)

  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  await act(async () => void document.dispatchEvent(new Event('visibilitychange')))
  expect(input.resume).toHaveBeenCalled()
  expect(frames).toHaveLength(1)
})

test('returns to the start screen if the browser ends the mic', async () => {
  const input = fakeInput(noteToFreq('A2'))
  const { result } = renderHook(() => useTuner(config, async () => input))
  await act(() => result.current.start())
  act(() => input.onEnded?.())
  expect(result.current.state).toEqual({ status: 'start' })
  expect(input.stop).toHaveBeenCalled()
})

test('stops audio on unmount', async () => {
  const input = fakeInput(noteToFreq('A2'))
  const { result, unmount } = renderHook(() => useTuner(config, async () => input))
  await act(() => result.current.start())
  unmount()
  expect(input.stop).toHaveBeenCalled()
})

test('if the browser keeps audio paused after the permission prompt, the next tap resumes it', async () => {
  const input = fakeInput(noteToFreq('A2'), { running: false })
  const open = vi.fn(async () => input)
  const { result } = renderHook(() => useTuner(config, open))

  await act(() => result.current.start())
  expect(result.current.state).toEqual({ status: 'start', resume: true })
  expect(frames).toHaveLength(0)

  await act(() => result.current.start())
  expect(open).toHaveBeenCalledOnce()
  expect(input.resume).toHaveBeenCalled()
  runFrames(1)
  expect(result.current.state).toMatchObject({ status: 'active', string: { name: 'A2' } })
})

test('a tap that still cannot resume audio stays on the continue prompt', async () => {
  const input = fakeInput(noteToFreq('A2'), { running: false })
  input.resumeSucceeds = false
  const { result } = renderHook(() => useTuner(config, async () => input))
  await act(() => result.current.start())
  await act(() => result.current.start())
  expect(result.current.state).toEqual({ status: 'start', resume: true })
})

test('an interruption (call, Siri) pauses and asks for a tap', async () => {
  const input = fakeInput(noteToFreq('A2'))
  const { result } = renderHook(() => useTuner(config, async () => input))
  await act(() => result.current.start())
  act(() => input.onInterrupted?.())
  expect(result.current.state).toEqual({ status: 'start', resume: true })
  expect(frames).toHaveLength(0)

  await act(() => result.current.start())
  runFrames(1)
  expect(result.current.state.status).toBe('active')
})

test('returning from the background when audio cannot resume asks for a tap instead of dropping the mic', async () => {
  const input = fakeInput(noteToFreq('A2'))
  const { result } = renderHook(() => useTuner(config, async () => input))
  await act(() => result.current.start())

  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  act(() => void document.dispatchEvent(new Event('visibilitychange')))
  input.resumeSucceeds = false
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  await act(async () => void document.dispatchEvent(new Event('visibilitychange')))

  expect(result.current.state).toEqual({ status: 'start', resume: true })
  expect(input.stop).not.toHaveBeenCalled()
})
