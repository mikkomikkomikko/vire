import { MicFigure } from './MicFigure'
import styles from './StartPrompt.module.css'

const COPY = {
  start: {
    title: 'Tap to start',
    body: 'Then allow microphone access so Vire can hear your guitar. Audio stays on your device.',
  },
  resume: {
    title: 'Tap to continue',
    body: 'Your browser paused the mic. Tap once more to keep tuning.',
  },
  denied: {
    title: 'Microphone unavailable',
    body: 'Allow microphone access for this site in your browser settings, then tap to try again.',
  },
}

export function StartPrompt({
  reason,
  onStart,
  onPrivacy,
}: {
  reason: keyof typeof COPY
  onStart: () => void
  onPrivacy: () => void
}) {
  const { title, body } = COPY[reason]
  return (
    <>
      <button type="button" className={styles.prompt} onClick={onStart}>
        <MicFigure off={reason === 'denied'} className={styles.figure} />
        <span className={styles.title}>{title}</span>
        <span className={styles.body}>
          {/* One sentence a line, as long as the screen allows */}
          {body.split(/(?<=\.) /).map((sentence) => (
            <span key={sentence} className={styles.sentence}>
              {sentence}{' '}
            </span>
          ))}
        </span>
      </button>
      {/* A sibling, not inside the prompt, so reading about the mic doesn't start it. */}
      <button type="button" className={styles.privacy} onClick={onPrivacy}>
        How Vire uses your mic
      </button>
    </>
  )
}
