import { useEffect, useRef } from 'react'
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

/** How far the swell reaches, in chip pitches; past ~2 chips it's flat. */
const REACH = 1.2
/** Extra scale of the chip right at the focus. */
const SWELL = 0.3

export function BottomBar({ strings, locked, detected, onLock }: Props) {
  const groupRef = useRef<HTMLFieldSetElement>(null)
  const pointerX = useRef<number | null>(null)
  const frame = useRef(0)
  const names = [null, ...strings.map((s) => s.name)]
  // In auto the heard string is the focus whenever the pointer isn't over the row.
  const heard = !locked && detected ? names.indexOf(detected) : -1
  const heardRef = useRef(heard)

  // Runs at most once a frame and writes transforms only, so swelling costs no layout.
  // Distances are to each chip's resting centre (offsetLeft ignores transforms), so
  // the swell never feeds back into itself.
  const swell = () => {
    frame.current = 0
    const group = groupRef.current
    if (!group) return
    const chips = group.querySelectorAll<HTMLElement>(`.${styles.chip}`)
    const width = chips[0]?.offsetWidth ?? 0
    if (!width) return
    const pitch = chips.length > 1 ? chips[1].offsetLeft - chips[0].offsetLeft : width
    const centres = [...chips].map((chip) => chip.offsetLeft + width / 2)

    let focus: number | null = null
    if (pointerX.current !== null) {
      focus = pointerX.current - group.getBoundingClientRect().left + group.offsetLeft
    } else if (heardRef.current >= 0) {
      focus = centres[heardRef.current]
    }

    if (focus === null) {
      chips.forEach((chip) => (chip.style.transform = ''))
      return
    }
    const scales = centres.map((c) => {
      const d = (focus - c) / (pitch * REACH)
      return 1 + SWELL * Math.exp(-d * d)
    })
    // Lay the swollen chips out edge to edge so neighbours make room instead of being
    // overlapped, then slide the row so the point under the focus stays put.
    const gap = pitch - width
    let left = centres[0] - width / 2
    const laid = scales.map((s) => {
      const centre = left + (width * s) / 2
      left += width * s + gap
      return centre
    })
    const k = Math.min(chips.length - 1, Math.max(0, Math.round((focus - centres[0]) / pitch)))
    const anchor = focus - (laid[k] + (focus - centres[k]) * scales[k])
    chips.forEach((chip, i) => {
      const shift = laid[i] + anchor - centres[i]
      chip.style.transform = `translateX(${shift.toFixed(2)}px) scale(${scales[i].toFixed(4)})`
    })
  }

  const schedule = () => {
    if (!frame.current) frame.current = requestAnimationFrame(swell)
  }

  useEffect(() => {
    heardRef.current = heard
    schedule()
  }, [heard])
  // Chips have no size until the row is laid out, and their resting spots move on
  // resize or rotation; re-swell whenever the row changes size.
  useEffect(() => {
    const observer = new ResizeObserver(schedule)
    if (groupRef.current) observer.observe(groupRef.current)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame.current)
      frame.current = 0
    }
  }, [])

  return (
    <footer className={styles.bar}>
      <fieldset
        ref={groupRef}
        className={styles.strings}
        onPointerMove={(e) => {
          pointerX.current = e.clientX
          schedule()
        }}
        onPointerLeave={() => {
          pointerX.current = null
          schedule()
        }}
        onPointerCancel={() => {
          pointerX.current = null
          schedule()
        }}
      >
        <legend className={styles.legend}>String</legend>
        {names.map((name) => (
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
