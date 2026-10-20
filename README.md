# Vire

_Vire_ is Finnish for "tuning" — _vireessä_ means "in tune".

A minimal guitar and ukulele tuner for the browser. Pluck a string and Vire shows how many cents you are off; when you are in tune the screen turns green.

- Auto string detection, or lock to a single string for noisy rooms and fresh strings
- Guitar (Standard, Drop D, DADGAD, open tunings…) and ukulele (high-G GCEA and more)
- Capo support: keep tuning to the string names you know
- Runs entirely in the browser — audio never leaves your device

Works best saved to your phone's home screen.

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

## License

[MIT](LICENSE)
