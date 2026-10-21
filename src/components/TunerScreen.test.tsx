import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { noteToFreq } from '../music/notes'
import { standardTuning, type TuningString } from '../music/tunings'
import type { TunerState } from '../state/tunerState'
import { IN_TUNE_HOLD_MS } from './CentsDisplay'
import { formatCents } from './formatCents'
import { TunerScreen } from './TunerScreen'

const E2 = standardTuning('guitar').strings[0]
const active = (cents: number): TunerState => ({
  status: 'active',
  string: E2,
  freq: 82.98,
  cents,
})
const green = (container: HTMLElement) =>
  container.querySelector('main')!.classList.contains('inTune')
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms))
const fakeTimers = () =>
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
    ],
  })

/** The screen with default props, for `rerender`. */
const screenWith = (state: TunerState) => (
  <TunerScreen
    state={state}
    locked={null}
    tuning="Standard"
    capo={0}
    onStart={() => {}}
    onOpenSettings={() => {}}
    onOpenPrivacy={() => {}}
  />
)

function renderScreen(
  state: TunerState,
  { locked = null as TuningString | null, tuning = 'Standard', capo = 0 } = {},
) {
  const onStart = vi.fn()
  const onOpenSettings = vi.fn()
  const onOpenPrivacy = vi.fn()
  const view = render(
    <TunerScreen
      state={state}
      locked={locked}
      tuning={tuning}
      capo={capo}
      onStart={onStart}
      onOpenSettings={onOpenSettings}
      onOpenPrivacy={onOpenPrivacy}
    />,
  )
  return { ...view, onStart, onOpenSettings, onOpenPrivacy }
}

describe('formatCents', () => {
  test.each([
    [12, '+', '12'],
    [-6, '-', '6'],
    [11.6, '+', '12'],
    [150, '+', '99'],
    [-400, '-', '99'],
    [0.2, '', '0'],
  ])('%f → %s%s', (cents, sign, value) => {
    expect(formatCents(cents)).toEqual({ sign, value })
  })
})

