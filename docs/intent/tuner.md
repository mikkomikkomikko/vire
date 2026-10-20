# Vire — confirmed intent

Design: https://app.paper.design/file/01M5828FGPE0Q5JKSQMVZB3CV4/p-2-0 (artboards "04 - in tune", "04 - sharp", "04 - flat", 390×844)

- **Outcome:** Guitar/ukulele tuner web app matching the Paper design. Three states: green check when in tune, +cents when sharp, −cents when flat. Note name + Hz bottom-left; tuning name bottom-right opens settings.
- **User:** Primarily the author on an iPhone home-screen bookmark (fullscreen launch via standalone web-app meta tags). Public, so it must also work as a normal responsive site on any device.
- **Settings sheet** (opened from the tuning label, e.g. "Standard"):
  - Instrument: Guitar / Ukulele
  - Tuning (per instrument): Guitar Standard, Drop D, DADGAD, Open G, more alternates; Ukulele GCEA with re-entrant high G4 as default
  - String: Auto (default) or lock one string (e.g. E2) — for noisy environments and new strings; locked state shows a lock marker next to the note
  - Capo: fret 0–N. Label keeps the open-string name (E2) while detection targets the transposed pitch (capo 2 → F#2, ~92.50 Hz)
  - All settings persisted in localStorage
- **Success:** Tuning a real guitar works on the phone, including a locked string in a noisy room, and screens match the Paper artboards.
- **Constraints:** Vite + React + TypeScript; hosted on Vercel; open source on GitHub (MIT). iOS Safari requires a tap-to-start gesture before mic access.
- **Assumptions:** In tune = within ±2 cents (first ±5; tightened after device testing). Pitch detection in-browser, no backend. Desktop shows a centered phone-width column.
- **Out of scope (v1):** Offline/PWA install, custom user-defined tunings, other instruments (bass etc.), reference-tone playback, accounts/backend.
