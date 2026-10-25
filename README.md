# Vire

_Vire_ is Finnish for "tuning" — _vireessä_ means "in tune".

A minimal guitar and ukulele tuner for the browser. Pluck a string and Vire shows how many cents you are off; when you are in tune the screen turns green.

- Auto string detection, or lock to a single string for noisy rooms and fresh strings
- Guitar (Standard, Drop D, DADGAD, open tunings…) and ukulele (high-G GCEA and more)
- Capo support: keep tuning to the string names you know
- Runs entirely in the browser — audio never leaves your device

**Try it: https://vire-tuner.vercel.app** — works best saved to your phone's home screen.

## Development

```bash
npm install
npm run dev         # http://localhost:5173
npm run dev:https   # LAN + self-signed HTTPS, so the mic works on a phone
npm test
```

Dev-only URL switches: `?mock=sharp|flat|intune|idle|start|denied` (plus `&cents=30`) fixes the screen state, and `?tone=82.41` replaces the mic with a test tone.

Icons are generated from code: `node scripts/make-icons.mjs`.

See [SPEC.md](SPEC.md) for the full specification and [tasks/](tasks/) for the build plan.

## Built with

- [React](https://react.dev) + TypeScript, bundled with [Vite](https://vite.dev)
- [pitchy](https://github.com/ianprime0509/pitchy): pitch detection (McLeod Pitch Method) on the Web Audio mic stream
- [Hairline](https://www.npmjs.com/package/@lucasmarkes/hairline) by Lucas Marques (MIT): the kernel behind the start screen's microphone, vendored in [src/hairline/](src/hairline/); the mic itself is drawn from the [Lucide](https://lucide.dev) mic icon
- Fonts: [Geist Mono](https://vercel.com/font) and [Moirai One](https://fonts.google.com/specimen/Moirai+One), self-hosted via [Fontsource](https://fontsource.org)
- The spray effect on the cents number and string letter is a hand-written WebGL shader, no library
- Tests: [Vitest](https://vitest.dev), [Testing Library](https://testing-library.com) and jsdom; linting with [oxlint](https://oxc.rs), formatting with [Prettier](https://prettier.io)

## License

[MIT](LICENSE)
