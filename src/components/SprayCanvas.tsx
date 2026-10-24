import { useEffect, useLayoutEffect, useRef } from 'react'
import { onSprayParams, sprayParams } from './sprayParams'

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const VERTEX = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

/*
 * Each pixel averages the glyph mask at a handful of random offsets: a gaussian scatter (the
 * spray), a one-sided trail along x (the smear) and, apart, a heavier-scattered copy shifted the
 * other way (the ghost). Picking the offsets per pixel makes the softness itself grainy, and
 * dithering the result against noise stipples the edges like paint from a can. At amount 0 every
 * offset is zero, so the mask comes through untouched and the glyphs are crisp.
 *
 * The mask can be two glyphs mid-morph: cross-faded, blurred by `melt` and thresholded back to a
 * hard edge, so they merge like ink rather than fade.
 */
const FRAGMENT = `
precision highp float;
uniform sampler2D u_from;
uniform sampler2D u_to;
uniform float u_mix;
uniform float u_melt;
uniform float u_meltPx;
uniform vec2 u_size;
uniform float u_amount;
uniform float u_dir;
uniform float u_seed;
uniform float u_em;
uniform float u_grain;
uniform vec3 u_ink;
uniform float u_opacity;
uniform float u_spread;
uniform float u_trail;
uniform float u_core;
uniform float u_stipple;
uniform float u_ghost;
uniform vec2 u_ghostShift;
uniform float u_ghostSpread;
varying vec2 v_uv;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float mask(vec2 px) {
  vec2 uv = px / u_size;
  float to = texture2D(u_to, uv).a;
  if (u_mix >= 1.0) return to;
  return mix(texture2D(u_from, uv).a, to, u_mix);
}

vec2 gauss(vec2 cell, float i) {
  float u = max(hash(cell + vec2(i * 17.13, u_seed * 3.7)), 1e-4);
  float v = hash(cell + vec2(u_seed * 5.3, i * 29.71));
  return sqrt(-2.0 * log(u)) * vec2(cos(6.2832 * v), sin(6.2832 * v));
}

void main() {
  vec2 px = v_uv * u_size;
  vec2 cell = floor(px / u_grain);
  float a = u_amount;

  float spread = a * u_spread * u_em + u_melt * u_meltPx;
  float trail = a * u_trail * u_em;
  float cov = 0.0;
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    vec2 off = gauss(cell, fi) * spread;
    // Squared, so most of the ink stays near the glyph and the trail thins out.
    float t = hash(cell.yx + vec2(fi * 7.77, u_seed));
    off.x -= u_dir * t * t * trail;
    cov += mask(px + off);
  }
  cov /= 14.0;
  // Mid-morph: the melted glyphs are cut back to a hard edge where they overlap enough.
  cov = clamp(cov * (1.0 + 14.0 * u_melt) - 4.0 * u_melt, 0.0, 1.0);
  // Where most samples land on the glyph it stays solid ink, so the core reads; only the
  // thinner edges break up into spray.
  float spray = smoothstep(0.06, u_core, cov);

  float dither = hash(cell * 1.37 + u_seed * 13.0);
  float soft = smoothstep(0.0, 0.35, a);
  float alpha = mix(mix(cov, spray, soft), float(spray > dither), u_stipple * soft);

  vec2 shift = vec2(u_dir * u_ghostShift.x, -u_ghostShift.y) * u_em * a;
  float ghost = 0.0;
  for (int i = 0; i < 6; i++) {
    ghost += mask(px + shift + gauss(cell, float(i) + 40.0) * spread * u_ghostSpread);
  }
  ghost = float(ghost / 6.0 > dither) * u_ghost * smoothstep(0.1, 0.6, a);
  alpha = (1.0 - (1.0 - alpha) * (1.0 - ghost)) * u_opacity;

  gl_FragColor = vec4(u_ink * alpha, alpha);
}`

/**
 * Draws `text` in white onto `ctx`, which is cleared and the canvas's size, in device pixels.
 * Returns the em the effect scales with, and how far (device px) a full melt blurs.
 */
export type DrawGlyphs = (
  ctx: CanvasRenderingContext2D,
  text: string,
  canvas: HTMLCanvasElement,
  dpr: number,
) => { em: number; meltPx: number }

