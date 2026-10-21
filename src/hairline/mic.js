// Mic: a microphone in its yoke, drawn with the Hairline kernel. The yoke swivels and the capsule
// tips toward the pointer, a voice at mouth height. Drawn with the hairline-create skill from the
// Lucide mic icon.
import { HL } from './kernel.js'

const {
  Cam, clamp, fit, hull, open, poly, prism, proj, rad, circ, unproj, spring, stepS,
  mk, pointer, put, register, disposer, solid, facing, reducedMotion,
} = HL;

const RC = 12, UP = 20, DN = 8;                     // the capsule's radius; its end spheres above and below the pivot
const ZP = 54, ZO = 46, RY = 28, TY = 3, RA = 2;    // pivot height, the yoke's arc centre and radius, its bar, the axle
const ZS = 15, RB = 20, ZB = 3, RST = 3;            // stem top, foot radius and height, stem radius
const FACE = -45, YAW = 55, NEAR = 60;              // the yoke's heading facing the viewer, how far it swivels from it; how far away a voice tips the capsule all the way
const REST = [30, 22];                              // at rest: the swivel off facing, and the tilt
const SWING = 20;                                   // a swivel this far off straightens the capsule until the yoke comes round
const SLUMP = [15, -150], STIR = 12;                // off: the swivel and the tilt it hangs at, back into the U clear of the arms; how far the yoke stirs toward a voice
const HEAVY = { k: 40, c: 12 };                     // off: a slow, heavy spring for the yoke, so a stir lags
// Off, the capsule is a pendulum on loose pivots: it holds for a moment, rocks back over upright,
// falls into the U behind the yoke's curve, and swings a couple of times, short of straight down
// so the head never crosses the curve. A spring can't fall like that, so it gets its own step: gravity by the sine of the
// angle, and a little friction.
const HOLD = 0.25, G = 32, F = 5.5;                 // seconds before the screws give, gravity (1/s²), friction (1/s)
const V = [Math.SQRT1_2 * 0.866, Math.SQRT1_2 * 0.866, 0.5];   // toward the camera
const D = 0.45;                                     // fills sit this far inside the outline, so the stroke shows whole

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const at = (o, ...t) => t.reduce((p, [v, s]) => [p[0] + v[0] * s, p[1] + v[1] * s, p[2] + v[2] * s], o);
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

