import styles from './BottomBar.module.css'

type Props = {
  note: string | null
  freq: number | null
  locked: boolean
  tuning: string
  capo: number
  dimmed?: boolean
  onOpenSettings: () => void
}

export function BottomBar({
  note,
  freq,
  locked,
  tuning,
  capo,
  dimmed = false,
  onOpenSettings,
}: Props) {
  return (
    <footer className={styles.bar}>
      <div className={`${styles.reading} ${dimmed ? styles.dimmed : ''}`}>
        {note && <span className={styles.note}>{note}</span>}
        {locked && <LockGlyph />}
        <span className={styles.secondary}>{freq === null ? '— Hz' : `${freq.toFixed(2)} Hz`}</span>
      </div>
      <button
        type="button"
        className={`${styles.secondary} ${styles.settings}`}
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

function LockGlyph() {
  return (
    <svg className={styles.lock} viewBox="0 0 16 16" role="img" aria-label="Locked">
      <rect x="3" y="7" width="10" height="7.5" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  )
}