describe('TunerScreen', () => {
  test('sharp: number, upward band, note and frequency', () => {
    const { container } = renderScreen(active(12))
    expect(screen.getByLabelText('+12 cents sharp')).toHaveTextContent('+12')
    const band = screen.getByTestId('band')
    expect(band).toHaveClass('sharp')
    expect(band.style.getPropertyValue('--band-cents')).toBe('12')
    expect(screen.getByText('E2')).toBeInTheDocument()
    // The target pitch, not the measured 82.98 Hz: the cents already say how far off you are.
    expect(screen.getByText('82.41 Hz')).toBeInTheDocument()
    expect(container.querySelector('main')).not.toHaveClass('inTune')
  })

  test('flat: downward band', () => {
    renderScreen(active(-6))
    expect(screen.getByLabelText('-6 cents flat')).toHaveTextContent('-6')
    expect(screen.getByTestId('band')).toHaveClass('flat')
  })

  test('no band while the number reads 0, not even a hairline', () => {
    renderScreen(active(0.4))
    expect(screen.getByLabelText('0 cents')).toBeInTheDocument()
    expect(screen.getByTestId('band').style.getPropertyValue('--band-cents')).toBe('0')
  })

  test('band stops growing at 50 cents; number clamps at 99', () => {
    renderScreen(active(-300))
    expect(screen.getByTestId('band').style.getPropertyValue('--band-cents')).toBe('50')
    expect(screen.getByLabelText('-99 cents flat')).toBeInTheDocument()
  })

  describe('in tune', () => {
    beforeEach(fakeTimers)
    afterEach(() => vi.useRealTimers())

    test('green only once the number has shown 0 for a couple of seconds', async () => {
      const { container } = renderScreen(active(0.2))
      expect(screen.getByLabelText('0 cents')).toHaveTextContent('0')
      expect(green(container)).toBe(false)
      await wait(IN_TUNE_HOLD_MS - 1)
      expect(green(container)).toBe(false)
      await wait(1)
      expect(green(container)).toBe(true)
      expect(screen.queryByRole('img', { name: 'In tune' })).toBeNull()
    })

    test('1 cent off never turns green', async () => {
      const { container } = renderScreen(active(-1.2))
      await wait(5000)
      expect(screen.getByLabelText('-1 cents flat')).toBeInTheDocument()
      expect(green(container)).toBe(false)
    })

    test('the green goes as soon as the number moves off 0, and the wait starts over', async () => {
      const { container, rerender } = renderScreen(active(0))
      await wait(IN_TUNE_HOLD_MS)
      expect(green(container)).toBe(true)
      rerender(screenWith(active(3)))
      await wait(1000)
      expect(screen.getByLabelText('+3 cents sharp')).toBeInTheDocument()
      expect(green(container)).toBe(false)
      rerender(screenWith(active(0)))
      await wait(1000)
      expect(screen.getByLabelText('0 cents')).toBeInTheDocument()
      expect(green(container)).toBe(false)
      await wait(IN_TUNE_HOLD_MS)
      expect(green(container)).toBe(true)
    })

    test('a green reading stays green through silence', async () => {
      const { status: _status, ...last } = active(0) as Extract<TunerState, { status: 'active' }>
      const { container } = renderScreen({ status: 'idle', last })
      await wait(IN_TUNE_HOLD_MS)
      expect(screen.getByLabelText('0 cents')).toBeInTheDocument()
      expect(green(container)).toBe(true)
      expect(screen.getByText('E2')).toBeInTheDocument()
    })

    test('keeps the theme colour in step with the screen', async () => {
      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.append(meta)
      renderScreen(active(0))
      expect(meta.content).toBe('#F5F6F5')
      await wait(IN_TUNE_HOLD_MS)
      expect(meta.content).toBe('#CFECDE')
      // Safari colours its bars from the page background, so that must follow too.
      expect(document.body.style.backgroundColor).toBe('rgb(207, 236, 222)')
      expect(document.documentElement.style.backgroundColor).toBe('rgb(207, 236, 222)')
      meta.remove()
    })
  })

  test('idle keeps the last reading frozen on screen', () => {
    const { status: _status, ...last } = active(7) as Extract<TunerState, { status: 'active' }>
    renderScreen({ status: 'idle', last })
    expect(screen.getByLabelText('+7 cents sharp')).toBeInTheDocument()
    expect(screen.getByTestId('band')).toHaveClass('sharp')
    expect(screen.getByText('E2')).toBeInTheDocument()
    expect(screen.getByText('82.41 Hz')).toBeInTheDocument()
  })

  test('nothing played yet: no note, no frequency', () => {
    renderScreen({ status: 'idle', last: null })
    expect(screen.getByText('— Hz')).toBeInTheDocument()
    expect(screen.queryByTestId('band')).toBeNull()
  })

  test('with a capo the target is the capoed pitch', () => {
    renderScreen(active(0), { capo: 2 })
    expect(screen.getByText('E2')).toBeInTheDocument()
    expect(screen.getByText('92.50 Hz')).toBeInTheDocument()
  })

  test('locked: lock glyph, and the locked string shows even before playing', () => {
    const D3 = standardTuning('guitar').strings[2]
    renderScreen({ status: 'idle', last: null }, { locked: D3 })
    expect(screen.getByText('D3')).toBeInTheDocument()
    expect(screen.getByText('146.83 Hz')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Locked' })).toBeInTheDocument()
  })

  test('auto mode has no lock glyph', () => {
    renderScreen(active(12))
    expect(screen.queryByRole('img', { name: 'Locked' })).toBeNull()
  })

  test('the tuning label is a button that opens settings', async () => {
    const { onOpenSettings } = renderScreen(active(12), { tuning: 'Drop D', capo: 2 })
    expect(screen.getByText('Capo 2')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Settings: Drop D, capo 2' }))
    expect(onOpenSettings).toHaveBeenCalledOnce()
  })

  test('the mock E2 frequency matches the design', () => {
    expect(noteToFreq('E2') * 2 ** (12 / 1200)).toBeCloseTo(82.98, 1)
  })

  test('start: tapping the prompt starts the tuner', async () => {
    const { onStart } = renderScreen({ status: 'start' })
    await userEvent.click(screen.getByRole('button', { name: /tap to start/i }))
    expect(onStart).toHaveBeenCalledOnce()
  })

  test('denied: explains and retries on tap', async () => {
    const { onStart } = renderScreen({ status: 'denied' })
    await userEvent.click(screen.getByRole('button', { name: /microphone unavailable/i }))
    expect(onStart).toHaveBeenCalledOnce()
  })

  test('start: the mic explanation opens without starting the mic', async () => {
    const { onStart, onOpenPrivacy } = renderScreen({ status: 'start' })
    await userEvent.click(screen.getByRole('button', { name: 'How Vire uses your mic' }))
    expect(onOpenPrivacy).toHaveBeenCalledOnce()
    expect(onStart).not.toHaveBeenCalled()
  })

  test('the start screen hides the bottom bar', () => {
    renderScreen({ status: 'start' })
    expect(screen.queryByText('— Hz')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Settings: Standard' })).toBeNull()
  })
})
