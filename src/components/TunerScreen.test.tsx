import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { noteToFreq } from '../music/notes'
import { standardTuning, type TuningString } from '../music/tunings'
import type { TunerState } from '../state/tunerState'
import { IN_TUNE_HOLD_MS } from './CentsDisplay'
import { formatCents } from './formatCents'
import { TunerScreen } from './TunerScreen'

const STRINGS = standardTuning('guitar').strings
const E2 = STRINGS[0]
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
    strings={STRINGS}
    locked={null}
    tuning="Standard"
    capo={0}
    onLock={() => {}}
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
  const onLock = vi.fn()
  const onOpenSettings = vi.fn()
  const onOpenPrivacy = vi.fn()
  const view = render(
    <TunerScreen
      state={state}
      strings={STRINGS}
      locked={locked}
      tuning={tuning}
      capo={capo}
      onLock={onLock}
      onStart={onStart}
      onOpenSettings={onOpenSettings}
      onOpenPrivacy={onOpenPrivacy}
    />,
  )
  return { ...view, onStart, onLock, onOpenSettings, onOpenPrivacy }
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

const strings = () => within(screen.getByRole('group', { name: 'String' }))
const chip = (name: string) => strings().getByRole('radio', { name }).closest('label')!

describe('TunerScreen', () => {
  test('sharp: number, upward band, heard string marked', () => {
    const { container } = renderScreen(active(12))
    expect(screen.getByLabelText('+12 cents sharp')).toHaveTextContent('+12')
    const band = screen.getByTestId('band')
    expect(band).toHaveClass('sharp')
    expect(band.style.getPropertyValue('--band-cents')).toBe('12')
    expect(chip('E2')).toHaveClass('detected')
    expect(strings().getByRole('radio', { name: 'Auto' })).toBeChecked()
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
      expect(chip('E2')).toHaveClass('detected')
    })

    test('keeps the theme colour in step with the screen', async () => {
      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.append(meta)
      renderScreen(active(0))
      expect(meta.content).toBe('#F5F6F5')
      await wait(IN_TUNE_HOLD_MS)
      expect(meta.content).toBe('#B0E1CA')
      // Safari colours its bars from the page background, so that must follow too.
      expect(document.body.style.backgroundColor).toBe('rgb(176, 225, 202)')
      expect(document.documentElement.style.backgroundColor).toBe('rgb(176, 225, 202)')
      meta.remove()
    })
  })

  test('idle keeps the last reading frozen on screen', () => {
    const { status: _status, ...last } = active(7) as Extract<TunerState, { status: 'active' }>
    renderScreen({ status: 'idle', last })
    expect(screen.getByLabelText('+7 cents sharp')).toBeInTheDocument()
    expect(screen.getByTestId('band')).toHaveClass('sharp')
    expect(chip('E2')).toHaveClass('detected')
  })

  test('nothing played yet: Auto chosen, no string marked', () => {
    renderScreen({ status: 'idle', last: null })
    expect(
      strings()
        .getAllByRole('radio')
        .map((r) => r.closest('label')!.textContent),
    ).toEqual(['Auto', 'E2', 'A2', 'D3', 'G3', 'B3', 'E4'])
    expect(strings().getByRole('radio', { name: 'Auto' })).toBeChecked()
    expect(screen.getByRole('group', { name: 'String' }).querySelector('.detected')).toBeNull()
    expect(screen.queryByTestId('band')).toBeNull()
  })

  test('locked: the chosen string is checked and nothing else is marked', () => {
    renderScreen(active(3), { locked: STRINGS[2] })
    expect(strings().getByRole('radio', { name: 'D3' })).toBeChecked()
    expect(chip('E2')).not.toHaveClass('detected')
  })

  test('tapping a string locks it, tapping Auto unlocks', async () => {
    const { onLock, unmount } = renderScreen(active(12))
    await userEvent.click(strings().getByRole('radio', { name: 'A2' }))
    expect(onLock).toHaveBeenLastCalledWith('A2')
    unmount()
    const locked = renderScreen(active(12), { locked: STRINGS[1] })
    await userEvent.click(strings().getByRole('radio', { name: 'Auto' }))
    expect(locked.onLock).toHaveBeenLastCalledWith(null)
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
    expect(screen.queryByRole('group', { name: 'String' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Settings: Standard' })).toBeNull()
  })
})
