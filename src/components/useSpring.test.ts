import { act, renderHook } from '@testing-library/react'
import { useSpring } from './useSpring'

beforeEach(() =>
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] }),
)
afterEach(() => vi.useRealTimers())

const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms))

describe('useSpring', () => {
  test('starts at the value', () => {
    const { result } = renderHook(() => useSpring(12))
    expect(result.current).toBe(12)
  })

  test('starts moving towards a new reading on the next frames', () => {
    const { result, rerender } = renderHook(({ v }) => useSpring(v), { initialProps: { v: 0 } })
    rerender({ v: 20 })
    wait(100)
    expect(result.current).toBeGreaterThan(2)
    expect(result.current).toBeLessThan(20)
  })

  test('swings slightly past the reading, then settles on it', () => {
    const { result, rerender } = renderHook(({ v }) => useSpring(v), { initialProps: { v: 0 } })
    rerender({ v: 20 })
    let peak = 0
    for (let i = 0; i < 60; i++) {
      wait(16)
      peak = Math.max(peak, result.current)
    }
    expect(peak).toBeGreaterThan(20)
    expect(peak).toBeLessThan(21.5)
    wait(1000)
    expect(result.current).toBe(20)
  })

  test('rides over a reading that flickers for a frame', () => {
    const { result, rerender } = renderHook(({ v }) => useSpring(v), { initialProps: { v: 5 } })
    rerender({ v: 15 })
    wait(16)
    rerender({ v: 5 })
    wait(16)
    expect(Math.abs(result.current - 5)).toBeLessThan(1)
  })

  test('keeps its speed when the reading changes mid-swing', () => {
    const { result, rerender } = renderHook(({ v }) => useSpring(v), { initialProps: { v: 0 } })
    rerender({ v: 20 })
    wait(100)
    const before = result.current
    rerender({ v: 40 })
    wait(16)
    expect(result.current).toBeGreaterThan(before)
  })
})
