import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { noteToFreq } from '../music/notes'
import { standardTuning, type TuningString } from '../music/tunings'
import type { TunerState } from '../state/tunerState'
import { formatCents } from './formatCents'
import { TunerScreen } from './TunerScreen'

const E2 = standardTuning('guitar').strings[0]
const active = (cents: number, inTune = false, settled = false): TunerState => ({
  status: 'active',
  string: E2,
  freq: 82.98,
  cents,
  inTune,
  settled,
})

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

  test('band stops growing at 50 cents; number clamps at 99', () => {
    renderScreen(active(-300))
    expect(screen.getByTestId('band').style.getPropertyValue('--band-cents')).toBe('50')
    expect(screen.getByLabelText('-99 cents flat')).toBeInTheDocument()
  })

  test('in tune: check mark on the mint background, no band or number', () => {
    const { container } = renderScreen(active(0.3, true, true))
    expect(screen.getByRole('img', { name: 'In tune' })).toBeInTheDocument()
    expect(screen.queryByTestId('band')).toBeNull()
    expect(container.querySelector('main')).toHaveClass('inTune')
  })

  test('dead on but not held for 2 s yet: "0" on green, no check', () => {
    renderScreen(active(0.2, true, false))
    expect(screen.getByLabelText('0 cents')).toHaveTextContent('0')
    expect(screen.queryByRole('img', { name: 'In tune' })).toBeNull()
  })

  test('in tune but not dead on: the number stays on the green so you can find 0', () => {
    const { container } = renderScreen(active(-1.2, true))
    expect(container.querySelector('main')).toHaveClass('inTune')
    expect(screen.getByLabelText('-1 cents flat')).toHaveTextContent('-1')
    expect(screen.getByTestId('band')).toHaveClass('flat')
    expect(screen.queryByRole('img', { name: 'In tune' })).toBeNull()
  })

  test('idle keeps the last reading frozen on screen', () => {
    const { status: _status, ...last } = active(7) as Extract<TunerState, { status: 'active' }>
    renderScreen({ status: 'idle', last })
    expect(screen.getByLabelText('+7 cents sharp')).toBeInTheDocument()
    expect(screen.getByTestId('band')).toHaveClass('sharp')
    expect(screen.getByText('E2')).toBeInTheDocument()
    expect(screen.getByText('82.41 Hz')).toBeInTheDocument()
  })

  test('after a string is done, the check stays through silence', () => {
    const { status: _status, ...last } = active(0, true, true) as Extract<
      TunerState,
      { status: 'active' }
    >
    const { container } = renderScreen({ status: 'idle', last })
    expect(screen.getByRole('img', { name: 'In tune' })).toBeInTheDocument()
    expect(container.querySelector('main')).toHaveClass('inTune')
    expect(screen.getByText('E2')).toBeInTheDocument()
  })

  test('nothing played yet: no note, no frequency', () => {
    renderScreen({ status: 'idle', last: null })
    expect(screen.getByText('— Hz')).toBeInTheDocument()
    expect(screen.queryByTestId('band')).toBeNull()
  })

  test('with a capo the target is the capoed pitch', () => {
    renderScreen(active(0, true), { capo: 2 })
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

  test('keeps the theme colour in step with the screen', () => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.append(meta)
    const { rerender } = renderScreen(active(12))
    expect(meta.content).toBe('#F5F6F5')
    rerender(
      <TunerScreen
        state={active(1, true)}
        locked={null}
        tuning="Standard"
        capo={0}
        onStart={() => {}}
        onOpenSettings={() => {}}
        onOpenPrivacy={() => {}}
      />,
    )
    expect(meta.content).toBe('#CFECDE')
    // Safari colours its bars from the page background, so that must follow too.
    expect(document.body.style.backgroundColor).toBe('rgb(207, 236, 222)')
    expect(document.documentElement.style.backgroundColor).toBe('rgb(207, 236, 222)')
    meta.remove()
  })
})
