# Tasks: Vire v1

See [plan.md](plan.md) and [SPEC.md](../SPEC.md).

## 0. Repository

- [x] Task: `git init` (branch `main`), `.gitignore` (node_modules, dist, .vercel, .DS_Store), MIT `LICENSE`, short `README.md` titled "Vire"; commit the existing docs (SPEC.md, docs/, tasks/); create a **public** GitHub repo `vire` with `gh repo create --public --source . --push`
  - Acceptance: repo is public on GitHub, `main` is pushed and has the spec and plan; every following task ends with a commit + push
  - Verify: `gh repo view --web`
  - Files: .gitignore, LICENSE, README.md

## 1. Foundation

- [x] Task: Scaffold Vite + React 19 + TS (strict), Vitest + Testing Library + jsdom, oxlint, Prettier, `@fontsource-variable/inter`, `pitchy`, `@vitejs/plugin-basic-ssl`; `styles/tokens.css` with design colours
  - Acceptance: npm scripts from SPEC "Commands" exist and run
  - Verify: `npm run build && npm test && npm run lint`
  - Files: package.json, vite.config.ts, tsconfig*.json, .oxlintrc.json, .prettierrc, src/main.tsx, src/App.tsx, src/styles/*

## 2. Pure logic

- [x] Task: `music/notes.ts`: parse note names (incl. `#`/`b`), name ↔ midi ↔ Hz (A4=440), `centsBetween`
  - Acceptance: E2=82.41, A4=440.00, Eb2=77.78 Hz; cents symmetric
  - Verify: `npm test notes`
  - Files: src/music/notes.ts, notes.test.ts
- [x] Task: `music/tunings.ts`: F4 table as typed data, guitar + ukulele, ids stable
  - Acceptance: every string's Hz matches reference ±0.01; ukulele Standard is G4 C4 E4 A4
  - Verify: `npm test tunings`
  - Files: src/music/tunings.ts, tunings.test.ts
- [x] Task: `music/target.ts`: `soundingFreq` (capo), `resolveTarget` auto/locked with range limits, stateful auto-switch hysteresis (150 ms), in-tune hysteresis (≤2 enter, >4 exit; was ≤5/>8)
  - Acceptance: capo 2 E2 → 92.50 Hz; G3/B3 no flicker; locked rejects >±900 cents; auto rejects >500 cents outside range
  - Verify: `npm test target`
  - Files: src/music/target.ts, target.test.ts
- [x] Task: `state/settings.ts` + `useSettings.ts`: type, defaults, validation, `vire.settings.v1` load/save with try/catch, F5 reset rules
  - Acceptance: corrupt/missing/throwing storage → defaults; instrument change resets tuning+string; tuning change resets string; capo kept
  - Verify: `npm test settings`
  - Files: src/state/settings.ts, useSettings.ts, settings.test.ts
- [x] Task: `audio/detector.ts` + `smoothing.ts`: pitchy wrapper with RMS gate + clarity ≥0.90; median-of-5; 1.5 s idle timeout
  - Acceptance: synthesized sine/sawtooth (+noise) E2, D2, C2, G4, A4 within ±1 cent; silence and white noise → null
  - Verify: `npm test detector smoothing`
  - Files: src/audio/detector.ts, smoothing.ts, *.test.ts, src/test/synth.ts

**Checkpoint A:** all tests green. ✅ Passed 2026-10-20: 175 tests, detector within ±1 cent on C2–A4 (sine, sawtooth, sawtooth + noise, 44.1 kHz).

## 3. Visuals on mock state

- [x] Task: `TunerScreen`, `CentsDisplay` (band + blended number, ±99 clamp, tabular nums), `InTuneMark`, `BottomBar` (note, lock glyph, Hz, tuning label per F6); dev-only `?mock=sharp|flat|intune|idle` query to render states
  - Acceptance: F7/F8 values exactly per spec; reduced-motion disables transitions
  - Verify: component tests + browser screenshots at 390×844 vs Paper artboards
  - Files: src/components/TunerScreen.tsx, CentsDisplay.tsx, InTuneMark.tsx, BottomBar.tsx, *.module.css, *.test.tsx

**Checkpoint B:** you review the screenshots against Paper.

## 4. Wire audio

- [x] Task: `audio/mic.ts` (built as `audio/input.ts`; dev `?tone=<Hz>` stand-in in `dev/tone.ts`) (start on gesture, no browser processing, suspend/resume on visibility, stop) + `state/useTuner.ts` (rAF loop → TunerState) + `StartPrompt` and permission-denied state
  - Acceptance: tap starts mic; denial shows retry message; hidden tab suspends
  - Verify: unit tests for useTuner with a fake detector; manual tuning via desktop mic
  - Files: src/audio/mic.ts, src/state/useTuner.ts, src/components/StartPrompt.tsx, App.tsx

**Checkpoint C:** a real guitar tunes via the desktop mic.

## 5. Settings sheet

- [x] Task: `SettingsSheet` (native `<dialog>`; swipe-to-dismiss not built): Instrument segmented, Tuning list, String chips (Auto + strings), Capo stepper 0–7; open from label button; backdrop/close/Esc; focus trap + return; detection continues behind
  - Acceptance: all F5 rules; settings survive reload
  - Verify: component tests + manual
  - Files: src/components/SettingsSheet.tsx, SettingsSheet.module.css, SettingsSheet.test.tsx, BottomBar.tsx

## 6. Platform

- [x] Task: `index.html` `<title>Vire</title>` + meta (viewport-fit=cover, apple-mobile-web-app-*, theme-color), `manifest.webmanifest` (name "Vire", standalone), apple-touch-icon + favicon, safe-area padding, >480 px centred column
  - Acceptance: F9
  - Verify: `npm run build`; iPhone home-screen launch via LAN HTTPS dev server
  - Files: index.html, public/*, src/styles/global.css

**Checkpoint D:** on-device checks from SPEC Success Criteria 3, 6, 7.

## 7. Ship (needs your go-ahead)

- [ ] Task: Connect the GitHub repo to a Vercel project named `vire-tuner`; verify the production URL on iPhone
  - Done 2026-10-20: project `vire-tuner` live at https://vire-tuner.vercel.app, auto-deploys from `main`. iPhone verification pending (Checkpoint D).
  - Acceptance: SPEC Success Criteria 1–8
  - Verify: production URL on iPhone + desktop browsers
  - Files: none (repo/hosting setup)
