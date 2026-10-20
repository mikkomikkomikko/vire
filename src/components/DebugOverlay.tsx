import { useEffect, useState } from 'react'
import { NOISE_GATE_RMS } from '../audio/detector'
import { diagnostics } from '../audio/diagnostics'
import styles from './DebugOverlay.module.css'

/** `?debug` (works in production): live view of the audio path for diagnosing devices. */
export function DebugOverlay() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 250)
    return () => clearInterval(id)
  }, [])

  const d = diagnostics
  const rows: [string, string][] = [
    ['stage', d.stage],
    ['audio', d.contextState],
    ['rate', d.sampleRate ? `${d.sampleRate} Hz` : '-'],
    ['mic track', d.track],
    ['frames', String(d.frames)],
    ['level', `${d.rms.toFixed(4)} (gate ${NOISE_GATE_RMS})`],
    ['pitch', d.freq ? `${d.freq.toFixed(2)} Hz` : '-'],
  ]
  if (d.error) rows.push(['error', d.error])
  if (typeof navigator !== 'undefined') rows.push(['browser', navigator.userAgent])

  return (
    <dl className={styles.overlay}>
      {rows.map(([k, v]) => (
        <div key={k} className={styles.row}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}
