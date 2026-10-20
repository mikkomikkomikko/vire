export const MAX_DISPLAY_CENTS = 99
/** The band stops growing here (360 px on an 844 px tall screen). */
export const MAX_BAND_CENTS = 50

export function formatCents(cents: number): { sign: string; value: string } {
  const rounded = Math.max(-MAX_DISPLAY_CENTS, Math.min(MAX_DISPLAY_CENTS, Math.round(cents)))
  return { sign: rounded > 0 ? '+' : rounded < 0 ? '-' : '', value: String(Math.abs(rounded)) }
}
