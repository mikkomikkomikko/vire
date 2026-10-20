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

function fakeInput(freq: number) {
  const signal = sawtooth(freq)
  const input: AudioInput = {
    sampleRate: SAMPLE_RATE,
    read: (buffer) => buffer.set(signal),
    suspend: vi.fn(async () => {}),
    resume: vi.fn(async () => true),
    stop: vi.fn(),
    onEnded: null,
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
