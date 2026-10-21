import { act, renderHook } from '@testing-library/react'
import { useGlide } from './useGlide'

beforeEach(() =>
  vi.useFakeTimers({
    toFake: [
      'setInterval',
      'clearInterval',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
    ],
  }),
)
afterEach(() => vi.useRealTimers())

describe('useGlide', () => {
  test('starts at the value', () => {
    const { result } = renderHook(() => useGlide(12))
    expect(result.current).toBe(12)
  })

  test('holds until the next sample, then glides to the median over the next second', () => {
    const { result, rerender } = renderHook(({ v }) => useGlide(v), { initialProps: { v: 10 } })
    rerender({ v: 20 })
    rerender({ v: 30 })
    act(() => vi.advanceTimersByTime(999))
    expect(result.current).toBe(10)
    // Sampled at 1 s: the median of 10, 20 and 30.
    act(() => vi.advanceTimersByTime(501))
    expect(result.current).toBeGreaterThan(10)
    expect(result.current).toBeLessThan(20)
    act(() => vi.advanceTimersByTime(600))
    expect(result.current).toBeCloseTo(20)
  })

  test('a glitch within the second does not drag the sample', () => {
    const { result, rerender } = renderHook(({ v }) => useGlide(v), { initialProps: { v: 6 } })
    for (const v of [6.2, 1200, 5.9, 6.1]) rerender({ v })
    act(() => vi.advanceTimersByTime(2000))
    expect(result.current).toBeCloseTo(6.1)
  })

  test('keeps moving across a sample instead of stopping at it', () => {
    const { result, rerender } = renderHook(({ v }) => useGlide(v), { initialProps: { v: 0 } })
    rerender({ v: 20 })
    act(() => vi.advanceTimersByTime(1000))
    rerender({ v: 40 })
    act(() => vi.advanceTimersByTime(990))
    const before = result.current
    act(() => vi.advanceTimersByTime(30))
    // Just past the next sample the value is still rising, not starting again from rest.
    expect(result.current - before).toBeGreaterThan(0.1)
  })
})
