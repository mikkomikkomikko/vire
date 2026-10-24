import { SprayCanvas, type DrawGlyphs } from './SprayCanvas'
import styles from './SprayNumber.module.css'

/** Draws the digits centred in a CSS line box, like the DOM digits underneath. */
const drawDigits: DrawGlyphs = (ctx, text, canvas, dpr) => {
  const style = getComputedStyle(canvas)
  const em = parseFloat(style.fontSize) * dpr
  ctx.font = `${style.fontWeight} ${em}px ${style.fontFamily}`
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  const m = ctx.measureText(text)
  const ascent = m.fontBoundingBoxAscent ?? em * 0.8
  const descent = m.fontBoundingBoxDescent ?? em * 0.2
  const line = parseFloat(style.lineHeight) * dpr || em * 1.207
  const height = ctx.canvas.height
  const baseline = height / 2 - line / 2 + (line - ascent - descent) / 2 + ascent
  ctx.fillText(text, ctx.canvas.width / 2, baseline)
  return { em, meltPx: 0 }
}

type Props = {
  /** What the number reads, e.g. "+12". */
  text: string
  /** 0 is crisp (in tune); 1 is as sprayed as it gets. */
  amount: number
  /** -1 flat, 1 sharp: which way the smear trails. */
  direction: number
  /** True once the canvas is drawing the number, so the DOM digits can step aside. */
  onReady: (ready: boolean) => void
}

/** The cents number, sprayed. Sits over the DOM digits, which keep the layout and the text. */
export function SprayNumber({ text, amount, direction, onReady }: Props) {
  return (
    <SprayCanvas
      from={text}
      to={text}
      mix={1}
      melt={0}
      amount={amount}
      direction={direction}
      draw={drawDigits}
      layer="number"
      maxDpr={2}
      className={styles.spray}
      onReady={onReady}
    />
  )
}
