import { useEffect } from 'react'

/** Keeps the browser/status bar colour and the page behind the app in step with the screen. */
export function useThemeColor(color: string) {
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
    document.documentElement.style.backgroundColor = color
  }, [color])
}