type Props = {
  /** Mid-morph, the glyphs being left; otherwise the same as `to`. */
  from: string
  to: string
  /** 0 shows `from`, 1 shows `to`. */
  mix: number
  /** How molten the morph is: 0 at rest. */
  melt: number
  /** 0 is crisp (in tune); 1 is as sprayed as it gets. */
  amount: number
  /** -1 flat, 1 sharp: which way the smear trails. */
  direction: number
  draw: DrawGlyphs
  /** The letter takes its own size and strength from the tweaks; the number is the reference. */
  layer: 'number' | 'letter'
  /** Sharper than this costs fill rate without looking any different through the grain. */
  maxDpr: number
  className: string
  /** True once the canvas is drawing, so the DOM version can step aside. */
  onReady: (ready: boolean) => void
}

type Gl = {
  gl: WebGLRenderingContext
  uniforms: Record<string, WebGLUniformLocation | null>
  textures: [WebGLTexture, WebGLTexture]
}

function setUp(canvas: HTMLCanvasElement): Gl | null {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false })
  if (!gl) return null
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    return shader
  }
  const program = gl.createProgram()!
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX))
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null
  gl.useProgram(program)

  // One triangle that covers the canvas.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const pos = gl.getAttribLocation(program, 'a_pos')
  gl.enableVertexAttribArray(pos)
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)

  const texture = (unit: number) => {
    const t = gl.createTexture()!
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }
  const textures: [WebGLTexture, WebGLTexture] = [texture(0), texture(1)]
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

  const names = [
    ...['u_from', 'u_to', 'u_mix', 'u_melt', 'u_meltPx', 'u_size', 'u_amount', 'u_dir', 'u_seed'],
    ...['u_em', 'u_grain', 'u_ink', 'u_opacity', 'u_spread', 'u_trail', 'u_core', 'u_stipple'],
    ...['u_ghost', 'u_ghostShift', 'u_ghostSpread'],
  ]
  const uniforms = Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(program, n)]))
  gl.uniform1i(uniforms.u_from, 0)
  return { gl, uniforms, textures }
}

/** "rgb(248, 245, 238)" → [0.97, 0.96, 0.93]. */
function parseColor(css: string): [number, number, number] {
  const [r = 255, g = 255, b = 255] = css.match(/[\d.]+/g)?.map(Number) ?? []
  return [r / 255, g / 255, b / 255]
}

/**
 * Glyphs drawn through a shader that sprays them like paint the further out of tune the string
 * is: grainy scattered edges, a smear trailing the way it's off, and a faint misprinted ghost.
 * The ink is the canvas's CSS `color`.
 */