/** `off` lets the capsule fall and hang face down, and answers with a small lift instead of an aim; `value` is then the most it lifts. */
function mount({ stage, svg, read }, value, off = false, own = true) {
  const bag = disposer();
  const C = Cam(45, 0.5, 2.7), fitPts = [[0, 0, ZP + UP + RC]];
  for (let k = 0; k < 8; k++) {
    const c = Math.cos((k * Math.PI) / 4), s = Math.sin((k * Math.PI) / 4);
    fitPts.push([RB * c, RB * s, 0], [31 * c, 31 * s, ZP + TY], [29 * c, 29 * s, 66 + RC]);
  }
  fit(C, fitPts, 200, 166);
  const P = proj(C), front = facing(C), S = C.S;
  let maxT = value, over = null;

  /** A projected sphere: its outline is a circle of r × S round its centre. */
  const disc = (c, r) => { const q = P(...c); return circ(r * S, 40).map((p) => [q[0] + p.u, q[1] + p.v]); };
  const pill = (a, b, r) => poly(hull(disc(a, r).concat(disc(b, r))));

  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, circ(RB, 40), circ(RB - 1.6, 40), 0, ZB));
  put(solid(g), prism(P, front, circ(RST, 16), circ(RST - 0.8, 16), ZB, ZS + 2));

  // The yoke in two halves, so the near arm can pass in front of the capsule.
  // Each half is a bent bar: a run of capsules, all stroked, then all filled
  // again just inside, which leaves only the bar's outline. The fills start a
  // step past the bottom, over the other half's start, so no seam shows there.
  const TH = []; for (let t = -3.75; t <= 90; t += 3.75) TH.push(rad(t));
  const half = [-1, 1].map(() => {
    const hg = mk("g", {}, g);
    const sil = TH.slice(2).map(() => mk("path", { class: "sil" }, hg));
    const fo = TH.slice(1).map(() => mk("path", { class: "fo" }, hg));
    return { hg, sil, fo };
  });
  const stub = [solid(g), solid(g)];
  const cap = solid(g);
  cap.sil.classList.add("hi");

  const home = off ? SLUMP : REST, opts = off ? HEAVY : undefined;
  const psi = spring(FACE + home[0], opts);
  // off: the capsule starts where the mic that was on rests, and falls
  const phi = off ? { x: REST[1], v: 0, t: SLUMP[1], hold: HOLD } : spring(REST[1]);
  let drawn = "", nearSide = 0, want = REST[1];

  /** One step of the pendulum, in small slices so the swing stays true; whether it still moves. */
  function swing(dt) {
    if (reducedMotion()) { phi.x = phi.t; phi.v = 0; phi.hold = 0; return false; }
    if (phi.hold > 0) { phi.hold -= dt; return true; }
    for (let n = Math.ceil(dt / 0.008), h = dt / n; n > 0; n--) {
      phi.v += (-G * (180 / Math.PI) * Math.sin(rad(phi.x - phi.t)) - F * phi.v) * h;
      phi.x += phi.v * h;
    }
    if (Math.abs(phi.x - phi.t) < 0.3 && Math.abs(phi.v) < 1) { phi.x = phi.t; phi.v = 0; return false; }
    return true;
  }

  function draw() {
    const key = psi.x.toFixed(2) + "," + phi.x.toFixed(2);
    if (key === drawn) return;
    drawn = key;
    const ps = rad(psi.x), ph = rad(phi.x);
    const ex = [Math.cos(ps), Math.sin(ps), 0], ey = [-Math.sin(ps), Math.cos(ps), 0];
    const a = [ey[0] * Math.sin(ph), ey[1] * Math.sin(ph), Math.cos(ph)];
    const pv = [0, 0, ZP];

    [-1, 1].forEach((sg, h) => {
      const pts = TH.map((t) => at([0, 0, ZO - RY * Math.cos(t)], [ex, sg * RY * Math.sin(t)])).concat([at(pv, [ex, sg * RY])]);
      const H = half[h];
      for (let i = 1; i < pts.length - 1; i++) {
        if (i > 1) H.sil[i - 2].setAttribute("d", pill(pts[i - 1], pts[i], TY));
        H.fo[i - 1].setAttribute("d", pill(pts[i - 1], pts[i], TY - D / S));
      }
      H.sil.at(-1).setAttribute("d", pill(pts.at(-2), pts.at(-1), TY));
      H.fo.at(-1).setAttribute("d", pill(pts.at(-2), pts.at(-1), TY - D / S));
      put(stub[h], { sil: pill(at(pv, [ex, sg * RY]), at(pv, [ex, sg * (RC - 0.5)]), RA), crease: "" });
    });

    // The capsule, and its one crease: the front of the ring where the grille meets the body.
    const b2 = [a[1] * ex[2] - a[2] * ex[1], a[2] * ex[0] - a[0] * ex[2], a[0] * ex[1] - a[1] * ex[0]];
    const band = [], N = 36;
    const vis = (k) => { const t = (k / N) * Math.PI * 2; return dot(at([0, 0, 0], [ex, Math.cos(t)], [b2, Math.sin(t)]), V) > 0; };
    let k0 = 0; while (!(vis(k0) && !vis(k0 - 1))) k0++;
    for (let k = k0; vis(k); k++) {
      const t = (k / N) * Math.PI * 2;
      band.push(P(...at(pv, [a, 2], [ex, (RC - 0.3) * Math.cos(t)], [b2, (RC - 0.3) * Math.sin(t)])));
    }
    put(cap, { sil: pill(at(pv, [a, UP]), at(pv, [a, -DN]), RC), crease: open(band) });

    // Paint order: the far arm and its axle, the capsule, then the near ones. When the head hangs
    // below the pivots on the viewer's side, it is in front of the near arm's curve, so it goes later.
    const near = dot(ex, V) >= 0 ? 1 : 0, ahead = Math.cos(ph) < 0 && Math.sin(ph) * dot(ey, V) > 0 ? 1 : 0;
    if (near * 2 + ahead !== nearSide) {
      nearSide = near * 2 + ahead;
      const far = 1 - near;
      if (ahead) g.append(half[far].hg, stub[far].g, half[near].hg, cap.g, stub[near].g);
      else g.append(half[far].hg, stub[far].g, cap.g, stub[near].g, half[near].hg);
    }
  }
  nearSide = -1;

  const B = register(stage, (dt) => {
    // On, a long swivel stands the capsule up first and tips it once the yoke has come round, so
    // the head never points the wrong way on the way.
    if (!off) phi.t = Math.abs(psi.x - psi.t) > SWING ? 0 : want;
    const m = stepS(psi, dt) | (off ? swing(dt) : stepS(phi, dt));
    draw();
    return !!m;
  });
  bag.add(B.unregister);

  function retarget() {
    if (off) {
      // Off, the head stays down: a voice only lifts it a little and stirs the yoke toward it.
      let turn = SLUMP[0], lift = 0;
      if (over) {
        turn += clamp(wrap((Math.atan2(over[1], over[0]) * 180) / Math.PI - 90 - FACE - turn), -STIR, STIR);
        lift = maxT * clamp(Math.hypot(over[0], over[1]) / NEAR, 0, 1);
      }
      psi.t = FACE + turn;
      phi.t = SLUMP[1] + lift;
      read.textContent = over ? `off ${Math.round(lift)}°` : "rest";
      B.wake();
      return;
    }
    let turn = REST[0], tilt = Math.min(REST[1], maxT);
    if (over) {
      // The yoke turns to face the voice's side, never further than YAW from facing the viewer,
      // so its U always shows; the way the yoke faces is the way the mic reads as looking. In
      // front, the capsule tips toward the voice. Going round behind (above, on screen), the yoke
      // comes back toward facing the viewer and the capsule tips over to lean back, looking up,
      // all the way back when the voice is straight behind. Both change smoothly, so nothing flips.
      const rel = wrap((Math.atan2(over[1], over[0]) * 180) / Math.PI - 90 - FACE);
      const u = Math.max(0, Math.abs(rel) - 90) / 90;   // 0 side-on, 1 straight behind
      turn = u > 0 ? Math.sign(rel) * YAW * (1 - u) : clamp(rel, -YAW, YAW);
      tilt = maxT * clamp(Math.hypot(over[0], over[1]) / NEAR, 0, 1) * (1 - 2 * u);
    }
    psi.t = FACE + turn;
    want = phi.t = tilt;
    read.textContent = over ? `aim ${Math.round(turn)}°·${Math.abs(Math.round(tilt))}°` : "rest";
    B.wake();
  }

  const look = (p) => { over = unproj(C, p[0], p[1], ZP); retarget(); };
  const away = () => { over = null; retarget(); };
  // `own` false: the host follows the pointer itself and calls look and away
  if (own) bag.add(pointer(stage, { move: look, leave: away }));
  bag.add(() => svg.replaceChildren());
  retarget();
  draw();

  return {
    set: (v) => { maxT = v; retarget(); },
    look,
    away,
    destroy: bag.dispose,
  };
}

