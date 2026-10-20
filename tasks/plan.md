# Plan: Vire v1

Implements [SPEC.md](../SPEC.md). Task list: [todo.md](todo.md).

## Components and dependencies

```
music/notes ──► music/tunings ──► music/target ──┐
state/settings ──────────────────────────────────┼──► state/useTuner ──► components ──► App
audio/detector ──► audio/smoothing ──► audio/mic ┘
```

- `music/*`, `state/settings` and `audio/detector`+`smoothing` are pure and independent of each other, so they can be built in any order.
- Components are built against a mocked `TunerState` first. That way the visuals can be matched to the Paper artboards before any audio exists.
- `useTuner` is the only place where audio, music and settings meet.

## Order

0. **Repository:** git init, licence and README; create the public GitHub repo `vire` and push the spec and plan. From here on, every task ends with a commit and a push.
1. **Foundation:** scaffold, tooling, tokens.
2. **Pure logic:** notes → tunings → target; settings; detector → smoothing. All test-first.
3. **Visuals on mock state:** main screen in all F7 states, compared with the Paper artboards.
4. **Wire audio:** mic lifecycle + `useTuner`, start/idle/denied states. This is the first real end-to-end slice (desktop mic).
5. **Settings sheet:** UI + persistence.
6. **Platform:** home-screen meta, manifest, icons, safe areas, desktop column.
7. **Ship:** connect the repo to Vercel as project `vire-tuner` (needs your go-ahead), then on-device verification.

## Checkpoints
- **After 2:** `npm test` is green, and the detector is within ±1 cent on synthesized E2/C2/G4/A4.
- **After 3:** browser screenshots at 390×844 match the three artboards (you review).
- **After 4:** tuning a real guitar works via the desktop mic.
- **After 6:** iPhone home-screen launch is fullscreen, the mic starts with one tap, and readings agree with a clip-on tuner within ±2 cents.

## Risks
| Risk | Mitigation |
|---|---|
| iOS Safari mic/AudioContext quirks (gesture, suspend on background, sample rate 48k vs 44.1k) | Create/resume only on tap; read `sampleRate` from the context; handle `visibilitychange`; test on-device early (checkpoint 4 via LAN HTTPS) |
| Octave errors on low strings (E2/C2 harmonics) | MPM clarity gate; synthesized sawtooth tests; median filter |
| Mic needs HTTPS on the phone during dev | `@vitejs/plugin-basic-ssl` + `vite --host` (spec'd dev command) |
| `mix-blend-mode: difference` rendering differs across browsers | Verify in Safari/Chrome/Firefox at checkpoint 3 |
