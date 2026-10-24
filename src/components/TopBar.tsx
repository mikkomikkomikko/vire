import styles from './TopBar.module.css'

type Props = {
  tuning: string
  capo: number
  onOpenSettings: () => void
}

export function TopBar({ tuning, capo, onOpenSettings }: Props) {
  return (
    <header className={styles.bar}>
      <p className={styles.tuning}>
        <span className={styles.name}>{tuning}</span>
        {/* On its own line so a long tuning name never pushes the capo out of view. */}
        {capo > 0 && <span className={styles.capo}>Capo {capo}</span>}
      </p>
      <button type="button" className={styles.menu} onClick={onOpenSettings} aria-label="Settings">
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
    </header>
  )
}
