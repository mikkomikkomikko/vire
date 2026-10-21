import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { loadSettings, saveSettings, type Settings } from '../state/settings'
import { useSettings } from '../state/useSettings'
import { SettingsSheet } from './SettingsSheet'

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [settings, update] = useSettings()
  const [open, setOpen] = useState(true)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open
      </button>
      <SettingsSheet
        open={open}
        settings={settings}
        onChange={update}
        onClose={() => {
          setOpen(false)
          onClose()
        }}
      />
    </>
  )
}

const group = (name: string) => within(screen.getByRole('group', { name }))
const checked = (name: string) =>
  group(name)
    .getAllByRole('radio')
    .filter((r) => (r as HTMLInputElement).checked)
    .map((r) => r.closest('label')!.textContent)

beforeEach(() => localStorage.clear())

test('shows the current settings', () => {
  render(<Harness />)
  expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
  expect(checked('Instrument')).toEqual(['Guitar'])
  expect(checked('Tuning')).toEqual(['StandardE A D G B E'])
  expect(screen.queryByRole('group', { name: 'String' })).toBeNull()
  expect(screen.getByText('No capo')).toBeInTheDocument()
})

test('switching to ukulele shows its tunings, resetting the lock', async () => {
  saveSettings({ instrument: 'guitar', tuningId: 'guitar-drop-d', lockedString: 'D2', capo: 3 })
  render(<Harness />)
  await userEvent.click(screen.getByRole('radio', { name: 'Ukulele' }))

  expect(checked('Tuning')).toEqual(['StandardG C E A'])
  expect(group('Tuning').getAllByRole('radio')).toHaveLength(4)
  expect(screen.getByText('Fret 3')).toBeInTheDocument()
  expect(loadSettings()).toEqual<Settings>({
    instrument: 'ukulele',
    tuningId: 'ukulele-standard',
    lockedString: null,
    capo: 3,
  })
})

test('changing tuning drops a locked string back to auto', async () => {
  saveSettings({ instrument: 'guitar', tuningId: 'guitar-standard', lockedString: 'A2', capo: 0 })
  render(<Harness />)
  await userEvent.click(screen.getByRole('radio', { name: /Drop D/ }))
  expect(loadSettings().lockedString).toBeNull()
})

test('capo stepper stays within 0–7', async () => {
  render(<Harness />)
  const down = screen.getByRole('button', { name: 'Capo down one fret' })
  const up = screen.getByRole('button', { name: 'Capo up one fret' })
  expect(down).toBeDisabled()

  for (let i = 0; i < 7; i++) await userEvent.click(up)
  expect(screen.getByText('Fret 7')).toBeInTheDocument()
  expect(up).toBeDisabled()

  await userEvent.click(down)
  expect(loadSettings().capo).toBe(6)
})

test('Done closes the sheet', async () => {
  const onClose = vi.fn()
  render(<Harness onClose={onClose} />)
  await userEvent.click(screen.getByRole('button', { name: 'Done' }))
  expect(onClose).toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('clicking the backdrop closes the sheet; clicks inside do not', async () => {
  const onClose = vi.fn()
  render(<Harness onClose={onClose} />)
  await userEvent.click(screen.getByText('Settings'))
  expect(onClose).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('dialog'))
  expect(onClose).toHaveBeenCalled()
})
