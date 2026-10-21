import { useEffect, type CSSProperties } from 'react'
import styles from './CentsDisplay.module.css'
import { formatCents, MAX_BAND_CENTS } from './formatCents'
import { useGlide } from './useGlide'
import { useHeld } from './useHeld'

/** How long the number must show 0 before the screen turns green. */
export const IN_TUNE_HOLD_MS = 2000

type Props = {
  cents: number
  /** Called with true once the number has shown 0 for IN_TUNE_HOLD_MS, false when it changes. */
  onInTune: (inTune: boolean) => void
}

export function CentsDisplay({ cents, onInTune }: Props) {
  // A new value twice a second, glided to over the next half second, so a wavering string reads
  // as one value drifting. A full second felt laggy when turning a peg quickly. The band and
  // number share it; the band passes through 0 to change side.
  const shown = useGlide(cents, 500)
  const { sign, value } = formatCents(shown)
  const direction = shown > 0 ? 'sharp' : 'flat'
  const label = value === '0' ? '0 cents' : `${sign}${value} cents ${direction}`
  // No band while the number reads 0, or the leftover fraction of a cent shows as a hairline.
  const band = value === '0' ? 0 : Math.min(MAX_BAND_CENTS, Math.abs(shown))
  // Green follows the number you see, not the raw reading, so it never disagrees with it.
  const inTune = useHeld(value === '0', IN_TUNE_HOLD_MS)
  useEffect(() => onInTune(inTune), [inTune, onInTune])
  useEffect(() => () => onInTune(false), [onInTune])

  return (
    <>
      <div
        className={`${styles.band} ${styles[direction]}`}
        style={{ '--band-cents': band } as CSSProperties}
        data-testid="band"
      />
      <div className={styles.number} aria-label={label}>
        {sign && (
          <span className={styles.sign} aria-hidden>
            {sign}
          </span>
        )}
        {/* One fixed-width cell per digit, so the number doesn't shift as it counts. */}
        {[...value].map((digit, i) => (
          <span key={i} className={styles.digit} aria-hidden>
            {digit}
          </span>
        ))}
      </div>
    </>
  )
}
