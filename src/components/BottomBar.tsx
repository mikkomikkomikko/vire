import type { TuningString } from '../music/tunings'
import styles from './BottomBar.module.css'

type Props = {
  strings: readonly TuningString[]
  /** Name of the locked string, or null for auto. */
  locked: string | null
  /** The string auto mode is hearing, marked on its chip. */
  detected: string | null
  onLock: (name: string | null) => void
}

export function BottomBar({ strings, locked, detected, onLock }: Props) {
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
    </footer>
  )
}
