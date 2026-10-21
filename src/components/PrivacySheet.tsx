import { useEffect, useRef } from 'react'
import { BUFFER_SIZE } from '../audio/detector'
// The same sheet as Settings, so the two feel like one app.
import sheet from './SettingsSheet.module.css'
import styles from './PrivacySheet.module.css'

type Props = { open: boolean; onClose: () => void }

/**
 * What Vire does with the microphone, for anyone deciding whether to allow it. Every claim here
 * must stay true of the code: "nothing leaves the device" means no network code in the audio path,
 * no analytics, no recordings.
 */
export function PrivacySheet({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className={sheet.sheet}
      aria-labelledby="privacy-title"
      onClose={onClose}
      onClick={(event) => {
        // Clicks on the dialog element itself land on the backdrop.
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={sheet.content}>
        <div className={sheet.top}>
          <div className={sheet.grabber} aria-hidden />
          <header className={sheet.header}>
            <h2 id="privacy-title" className={sheet.title}>
              Your audio stays yours
            </h2>
            <button type="button" className={sheet.done} onClick={onClose}>
              Done
            </button>
          </header>
        </div>

        <section className={sheet.section}>
          <h3 className={styles.heading}>The microphone</h3>
          <p className={styles.text}>
            When you tap to start, your browser asks for the microphone. Vire reads the sound through
            the browser’s own audio engine, {BUFFER_SIZE} samples at a time, about a tenth of a
            second. Nothing is recorded: each slice is overwritten by the next.
          </p>
        </section>

        <section className={sheet.section}>
          <h3 className={styles.heading}>Nothing leaves your device</h3>
          <p className={styles.text}>
            Once the page has loaded, Vire sends nothing over the network: no audio, no analytics, no
            accounts. Your settings are saved in this browser, and nowhere else.
          </p>
        </section>
      </div>
    </dialog>
  )
}
