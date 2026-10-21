import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PrivacySheet } from './PrivacySheet'

test('explains what happens to the audio, and closes with Done', async () => {
  const onClose = vi.fn()
  render(<PrivacySheet open onClose={onClose} />)
  const dialog = screen.getByRole('dialog', { name: 'Your audio stays yours' })
  expect(dialog).toHaveTextContent('4096 samples at a time')
  expect(dialog).toHaveTextContent('Vire sends nothing over the network')
  await userEvent.click(screen.getByRole('button', { name: 'Done' }))
  expect(onClose).toHaveBeenCalledOnce()
})