export function SprayCanvas(props: Props) {
  const { layer, className, onReady } = props
  const canvas = useRef<HTMLCanvasElement>(null)
  const latest = useRef(props)
  // Set from the effect below; asks for a frame, redrawing the glyphs first if `force`.
  const request = useRef<(force: boolean) => void>(() => {})

  useLayoutEffect(() => {
    latest.current = props
    request.current(false)
  })

  useEffect(() => {
    const el = canvas.current!
    const ctx = setUp(el)
    const glyphs = document.createElement('canvas').getContext('2d')
    if (!ctx || !glyphs) return
    const { gl, uniforms, textures } = ctx
    const still = reducedMotion()
    let frame = 0
    let dirty = true
    let fading = false
    let lastSeed = -1
    let dpr = 1
    let em = 0
    let meltPx = 0
    // What each texture holds, so only a new glyph is drawn and uploaded.
    const held: [string | null, string | null] = [null, null]

    const upload = (unit: 0 | 1, text: string) => {
      glyphs.clearRect(0, 0, glyphs.canvas.width, glyphs.canvas.height)
      glyphs.save()
      ;({ em, meltPx } = latest.current.draw(glyphs, text, el, dpr))
      glyphs.restore()
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, textures[unit])
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, gl.ALPHA, gl.UNSIGNED_BYTE, glyphs.canvas)
      held[unit] = text
    }

    const sync = (force: boolean) => {
      if (force) {
        dpr = Math.min(latest.current.maxDpr, window.devicePixelRatio || 1)
        const width = Math.round(el.clientWidth * dpr)
        const height = Math.round(el.clientHeight * dpr)
        if (!width || !height) return
        // Each checked on its own: the glyph canvas is new on every mount, the GL one isn't.
        for (const c of [el, glyphs.canvas]) {
          if (c.width !== width) c.width = width
          if (c.height !== height) c.height = height
        }
        held[0] = held[1] = null
      }
      const { from, to } = latest.current
      if (held[1] !== to) upload(1, to)
      // At rest both are the same glyph, so the second texture isn't needed.
      if (from !== to && held[0] !== from) upload(0, from)
    }

    const draw = (now: number) => {
      const p = sprayParams
      const { direction, mix, melt, from, to } = latest.current
      const amount = p.amount >= 0 ? p.amount : latest.current.amount
      const letter = latest.current.layer === 'letter'
      const shimmer = !still && amount > 0 && p.shimmerFps > 0
      const seed = shimmer ? Math.floor((now / 1000) * p.shimmerFps) % 997 : 0
      if (dirty || fading || seed !== lastSeed) {
        dirty = false
        lastSeed = seed
        gl.viewport(0, 0, el.width, el.height)
        gl.uniform1i(uniforms.u_to, 1)
        gl.uniform1f(uniforms.u_mix, from === to ? 1 : mix)
        gl.uniform1f(uniforms.u_melt, melt)
        gl.uniform1f(uniforms.u_meltPx, meltPx)
        gl.uniform2f(uniforms.u_size, el.width, el.height)
        gl.uniform1f(uniforms.u_amount, amount)
        gl.uniform1f(uniforms.u_dir, direction)
        gl.uniform1f(uniforms.u_seed, seed)
        gl.uniform1f(uniforms.u_em, em * (letter ? p.letterScale : 1))
        gl.uniform1f(uniforms.u_opacity, letter ? p.letterOpacity : 1)
        gl.uniform1f(uniforms.u_grain, dpr * p.grain)
        gl.uniform1f(uniforms.u_spread, p.spread)
        gl.uniform1f(uniforms.u_trail, p.trail)
        gl.uniform1f(uniforms.u_core, p.core)
        gl.uniform1f(uniforms.u_stipple, p.stipple)
        gl.uniform1f(uniforms.u_ghost, p.ghost)
        gl.uniform2f(uniforms.u_ghostShift, p.ghostX, p.ghostY)
        gl.uniform1f(uniforms.u_ghostSpread, p.ghostSpread)
        // The ink can fade with the background, so it's read each frame rather than once.
        gl.uniform3f(uniforms.u_ink, ...parseColor(getComputedStyle(el).color))
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
      // Keep going while there's grain to shimmer or ink still fading; otherwise rest.
      const live = shimmer || fading
      frame = live ? requestAnimationFrame(draw) : 0
    }

    request.current = (force) => {
      sync(force)
      dirty = true
      if (!frame) frame = requestAnimationFrame(draw)
    }

    const parent = el.parentElement!
    const fadeStart = () => {
      fading = true
      request.current(false)
    }
    const fadeEnd = () => {
      fading = false
      request.current(false)
    }
    parent.addEventListener('transitionrun', fadeStart)
    parent.addEventListener('transitionend', fadeEnd)
    parent.addEventListener('transitioncancel', fadeEnd)

    const tweaked = onSprayParams(() => request.current(false))
    const resize = new ResizeObserver(() => request.current(true))
    resize.observe(el)
    let live = true
    // Drawn again once the fonts have loaded, in case a fallback font was drawn.
    document.fonts?.ready.then(() => live && request.current(true))
    const lost = (e: Event) => {
      e.preventDefault()
      onReady(false)
    }
    el.addEventListener('webglcontextlost', lost)

    request.current(true)
    onReady(true)

    return () => {
      live = false
      cancelAnimationFrame(frame)
      request.current = () => {}
      resize.disconnect()
      tweaked()
      parent.removeEventListener('transitionrun', fadeStart)
      parent.removeEventListener('transitionend', fadeEnd)
      parent.removeEventListener('transitioncancel', fadeEnd)
      el.removeEventListener('webglcontextlost', lost)
      onReady(false)
    }
  }, [onReady])

  return <canvas ref={canvas} className={className} data-layer={layer} aria-hidden />
}
