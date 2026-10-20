import type { CSSProperties } from 'react'
import styles from './CentsDisplay.module.css'
import { formatCents, MAX_BAND_CENTS } from './formatCents'

export function CentsDisplay({ cents }: { cents: number }) {
  const { sign, value } = formatCents(cents)
  const band = Math.min(MAX_BAND_CENTS, Math.abs(Math.round(cents)))
  const direction = cents > 0 ? 'sharp' : 'flat'

  return (
    <>
      <div
        className={`${styles.band} ${styles[direction]}`}
        style={{ '--band-cents': band } as CSSProperties}
        data-testid="band"
      />
      <div className={styles.number} aria-label={`${sign}${value} cents ${direction}`}>
        <span className={styles.sign} aria-hidden>
          {sign}
        </span>
        <span aria-hidden>{value}</span>
      </div>
    </>
  )
}
