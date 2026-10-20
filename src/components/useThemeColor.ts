import { useEffect } from 'react'

/**
 * Keeps the page behind the app in step with the screen. Safari 26 ignores theme-color and only
 * samples the page background at load, so a Safari tab's bars won't follow live; the home-screen
 * app draws under the status bar instead (see index.html). theme-color is kept for other browsers.
 */
export function useThemeColor(color: string) {
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
    document.documentElement.style.backgroundColor = color
    document.body.style.backgroundColor = color
  }, [color])
}
