/** The spray shader's knobs. Lengths are in ems of the number's font size. */
export const SPRAY_DEFAULTS = {
  /** How far the gaussian scatter reaches at full amount. */
  spread: 0.04,
  /** How long the smear trails at full amount. */
  trail: 0.7,
  /** Where the softened edge turns solid: lower keeps more of the core as solid ink. */
  core: 0.45,
  /** 0 is a smooth blur; 1 is fully stippled. */
  stipple: 0.5,
  /** Size of one speck of grain, in CSS pixels. */
  grain: 0.5,
  /** How dark the ghost gets at full amount. */
  ghost: 0.45,
  /** How far the ghost is shifted: x along the smear (negative trails with it), y down. */
  ghostX: -0.12,
  ghostY: 0.21,
  /** The ghost's scatter, as a multiple of `spread`. */
  ghostSpread: 1.6,
  /** How often the grain reseeds while out of tune; 0 holds it still. */
  shimmerFps: 60,
  /** The letter's spray, smear and ghost, relative to its own size (the number's are 1 em). */
  letterScale: 0.35,
  /** How strong the letter's ink is; it sits behind the number. */
  letterOpacity: 0.55,
  /** Below 0, the amount follows the cents; 0–1 pins it, for judging one strength. */
  amount: -1,
}

export type SprayParams = typeof SPRAY_DEFAULTS

// Bumped when the defaults change, so values saved against the old ones don't hide the new.
const STORAGE_KEY = 'vire.sprayParams.2'

function load(): SprayParams {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (import.meta.env.DEV && saved) return { ...SPRAY_DEFAULTS, ...saved }
  } catch {
    // Storage blocked or unreadable: the defaults will do.
  }
  return { ...SPRAY_DEFAULTS }
}

/** Live values, read by the shader on every frame. Only the dev `?tweak` panel changes them. */
export const sprayParams: SprayParams = load()

const listeners = new Set<() => void>()

export function onSprayParams(listener: () => void) {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

export function setSprayParams(next: Partial<SprayParams>) {
  Object.assign(sprayParams, next)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sprayParams))
  } catch {
    // Not kept across reloads, but still live.
  }
  listeners.forEach((l) => l())
}
