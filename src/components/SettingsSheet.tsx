import { useEffect, useRef, useState } from 'react'
import { INSTRUMENTS, tuningsFor, type Instrument } from '../music/tunings'
import {
  currentTuning,
  MAX_CAPO,
  withCapo,
  withInstrument,
  withLockedString,
  withTuning,
  type Settings,
} from '../state/settings'
import styles from './SettingsSheet.module.css'

type Props = {
  open: boolean
  settings: Settings
  onChange: (change: (current: Settings) => Settings) => void
  onClose: () => void
}

const INSTRUMENT_LABEL: Record<Instrument, string> = { guitar: 'Guitar', ukulele: 'Ukulele' }

/** "E2 A2 D3…" → "E A D…" for the tuning list. */
const noteLetters = (names: string[]) => names.map((n) => n.replace(/-?\d+$/, '')).join(' ')

export function SettingsSheet({ open, settings, onChange, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const tuning = currentTuning(settings)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className={styles.sheet}
      aria-labelledby="settings-title"
      onClose={onClose}
      onClick={(event) => {
        // Clicks on the dialog element itself land on the backdrop.
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={styles.content} onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}>
        {/* Sticky, so Done is always within reach however far the options scroll. */}
        <div className={`${styles.top} ${scrolled ? styles.scrolled : ''}`}>
          <div className={styles.grabber} aria-hidden />
          <header className={styles.header}>
            <h2 id="settings-title" className={styles.title}>
              Settings
            </h2>
            <button type="button" className={styles.done} onClick={onClose}>
              Done
            </button>
          </header>
        </div>

        <fieldset className={styles.section}>
          <legend className={styles.legend}>Instrument</legend>
          <div className={styles.segmented}>
            {INSTRUMENTS.map((instrument) => (
              <label key={instrument} className={styles.segment}>
                <input
                  type="radio"
                  name="instrument"
                  className={styles.radio}
                  checked={settings.instrument === instrument}
                  onChange={() => onChange((s) => withInstrument(s, instrument))}
                />
                {INSTRUMENT_LABEL[instrument]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.section}>
          <legend className={styles.legend}>Tuning</legend>
          <div className={styles.list}>
            {tuningsFor(settings.instrument).map((t) => (
              <label key={t.id} className={styles.row}>
                <input
                  type="radio"
                  name="tuning"
                  className={styles.radio}
                  checked={t.id === tuning.id}
                  onChange={() => onChange((s) => withTuning(s, t.id))}
                />
                <span className={styles.rowName}>{t.name}</span>
                <span className={styles.rowNotes}>{noteLetters(t.strings.map((s) => s.name))}</span>
                <CheckGlyph />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.section}>
          <legend className={styles.legend}>String</legend>
          <div className={styles.chips}>
            {[null, ...tuning.strings.map((s) => s.name)].map((name) => (
              <label key={name ?? 'auto'} className={styles.chip}>
                <input
                  type="radio"
                  name="string"
                  className={styles.radio}
                  checked={settings.lockedString === name}
                  onChange={() => onChange((s) => withLockedString(s, name))}
                />
                {name ?? 'Auto'}
              </label>
            ))}
          </div>
          <p className={styles.hint}>
            {settings.lockedString
              ? `Only ${settings.lockedString} is measured. Handy in noisy rooms and with new strings.`
              : 'Detects the string you play.'}
          </p>
        </fieldset>

        <fieldset className={styles.section}>
          <legend className={styles.legend}>Capo</legend>
          <div className={styles.stepper}>
            <button
              type="button"
              className={styles.step}
              aria-label="Capo down one fret"
              disabled={settings.capo === 0}
              onClick={() => onChange((s) => withCapo(s, s.capo - 1))}
            >
              −
            </button>
            <output className={styles.capo} aria-live="polite">
              {settings.capo === 0 ? 'No capo' : `Fret ${settings.capo}`}
            </output>
            <button
              type="button"
              className={styles.step}
              aria-label="Capo up one fret"
              disabled={settings.capo === MAX_CAPO}
              onClick={() => onChange((s) => withCapo(s, s.capo + 1))}
            >
              +
            </button>
          </div>
          <p className={styles.hint}>
            Strings keep their open names; Vire tunes to the capoed pitch.
          </p>
        </fieldset>
      </div>
    </dialog>
  )
}

function CheckGlyph() {
  return (
    <svg className={styles.check} viewBox="0 0 16 16" aria-hidden>
      <path d="M3 8.5 6.5 12 13 4.5" />
    </svg>
  )
}
