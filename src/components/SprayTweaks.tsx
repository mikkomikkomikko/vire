import { useState } from 'react'
import { SPRAY_DEFAULTS, setSprayParams, sprayParams, type SprayParams } from './sprayParams'
import styles from './SprayTweaks.module.css'

const SLIDERS: [keyof SprayParams, string, number, number, number][] = [
  ['amount', 'amount (−1: cents)', -1, 1, 0.01],
  ['spread', 'spread (em)', 0, 0.2, 0.001],
  ['trail', 'smear (em)', 0, 1, 0.01],
  ['core', 'core', 0.1, 1, 0.01],
  ['stipple', 'stipple', 0, 1, 0.01],
  ['grain', 'grain (px)', 0.5, 6, 0.05],
  ['ghost', 'ghost', 0, 1, 0.01],
  ['ghostX', 'ghost x (em)', -0.5, 0.5, 0.01],
  ['ghostY', 'ghost y (em)', -0.5, 0.5, 0.01],
  ['ghostSpread', 'ghost scatter (×)', 0, 5, 0.05],
  ['shimmerFps', 'shimmer (fps)', 0, 60, 1],
  ['letterScale', 'letter size (×)', 0, 1, 0.01],
  ['letterOpacity', 'letter ink', 0, 1, 0.01],
]

/** `?tweak` (dev only): live sliders for the cents number's spray shader. */
export function SprayTweaks() {
  const [values, setValues] = useState<SprayParams>({ ...sprayParams })
  const [open, setOpen] = useState(true)
  const [copied, setCopied] = useState(false)

  const update = (next: Partial<SprayParams>) => {
    setSprayParams(next)
    setValues({ ...sprayParams })
    setCopied(false)
  }

  const copy = () => {
    const { amount: _, ...rest } = values
    void navigator.clipboard?.writeText(JSON.stringify(rest, null, 2)).then(() => setCopied(true))
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <button type="button" onClick={() => setOpen(!open)}>
          {open ? '▾' : '▸'} spray
        </button>
        {open && (
          <>
            <button type="button" onClick={copy}>
              {copied ? 'copied' : 'copy'}
            </button>
            <button type="button" onClick={() => update(SPRAY_DEFAULTS)}>
              reset
            </button>
          </>
        )}
      </div>
      {open &&
        SLIDERS.map(([key, label, min, max, step]) => (
          <label key={key} className={styles.row}>
            <span>{label}</span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={values[key]}
              onChange={(e) => update({ [key]: Number(e.target.value) })}
              onDoubleClick={() => update({ [key]: SPRAY_DEFAULTS[key] })}
            />
            <output>{values[key]}</output>
          </label>
        ))}
    </div>
  )
}