/**
 * Draws the mic into `stage` at its width and a 5:4 ratio, and returns the tear-down. On, it tips
 * toward the pointer, 45° at most; `off`, its head falls, swings and hangs, and lifts 14° at most.
 * It follows the pointer anywhere on the page, not only over itself, and rests when the pointer
 * leaves the window or a touch ends.
 */
export function mountMic(stage, { off = false } = {}) {
  HL.inject(stage.getRootNode())
  stage.setAttribute('data-hairline', 'mic')
  const svg = HL.mk('svg', { viewBox: '0 0 400 320', 'aria-hidden': 'true' }, stage)
  const handle = mount({ stage, svg, read: { textContent: '' } }, off ? 14 : 45, off, false)
  const win = stage.ownerDocument.defaultView
  const move = (e) => {
    const r = svg.getBoundingClientRect()
    if (r.width) handle.look([((e.clientX - r.left) / r.width) * 400, ((e.clientY - r.top) / r.height) * 320])
  }
  const end = (e) => { if (e.pointerType !== 'mouse') handle.away() }
  const out = (e) => { if (!e.relatedTarget) handle.away() }
  win.addEventListener('pointermove', move, { passive: true })
  win.addEventListener('pointerup', end)
  win.addEventListener('pointercancel', end)
  win.document.addEventListener('pointerout', out)
  return () => {
    win.removeEventListener('pointermove', move)
    win.removeEventListener('pointerup', end)
    win.removeEventListener('pointercancel', end)
    win.document.removeEventListener('pointerout', out)
    handle.destroy()
    svg.remove()
    stage.removeAttribute('data-hairline')
  }
}
