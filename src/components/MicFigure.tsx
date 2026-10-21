import { useEffect, useRef } from 'react'
import { mountMic } from '../hairline/mic.js'
import styles from './MicFigure.module.css'

/**
 * The microphone, turning its head toward the pointer; `off`, it hangs its head instead. Decorative:
 * the prompt around it carries the meaning.
 */
export function MicFigure({ off = false, className = '' }: { off?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // jsdom has neither, and the figure's frame loop needs both
    if (!ref.current || typeof IntersectionObserver === 'undefined' || !window.matchMedia) return
    return mountMic(ref.current, { off })
  }, [off])
  return <div ref={ref} className={`${styles.figure} ${className}`} aria-hidden="true" />
}
