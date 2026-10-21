import { useEffect, useRef } from 'react'
import { mountPeg } from '../hairline/peg.js'
import styles from './PegFigure.module.css'

/** The tuning peg, turning on its own. Decorative: the prompt around it carries the meaning. */
export function PegFigure({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // jsdom has neither, and the figure's frame loop needs both
    if (!ref.current || typeof IntersectionObserver === 'undefined' || !window.matchMedia) return
    return mountPeg(ref.current)
  }, [])
  return <div ref={ref} className={`${styles.figure} ${className}`} aria-hidden="true" />
}
