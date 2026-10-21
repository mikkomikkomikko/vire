// Peg: a guitar tuning machine drawn with the Hairline kernel. The key turns on its own and the
// post follows it through the gear; the pointer's x over the figure sets the speed and the way.
// Drawn with the hairline-create skill.
import { HL } from './kernel.js'

const {
  Cam, circ, clamp, fillet, fit, hull, poly, prism, proj, rad, rings, ringAt,
  spring, stepS, disposer, mk, pointer, register, facing, put, solid, reducedMotion,
} = HL;

const RATIO = 6;                                  // key turns for one turn of the post
const SX = -3.6, SZ = 4, PX0 = 3.4, PY0 = 0;      // the key's shaft (along +y) and the post's centre
const PR = 3, ZF = 8, ZF1 = 9.4, ZTOP = 31, ZH = 27.5;
const Y0 = 9, Y1 = 11, Y2 = 20, BT = 1.7;         // housing face, collar end, button root, half the button's thickness
const DIAMOND = [[-9, -9], [11, -9], [14.25, -6.5], [9, 9], [-11, 9], [-14.25, 6.5]];
const EARS = [[-11.4, 6.2], [11.4, -6.2]];
const VIEW = [Math.sin(rad(45)) * 0.866, Math.cos(rad(45)) * 0.866, 0.5];   // toward the camera

/** A closed outline as a ring of samples with outward normals (the outline runs counter-clockwise). */
function ringOf(pts) {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    return { u: p[0], v: p[1], nu: ty / l, nv: -tx / l };
  });
}
const inset = (ring, b) => ring.map((q) => ({ ...q, u: q.u - q.nu * b, v: q.v - q.nv * b }));
const shift = (ring, x, y) => ring.map((q) => ({ ...q, u: q.u + x, v: q.v + y }));

/** A round bar lying along y, from y0 to y1: its silhouette and its near end. */
function bar(P, r, y0, y1) {
  const end = (y) => circ(r, 20).map((q) => P(SX + q.u, y, SZ + q.v));
  return { sil: poly(hull(end(y0).concat(end(y1)))), crease: poly(end(y1)) };
}

/** The button, a paddle 18 wide and 13 long turned th degrees about the shaft: its silhouette and the face turned up. */
function button(P, th) {
  const c = Math.cos(rad(th)), s = Math.sin(rad(th)), faces = [[], []];
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2, u = 9 * Math.cos(a) * (0.9 + 0.1 * Math.sin(a)), w = 6.5 + 6.5 * Math.sin(a);
    [-BT, BT].forEach((t, f) => faces[f].push(P(SX + u * c - t * s, Y2 + w, SZ + u * s + t * c)));
  }
  const up = -s * VIEW[0] + c * VIEW[2] >= 0 ? 1 : 0;   // the face whose normal looks at the camera
  return { sil: poly(hull(faces[0].concat(faces[1]))), crease: poly(faces[up]) };
}

/** The string hole, on whichever side of the post faces the camera at turn ph. */
function hole(P, front, ph) {
  const a0 = front({ nu: Math.cos(ph), nv: Math.sin(ph) }) ? ph : ph + Math.PI, pts = [];
  for (let k = 0; k < 16; k++) {
    const t = (k / 16) * Math.PI * 2, a = a0 + 0.42 * Math.cos(t);
    pts.push(P(PX0 + PR * Math.cos(a), PY0 + PR * Math.sin(a), ZH + 1.1 * Math.sin(t)));
  }
  return poly(pts);
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let top = value;
  const REST = 0.35;                               // at rest the key turns slowly, tightening

  const C = Cam(45, 0.5, 5.3);
  fit(C, [[-14.25, -9, 0], [14.25, -9, 0], [-14.25, 9, 0], [SX - 9, Y2 + 13, SZ], [SX + 9, Y2 + 13, SZ + 9], [PX0, PY0, ZTOP], [14.25, 6.5, 0]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);
  const body = (paths) => { const s = solid(g); put(s, paths); return s; };

  // the housing, the flange over it with its screw ears, the bushing, then the post
  const [hr, hi] = rings(-9, -9, 9.5, 9, 2, 1);
  body(prism(P, front, hr, hi, 0, ZF));
  const fl = ringOf(fillet(DIAMOND, [1.5, 1.5, 2.6, 1.5, 1.5, 2.6]));
  body(prism(P, front, fl, inset(fl, 0.8), ZF, ZF1));
  for (const [x, y] of EARS) mk("path", { d: poly(ringAt(P, shift(circ(1.25, 16), x, y), ZF1)), class: "nf" }, g);
  body(prism(P, front, shift(circ(4.6, 24), PX0, PY0), shift(circ(4, 24), PX0, PY0), ZF1, ZF1 + 1.4));
  body(prism(P, front, shift(circ(PR, 24), PX0, PY0), shift(circ(PR - 0.6, 24), PX0, PY0), ZF1 + 1.4, ZTOP));
  const holeEl = mk("path", { class: "nf" }, g);

  // the collar and the shaft, then the button on its end
  body(bar(P, 3.1, Y0, Y1));
  body(bar(P, 2, Y1, Y2 + 0.5));
  const btn = solid(g);
  btn.sil.classList.add("hi");

  const rate = spring(REST * top);
  let th = 28, ph = 0.6, drawn = null;
  function draw() {
    const key = Math.round(th * 10) / 10;
    if (key === drawn) return;
    drawn = key;
    put(btn, button(P, th));
    holeEl.setAttribute("d", hole(P, front, ph));
  }

  const B = register(stage, (dt) => {
    stepS(rate, dt);
    if (reducedMotion()) { draw(); return false; }
    const turn = rate.x * 360 * dt;               // degrees of the key this frame
    th = (th + turn) % 360;
    ph += rad(turn) / RATIO;
    draw();
    return true;                                  // ambient: the key never stops on its own
  });
  bag.add(B.unregister);

  /** The pointer's x as the key's rate: loosen to the left, tighten to the right, hold in the middle. */
  function take([x]) {
    const t = clamp((x - 200) / 140, -1, 1), r = Math.abs(t) < 0.08 ? 0 : t * top;
    rate.t = r;
    read.textContent = r === 0 ? "hold" : (r > 0 ? "tighten " : "loosen ") + Math.abs(r).toFixed(1) + "/s";
    B.wake();
  }
  function leave() { rate.t = REST * top; read.textContent = "rest"; B.wake(); }
  read.textContent = "rest";
  draw();

  bag.add(pointer(stage, { move: take, leave }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { top = v; if (read.textContent === "rest") rate.t = REST * v; B.wake(); },
    destroy: bag.dispose,
  };
}

/**
 * Draws the peg into `stage` at its width and a 5:4 ratio, and returns the tear-down. `turns` is the
 * key's fastest turn a second; at rest it turns at a third of that.
 */
export function mountPeg(stage, turns = 1) {
  HL.inject(stage.getRootNode())
  stage.setAttribute('data-hairline', 'peg')
  const svg = HL.mk('svg', { viewBox: '0 0 400 320', 'aria-hidden': 'true' }, stage)
  const handle = mount({ stage, svg, read: { textContent: '' } }, turns)
  return () => {
    handle.destroy()
    svg.remove()
    stage.removeAttribute('data-hairline')
  }
}
