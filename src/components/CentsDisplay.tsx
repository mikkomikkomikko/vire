import { useEffect } from 'react'
import styles from './CentsDisplay.module.css'
import { formatCents, MAX_BLUR_CENTS, MAX_DISPLAY_CENTS } from './formatCents'
import { StringLetter } from './StringLetter'
import { useHeld } from './useHeld'
import { useSpring } from './useSpring'

/** How long the number must show 0 before the screen turns moon grey. */
export const IN_TUNE_HOLD_MS = 2000

type Props = {
  cents: number
  /** The string being tuned, shown as a huge letter behind the number. */
  note: string
  /** Called with true once the number has shown 0 for IN_TUNE_HOLD_MS, false when it changes. */
  onInTune: (inTune: boolean) => void
}

export function CentsDisplay({ cents, note, onInTune }: Props) {
  // Moves like an analog meter's needle: every reading pulls it, so turning a peg shows at once,
  // while its inertia rides over a wavering string. The number and the letter's blur share it. The
  // end stop keeps a wild reading from flinging it.
  const shown = useSpring(Math.max(-MAX_DISPLAY_CENTS, Math.min(MAX_DISPLAY_CENTS, cents)))
  const { sign, value } = formatCents(shown)
  const direction = shown > 0 ? 'sharp' : 'flat'
  const label = value === '0' ? '0 cents' : `${sign}${value} cents ${direction}`
  // Sharp the moment the number reads 0, not a leftover fraction of a cent later. The square
  // root makes the first few cents off already look clearly soft.
  const blur =
    value === '0' ? 0 : Math.sqrt(Math.min(MAX_BLUR_CENTS, Math.abs(shown)) / MAX_BLUR_CENTS)
  // In tune follows the number you see, not the raw reading, so it never disagrees with it.
  const inTune = useHeld(value === '0', IN_TUNE_HOLD_MS)
  useEffect(() => onInTune(inTune), [inTune, onInTune])
  useEffect(() => () => onInTune(false), [onInTune])

  return (
    <>
      <StringLetter note={note} blur={Math.round(blur * 1000) / 1000} />
      {/* Monospaced, so the number doesn't shift as it counts or flips sign. */}
      <div className={styles.number} aria-label={label}>
        <span aria-hidden>
          {sign}
          {value}
        </span>
      </div>
    </>
  )
}
