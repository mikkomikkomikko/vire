export const MAX_DISPLAY_CENTS = 99
/** The string letter is at its blurriest from here on. */
export const MAX_BLUR_CENTS = 50

export function formatCents(cents: number): { sign: string; value: string } {
  const rounded = Math.max(-MAX_DISPLAY_CENTS, Math.min(MAX_DISPLAY_CENTS, Math.round(cents)))
  return { sign: rounded > 0 ? '+' : rounded < 0 ? '-' : '', value: String(Math.abs(rounded)) }
}
