import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { noteToFreq } from '../music/notes'
import { standardTuning } from '../music/tunings'
import type { TunerState } from '../state/tunerState'
import { formatCents } from './formatCents'
import { TunerScreen } from './TunerScreen'

const E2 = standardTuning('guitar').strings[0]
const active = (cents: number, inTune = false): TunerState => ({
  status: 'active',
  string: E2,
  freq: 82.98,
  cents,
  inTune,
})

function renderScreen(
  state: TunerState,
  { locked = null as string | null, tuning = 'Standard', capo = 0 } = {},
) {
  const onStart = vi.fn()
  const onOpenSettings = vi.fn()
  const view = render(
    <TunerScreen
      state={state}
      locked={locked}
      tuning={tuning}
      capo={capo}
      onStart={onStart}
      onOpenSettings={onOpenSettings}
    />,
  )
  return { ...view, onStart, onOpenSettings }
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
    expect(screen.getByText('82.98 Hz')).toBeInTheDocument()
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
    const { container } = renderScreen(active(2, true))
    expect(screen.getByRole('img', { name: 'In tune' })).toBeInTheDocument()
    expect(screen.queryByTestId('band')).toBeNull()
    expect(container.querySelector('main')).toHaveClass('inTune')
  })

  test('idle: last string, dimmed, no frequency', () => {
    renderScreen({ status: 'idle', lastString: E2 })
    expect(screen.getByText('E2')).toBeInTheDocument()
    expect(screen.getByText('— Hz')).toBeInTheDocument()
    expect(screen.queryByTestId('band')).toBeNull()
  })

  test('locked: lock glyph, and the locked string shows even before playing', () => {
    renderScreen({ status: 'idle', lastString: null }, { locked: 'D3' })
    expect(screen.getByText('D3')).toBeInTheDocument()
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

  test('the settings button stays usable on the start screen', async () => {
    const { onStart, onOpenSettings } = renderScreen({ status: 'start' })
    await userEvent.click(screen.getByRole('button', { name: 'Settings: Standard' }))
    expect(onOpenSettings).toHaveBeenCalledOnce()
    expect(onStart).not.toHaveBeenCalled()
  })
})
