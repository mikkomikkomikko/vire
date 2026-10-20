import styles from './StartPrompt.module.css'

const COPY = {
  start: {
    title: 'Tap to start',
    body: 'Vire listens through your microphone. Audio never leaves your device.',
  },
  denied: {
    title: 'Microphone unavailable',
    body: 'Allow microphone access for this site in your browser settings, then tap to try again.',
  },
}

export function StartPrompt({
  reason,
  onStart,
}: {
  reason: 'start' | 'denied'
  onStart: () => void
}) {
  const { title, body } = COPY[reason]
  return (
    <button type="button" className={styles.prompt} onClick={onStart}>
      <span className={styles.title}>{title}</span>
      <span className={styles.body}>{body}</span>
    </button>
  )
}
