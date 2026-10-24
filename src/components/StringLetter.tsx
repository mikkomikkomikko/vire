import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import styles from './StringLetter.module.css'

/** How long one letter takes to melt into the next. */
export const MORPH_MS = 450
/** Under reduced motion the letters cross-fade instead, without melting. */
export const FADE_MS = 200

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** "E2" → E, "Eb2" → E + b, "F#3" → F + #: the octave goes, the accidental is set small. */
function splitNote(name: string) {
  const [, letter = name, accidental = ''] = /^([A-G])([#b]?)/.exec(name) ?? []
  return { letter, accidental }
}

/** Widest a letter may be, in viewBox units: the viewBox's width less room for the stroke. */
const MAX_WIDTH = 78

function Glyph({ name, opacity }: { name: string; opacity: number }) {
  const { letter, accidental } = splitNote(name)
  // Moirai One's capitals are 0.79em tall, so 126 fills the viewBox's height.
  const size = 126
  // Wide notes ("F#", or a wide capital on a narrow phone) shrink about the centre to fit.
  const text = useRef<SVGTextElement>(null)
  const [fit, setFit] = useState(1)
  useLayoutEffect(() => {
    const measure = () => {
      const width = text.current?.getBBox?.().width
      if (width) setFit(Math.min(1, MAX_WIDTH / width))
    }
    measure()
    // Measured again once Moirai One has loaded, in case the fallback font was measured.
    let live = true
    document.fonts?.ready.then(() => live && measure())
    return () => {
      live = false
    }
  }, [name])

  return (
    <text
      ref={text}
      x="0"
      y={size * 0.364}
      textAnchor="middle"
      fontSize={size}
      opacity={opacity}
      transform={`scale(${fit})`}
    >
      {letter}
      {accidental && (
        <tspan fontSize={size / 2} dy={size * -0.345}>
          {accidental}
        </tspan>
      )}
    </text>
  )
}

type Props = {
  /** The string being tuned, e.g. "E2". */
  note: string
  /** 0 is sharp-edged (in tune); 1 is as soft as it gets. */
  blur: number
}

/**
 * The string's letter, huge, behind the number. It goes soft the further out of tune the string
 * is and comes into focus as it nears 0. A new string melts into it: both letters are blurred
 * and their alpha is thresholded back to a hard edge, so they merge like ink rather than
 * cross-fading.
 */
export function StringLetter({ note, blur }: Props) {
  const [morph, setMorph] = useState({ from: note, to: note, t: 1, melts: true })
  const current = useRef(morph)
  useEffect(() => {
    current.current = morph
  })

  useEffect(() => {
    const { from, to, t } = current.current
    if (note === to) return
    // Interrupted mid-melt: carry on from whichever letter has the upper hand, as strong and as
    // molten as it is now, so the new letter takes the fading one's place rather than everything
    // snapping back sharp and melting again.
    const start = t < 0.5 ? from : to
    const resume = Math.min(t, 1 - t)
    const melts = !reducedMotion()
    const duration = melts ? MORPH_MS : FADE_MS
    let begun = -1
    let frame = requestAnimationFrame(function step(now) {
      if (begun < 0) begun = now
      const t = Math.min(1, resume + (now - begun) / duration)
      setMorph({ from: start, to: note, t, melts })
      if (t < 1) frame = requestAnimationFrame(step)
    })
    return () => cancelAnimationFrame(frame)
  }, [note])

  const eased = morph.t * morph.t * (3 - 2 * morph.t)
  // How molten it is: 0 at either end, so at rest the filter passes the letter through untouched.
  const melt = morph.melts ? Math.sin(Math.PI * morph.t) : 0

  return (
    <svg
      className={styles.letter}
      viewBox="-40 -50 80 100"
      style={{ '--letter-blur': blur } as CSSProperties}
      aria-hidden
      data-testid="letter"
      data-note={morph.to}
    >
      <defs>
        <filter id="string-letter-goo" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={melt * 1.6} result="soft" />
          <feColorMatrix
            in="soft"
            type="matrix"
            values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${1 + melt * 14} ${-melt * 4}`}
            result="goo"
          />
          {/* Film grain, so the letter reads as a print rather than a flat fill. */}
          <feTurbulence type="fractalNoise" baseFrequency="2.4" numOctaves="2" seed="3" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.4 0 0 0 -0.1"
            result="grain"
          />
          <feComposite in="goo" in2="grain" operator="arithmetic" k1="0.45" k2="0.55" />
        </filter>
      </defs>
      <g filter="url(#string-letter-goo)">
        {morph.t < 1 && <Glyph name={morph.from} opacity={1 - eased} />}
        <Glyph name={morph.to} opacity={eased} />
      </g>
    </svg>
  )
}
