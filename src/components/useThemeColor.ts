import { useEffect } from 'react'

/**
 * Keeps the browser chrome in step with the screen. Safari tints its status bar and toolbar from
 * the page background (newer versions ignore theme-color), so both <html> and <body> follow too.
 */
export function useThemeColor(color: string) {
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
    document.documentElement.style.backgroundColor = color
    document.body.style.backgroundColor = color
  }, [color])
}
