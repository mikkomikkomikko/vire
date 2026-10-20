# Spec: Vire

Source of intent: [docs/intent/tuner.md](docs/intent/tuner.md)
App name: **Vire** (Finnish for "tuning"; _vireessä_ = "in tune"). Used for `<title>`, the manifest, the README and the GitHub repo `vire`.
Design: Paper file "Guitar tuner", Page 2 — artboards `04 - in tune`, `04 - sharp`, `04 - flat` (390×844).

## Objective

A browser-based chromatic-to-string tuner for guitar and ukulele. It listens to the microphone, works out which string you're playing (or uses the one you locked), and shows how many cents you are off. It looks like the Paper design: one huge number, a band that grows from the centre line, and a mint screen with a check mark when you're in tune.

Primary user: the author, on an iPhone, launched fullscreen from a home-screen bookmark. Secondary: anyone on the public URL, on any modern phone or desktop browser.

### User stories

1. As a guitarist, I open the app, tap once to allow the mic, pluck a string, and immediately see which string it thinks I'm on and how far off I am.
2. In a noisy room, or with fresh strings that are far out, I lock the tuner to one string (e.g. E2) so it can't jump to another string.
3. With a capo on fret 2, I tune to the same string names I always use (E2, A2, …). The app silently targets the transposed pitches (F#2, B2, …).
4. I switch to ukulele (high-G GCEA) or to an alternate guitar tuning (Drop D, DADGAD, …) from the settings sheet.
5. Next time I open the app it remembers my instrument, tuning, string lock and capo.

## Functional requirements

### F1. Audio input

- Capture with `getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })`. Browser processing distorts pitch and level.
- The `AudioContext` is created/resumed only from a user gesture (iOS Safari requirement). See F7 Start state.
- Analysis buffer: 4096 samples (≈85 ms @ 48 kHz), hop ≈ every animation frame. This is enough periods for C2 (65.4 Hz), the lowest note in any built-in tuning.
- When the page is hidden (`visibilitychange`), suspend the context. Resume it when the page is visible again.

### F2. Pitch detection

- McLeod Pitch Method via the `pitchy` library (MIT).
- Reject a frame if RMS < noise gate (0.002 ≈ −54 dBFS, measured on a Mac's built-in mic in Safari with auto gain off; a quiet room reads ~0.0006) or clarity < 0.90. Clarity is the main noise guard.
- Smooth with the median of the last 5 accepted estimates. If no estimate is accepted for 1.5 s, return to Idle (F7).
- Reference pitch is A4 = 440 Hz (fixed in v1).

### F3. Target resolution

- `sounding(string) = string.freq × 2^(capo/12)`.
- **Auto mode (default):** target = the string in the current tuning whose _sounding_ pitch is nearest to the detected pitch, measured in cents. Switch to a new target only after it has been nearest for ≥150 ms (hysteresis against flicker between close strings, e.g. G3/B3). Ignore pitches more than 500 cents below the lowest or above the highest sounding string.
- **Locked mode:** target = the locked string, always. Accept pitches within ±900 cents of the target and ignore anything else (this helps in noisy rooms).
- `cents = 1200 × log2(detected / sounding(target))`, rounded to an integer for display.

### F4. Tuning data

Note names are shown exactly as written below (sharps, except tunings that are defined with flats).

| Instrument | Tuning (label) | Strings low → high                |
| ---------- | -------------- | --------------------------------- |
| Guitar     | Standard       | E2 A2 D3 G3 B3 E4                 |
| Guitar     | Drop D         | D2 A2 D3 G3 B3 E4                 |
| Guitar     | Half Step Down | Eb2 Ab2 Db3 Gb3 Bb3 Eb4           |
| Guitar     | Drop C         | C2 G2 C3 F3 A3 D4                 |
| Guitar     | DADGAD         | D2 A2 D3 G3 A3 D4                 |
| Guitar     | Open G         | D2 G2 D3 G3 B3 D4                 |
| Guitar     | Open D         | D2 A2 D3 F#3 A3 D4                |
| Guitar     | Open E         | E2 B2 E3 G#3 B3 E4                |
| Ukulele    | Standard       | G4 C4 E4 A4 (re-entrant, default) |
| Ukulele    | Low G          | G3 C4 E4 A4                       |
| Ukulele    | D Tuning       | A4 D4 F#4 B4                      |
| Ukulele    | Baritone       | D3 G3 B3 E4                       |

String lists are in physical order (ukulele G4 first even though it is higher than C4).

### F5. Settings (bottom sheet)

- Opened by tapping the bottom-right tuning label. It's a real `<button>` with an accessible name like "Settings: Standard".
- Sections, top to bottom:
  1. **Instrument**: segmented control, Guitar | Ukulele.
  2. **Tuning**: single-select list of the tunings for the selected instrument.
  3. **String**: chips `Auto` + one chip per string in the current tuning (physical order).
  4. **Capo**: stepper, 0 ("No capo") to 7.
- Changing the instrument resets the tuning to that instrument's Standard and String to Auto. Changing the tuning resets String to Auto. Capo is kept.
- Close via a backdrop tap, a close button, swipe/drag down (nice-to-have), or Esc. Focus is trapped while open and returns to the label on close.
- Detection keeps running behind the sheet.
- Persist `{ instrument, tuningId, lockedString | null, capo }` to `localStorage` under `vire.settings.v1`. Wrap every access in try/catch. If the value is missing or invalid, fall back to the defaults (Guitar / Standard / Auto / 0).

### F6. Main screen labels (bottom row)

- **Left:** the open-string name of the current target (e.g. `E2`) in 36/44 Inter Bold `#0E1A15`. When locked, a small lock glyph follows it. With a capo it still shows the open-string name, never the transposed note.
- **Next to it:** the detected frequency, 2 decimals (`82.98 Hz`), 16/20 Inter Regular `#4F5E57`. Shows `— Hz` while Idle.
- **Right:** the tuning label: the tuning name (`Standard`, `Drop D`), `Ukulele` for the standard ukulele tuning and `Ukulele <name>` for the others (`Ukulele Low G`), with `Capo N` on a second, smaller line (14/18) when capo > 0, so a long tuning name never hides it. Same type as the frequency; each line stays on one line.

### F7. Screen states

| State                          | Trigger                              | Visual                                                                                                               |
| ------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Start**                      | First load, or audio not yet running | Bottom row visible; centre shows a "Tap to start" prompt. Tapping anywhere outside the settings button starts audio. |
| **Permission denied / no mic** | `getUserMedia` rejects               | Centre message explaining how to enable the mic; tap to retry.                                                       |
| **Idle**                       | Running, no accepted pitch for 1.5 s | Neutral background `#F5F6F5`, no band, centre empty. Bottom row shows the last target, dimmed.                       |
| **Sharp**                      | cents > +5                           | Matches `04 - sharp`.                                                                                                |
| **Flat**                       | cents < −5                           | Matches `04 - flat`.                                                                                                 |
| **In tune**                    | \|cents\| ≤ 5                        | Matches `04 - in tune`.                                                                                              |

Hysteresis: enter In tune at |cents| ≤ 5 and leave it at |cents| > 8, so the screen doesn't flash at the boundary. Both are judged on the rounded (displayed) cents, so the state always agrees with the number on screen.

### F8. Cents visual (from the Paper design)

- Background `#F5F6F5` (sharp/flat). In tune: `#CFECDE`.
- **Band:** full-width bar anchored to the vertical centre line of the viewport. Its height is |cents| × unit, where unit = 7.2 px at an 844 px viewport height (i.e. `0.853vh` per cent), clamped at 50 cents, and never closer than 20 px to the bottom row so the note stays legible.
  - Sharp: the band grows **upward** from the centre line, `linear-gradient(180deg, #434343, #000000)` (darkest at the centre line).
  - Flat: the band grows **downward** from the centre line, `linear-gradient(180deg, #000000, #434343)`.
- **Number:** sign + integer (`+12`, `-6`), Inter Bold 169px / 204px line-height, white, `mix-blend-mode: difference`, centred on the viewport. It shows black on the light background and white over the band. Values beyond ±99 display as `+99` / `-99`. Use Inter's default proportional digits as in the design (tabular figures give the "1" a foot), and lift the sign by ~12 px (0.071em) as Paper does.
- **In tune:** a black check mark (✓, Inter Bold 169px or an SVG of the same weight) centred, with no band and no number.
- Transitions: band height and background colour animate over ~120 ms ease-out. Disable under `prefers-reduced-motion`.

### F9. Layout & platform

- Full-viewport single screen (`100dvh`). On viewports wider than 480 px, content is a centred 390 px-wide column on the same background (the band spans the full window width).
- Bottom row: 24 px side padding and `max(56px, env(safe-area-inset-bottom) + 24px)` bottom padding.
- The iOS status bar in the artboards is device chrome. Don't render it.
- Home-screen launch: `viewport-fit=cover`, `apple-mobile-web-app-capable=yes`, `apple-mobile-web-app-status-bar-style=black-translucent` (the app draws under the status bar so the in-tune green fills the whole screen; iOS 26 only samples its own bar colour at launch, and in a Safari tab the bars stay at the load-time colour), `apple-touch-icon`, `theme-color`, and a minimal `manifest.webmanifest` (`name` and `short_name` "Vire") with `display: standalone` (no service worker; offline mode is out of scope).
- Inter is self-hosted via `@fontsource-variable/inter` (no third-party font requests).

## Tech Stack

- Vite (latest stable at scaffold), React 19, TypeScript (strict)
- `pitchy` for pitch detection
- `@fontsource-variable/inter`
- Styling: CSS Modules + one `tokens.css` with the design colours as custom properties. No CSS framework.
- Dev: Vitest, @testing-library/react, jsdom, oxlint (the current Vite template default, with the rules-of-hooks rule), Prettier
- Hosting: Vercel project `vire-tuner` (static build, default Vite preset; `vire.vercel.app` is taken). Source: public GitHub repo `vire`, MIT licence.

## Commands

```
npm install
npm run dev          # vite (localhost)
npm run dev:https    # vite --host --mode https  (LAN + self-signed HTTPS via @vitejs/plugin-basic-ssl, so the mic works on a phone)
npm run build        # tsc -b && vite build
npm run preview      # vite preview
npm test             # vitest run
npm run test:watch   # vitest
npm run lint         # oxlint
npm run format       # prettier --write .
```

## Project Structure

```
index.html                 → meta tags for home-screen fullscreen, manifest link
public/                    → icons, manifest.webmanifest
src/
  main.tsx, App.tsx
  audio/
    mic.ts                 → getUserMedia + AudioContext lifecycle (start, suspend, resume, stop)
    detector.ts            → pitchy wrapper: buffer → { freq, clarity } | null, noise gate
    smoothing.ts           → median filter, idle timeout
  music/
    notes.ts               → note name ↔ midi ↔ Hz, cents
    tunings.ts             → F4 table as typed data
    target.ts              → capo transposition, auto/locked target resolution, hysteresis
  state/
    settings.ts            → Settings type, defaults, validation, localStorage load/save
    useSettings.ts         → React hook
    useTuner.ts            → glues audio + music into a TunerState for the UI
  components/
    TunerScreen.tsx        → state → background/centre/bottom row
    CentsDisplay.tsx       → band + number
    InTuneMark.tsx
    BottomBar.tsx
    SettingsSheet.tsx
    StartPrompt.tsx
  styles/tokens.css, global.css
docs/intent/tuner.md
SPEC.md
```

Tests sit next to their source as `*.test.ts(x)`.

## Code Style

Pure logic stays in `music/` and `audio/` with no React imports. Components are thin. Use named exports, no default exports, and `type` over `interface` unless extending.

```ts
// music/target.ts
export type Target = { string: TuningString; cents: number }

export function resolveTarget(
  freq: number,
  tuning: Tuning,
  capo: number,
  locked: TuningString | null,
): Target | null {
  const candidates = locked ? [locked] : tuning.strings
  let best: Target | null = null
  for (const string of candidates) {
    const cents = centsBetween(freq, soundingFreq(string, capo))
    if (!best || Math.abs(cents) < Math.abs(best.cents)) best = { string, cents }
  }
  return best && Math.abs(best.cents) <= (locked ? 900 : 500) ? best : null
}
```

## Testing Strategy

- **Unit (Vitest)** for all of `music/` and `audio/smoothing.ts`: note/Hz conversions, every tuning's frequencies against reference values (±0.01 Hz), capo transposition (capo 2 → E2 targets 92.50 Hz), auto nearest-string selection, hysteresis, locked-mode range rejection, settings validation/migration.
- **Detector tests:** feed synthesized buffers (sine and sawtooth with harmonics, plus added noise) for E2, D2, C2, G4 and A4. Detected pitch must be within ±1 cent, and silence/noise must be rejected.
- **Component (Testing Library):** the settings sheet opens from the label, the resets in F5 happen, the lock marker appears, and the label text follows F6. TunerScreen renders each F7 state from a mocked `TunerState`.
- **Manual, on a real iPhone (required before calling v1 done):** home-screen launch is fullscreen; the mic starts after one tap; tune all six strings of a real guitar against a reference tuner, within ±2 cents of it; locked mode holds in a noisy room (TV/talking); capo 2 works.
- No coverage percentage target. Every function in `music/` has tests.

## Boundaries

- **Always:** keep pitch/music logic pure and unit-tested; run `npm test && npm run lint && npm run build` before each commit; take visual values from the Paper design (via Paper MCP), not from guesses or screenshots.
- **Ask first:** adding any dependency beyond the stack above; changing a design value or inventing visuals for undesigned states beyond F7's description; adding analytics, a backend, or a service worker.
- **Never:** send audio anywhere off-device; commit secrets/Vercel tokens; enable the browser's echo cancellation/noise suppression on the mic stream; let a localStorage failure break the app.

## Success Criteria

1. `npm run build` produces a static site that deploys to Vercel with no config beyond the default Vite preset.
2. All unit and component tests pass. The detector is within ±1 cent on synthesized E2/C2/G4/A4.
3. On an iPhone (Safari, launched from the home screen): fullscreen with no browser chrome, one tap starts the mic, and a guitar tuned with the app agrees with a reference clip-on tuner within ±2 cents per string.
4. Sharp/flat/in-tune screens visually match the three Paper artboards at 390×844 (colours, type sizes, band geometry).
5. The settings sheet opens from the tuning label, and every F5 rule (resets, persistence across reload) holds.
6. Capo 2 + Standard: plucking a correctly tuned (capo'd) low E shows `E2`, ±5 cents, the in-tune screen, and ~92.50 Hz.
7. Locked to E2: talking near the phone does not change the target or show stray values outside ±900 cents.
8. Works in current Chrome, Safari and Firefox on desktop as a centred column.

## Decisions (approved 2026-10-20)

1. **Undesigned states** (Start, Idle, Permission denied, Settings sheet) are built in the established style (Inter, `#F5F6F5`, `#0E1A15`/`#4F5E57`) and reviewed in the browser, with no Paper mocks first.
2. **In-tune threshold:** enter at |cents| ≤ 5, exit at > 8.
3. **Far-off display:** numbers clamp at `+99` / `-99`.
4. **Lock glyph:** small outline padlock after the note name.
5. **Licence:** MIT.

Spec approved. No open questions remain.
