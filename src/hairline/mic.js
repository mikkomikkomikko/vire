// Mic: a microphone in its yoke, drawn with the Hairline kernel. The yoke swivels and the capsule
// tips toward the pointer, a voice at mouth height. Drawn with the hairline-create skill from the
// Lucide mic icon.
import { HL } from './kernel.js'

const {
  Cam, clamp, fit, hull, open, poly, prism, proj, rad, circ, unproj, spring, stepS,
  mk, pointer, put, register, disposer, solid, facing,
} = HL;

const RC = 12, UP = 20, DN = 8;                     // the capsule's radius; its end spheres above and below the pivot
const ZP = 54, ZO = 46, RY = 28, TY = 3, RA = 2;    // pivot height, the yoke's arc centre and radius, its bar, the axle
const ZS = 15, RB = 20, ZB = 3, RST = 3;            // stem top, foot radius and height, stem radius
const FACE = -45, YAW = 40, NEAR = 60;              // the yoke's heading facing the viewer, how far it swivels from it; how far away a voice tips the capsule all the way
const REST = [30, 22];                              // at rest: the swivel off facing, and the tilt
const V = [Math.SQRT1_2 * 0.866, Math.SQRT1_2 * 0.866, 0.5];   // toward the camera
const D = 0.45;                                     // fills sit this far inside the outline, so the stroke shows whole

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const at = (o, ...t) => t.reduce((p, [v, s]) => [p[0] + v[0] * s, p[1] + v[1] * s, p[2] + v[2] * s], o);
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

function mount({ stage, svg, read }, value) {
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

  const psi = spring(FACE + REST[0]), phi = spring(REST[1]);
  let drawn = "", nearSide = 0;

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

    // Paint order: the far arm and its axle, the capsule, then the near ones.
    const near = dot(ex, V) >= 0 ? 1 : 0;
    if (near !== nearSide) {
      nearSide = near;
      const far = 1 - near;
      g.append(half[far].hg, stub[far].g, cap.g, stub[near].g, half[near].hg);
    }
  }
  nearSide = -1;

  const B = register(stage, (dt) => {
    const m = stepS(psi, dt) | stepS(phi, dt);
    draw();
    return !!m;
  });
  bag.add(B.unregister);

  function retarget() {
    let turn = REST[0], tilt = Math.min(REST[1], maxT);
    if (over) {
      // The yoke turns toward the voice, the short way, but never further than YAW
      // from facing the viewer, so its U always shows; behind it, the capsule tips back.
      turn = wrap((Math.atan2(over[1], over[0]) * 180) / Math.PI - 90 - FACE);
      tilt = maxT * clamp(Math.hypot(over[0], over[1]) / NEAR, 0, 1);
      if (Math.abs(turn) > 90) { turn -= Math.sign(turn) * 180; tilt = -tilt; }
      turn = clamp(turn, -YAW, YAW);
    }
    psi.t = FACE + turn;
    phi.t = tilt;
    read.textContent = over ? `aim ${Math.round(turn)}°·${Math.abs(Math.round(tilt))}°` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], ZP); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();
  draw();

  return {
    set: (v) => { maxT = v; retarget(); },
    destroy: bag.dispose,
  };
}

/**
 * Draws the mic into `stage` at its width and a 5:4 ratio, and returns the tear-down. `tilt` is the
 * furthest the capsule may tip toward the pointer, in degrees.
 */
export function mountMic(stage, tilt = 35) {
  HL.inject(stage.getRootNode())
  stage.setAttribute('data-hairline', 'mic')
  const svg = HL.mk('svg', { viewBox: '0 0 400 320', 'aria-hidden': 'true' }, stage)
  const handle = mount({ stage, svg, read: { textContent: '' } }, tilt)
  return () => {
    handle.destroy()
    svg.remove()
    stage.removeAttribute('data-hairline')
  }
}
