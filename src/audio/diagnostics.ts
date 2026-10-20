/**
 * What the audio path is doing right now, for the `?debug` overlay. Written by the audio code,
 * read by the overlay; costs nothing when the overlay is off.
 */
export const diagnostics = {
  enabled: new URLSearchParams(window.location.search).has('debug'),
  stage: 'not started',
  contextState: '-',
  sampleRate: 0,
  track: '-',
  frames: 0,
  rms: 0,
  freq: 0,
  error: '',
}

export function stage(message: string) {
  diagnostics.stage = message
}
