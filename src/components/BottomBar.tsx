import type { TuningString } from '../music/tunings'
import styles from './BottomBar.module.css'

type Props = {
  strings: readonly TuningString[]
  /** Name of the locked string, or null for auto. */
  locked: string | null
  /** The string auto mode is hearing, marked on its chip. */
  detected: string | null
  tuning: string
  capo: number
  onLock: (name: string | null) => void
  onOpenSettings: () => void
}

export function BottomBar({
  strings,
  locked,
  detected,
  tuning,
  capo,
  onLock,
  onOpenSettings,
}: Props) {
  return (
    <footer className={styles.bar}>
      <fieldset className={styles.strings}>
        <legend className={styles.legend}>String</legend>
        {[null, ...strings.map((s) => s.name)].map((name) => (
          <label
            key={name ?? 'auto'}
            className={`${styles.chip} ${!locked && name && name === detected ? styles.detected : ''}`}
          >
            <input
              type="radio"
              name="string"
              className={styles.radio}
              checked={locked === name}
              onChange={() => onLock(name)}
            />
            {name ?? 'Auto'}
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        className={styles.settings}
        onClick={onOpenSettings}
        aria-label={`Settings: ${tuning}${capo > 0 ? `, capo ${capo}` : ''}`}
      >
        <span className={styles.tuning}>{tuning}</span>
        {/* On its own line so a long tuning name never pushes the capo out of view. */}
        {capo > 0 && <span className={styles.capo}>Capo {capo}</span>}
      </button>
    </footer>
  )
}
