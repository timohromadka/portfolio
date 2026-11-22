// Procedural art drawn on one face of the landing cube.
//
// Every style is drawn with the same N "marks" (ink blobs, bars, dots,
// nodes), links between marks, and a background layer. Since every style
// uses the same primitives, a face can morph from whatever it currently
// shows into any other style:
//   notes  — inked, smeared notes on staves             (music)
//   midi   — crisp glitchy piano-roll bars               (cs, coming from music)
//   graph  — pen-traced ink sketch + leader-line graph   (cs)
//   dots   — colourful ink dots on wavy lines            (projects & play)

import { INK, hexToRgb, rng, clamp } from './util.js';

const N = 44;
const PROPS_A = ['round', 'rough', 'hollow', 'halo', 'glitch', 'cross', 'r', 'g', 'b', 'a'];
const PROPS_B = ['x', 'y', 'w', 'h'];
const SEG = 32;
const GLYPHS = 'ADEGHIKLMNORSTUVWY';

const mark = (o) => ({
  x: 0.5, y: 0.5, w: 0, h: 0, round: 0, rough: 0, hollow: 0, halo: 0,
  glitch: 0, cross: 0, r: 22, g: 22, b: 22, a: 1, ...o,
});

// ── layouts ─────────────────────────────────────────────────

const STAVES = [0.14, 0.32, 0.5, 0.68, 0.86];

function noteMark(R) {
  const y0 = STAVES[Math.floor(R() * STAVES.length)];
  const k = R();
  if (k < 0.68) {
    const w = 0.05 + R() * 0.13;
    return mark({ x: 0.1 + w / 2 + R() * (0.78 - w), y: y0 + (R() - 0.5) * 0.06, w, h: 0.014 + R() * 0.02, round: 0.35, rough: 1, a: 0.92 });
  }
  if (k < 0.88) {
    return mark({ x: 0.12 + R() * 0.76, y: y0 + (R() - 0.5) * 0.04, w: 0.006 + R() * 0.004, h: 0.06 + R() * 0.1, round: 0.5, rough: 0.7, a: 0.85 });
  }
  return mark({ x: 0.1 + R() * 0.8, y: y0 + (R() - 0.5) * 0.05, w: 0.012, h: 0.012, round: 1, rough: 0.4, a: 0.9 });
}

function midiMark(R, i) {
  const y = 0.1 + (i / (N - 1)) * 0.8;
  const left = 0.06 + R() * 0.38;
  const right = Math.min(0.92, 0.5 + R() * 0.38);
  const w = Math.max(0.04, right - left) * (R() < 0.3 ? 0.35 : 1);
  return mark({ x: left + w / 2, y, w, h: 0.005 + R() * 0.012, round: 0, rough: 0, glitch: 1, r: 8, g: 8, b: 8, a: 1 });
}

function layout(style, seed) {
  const R = rng(seed);
  const L = { marks: [], links: [], layer: style, extra: null };

  if (style === 'notes') {
    for (let i = 0; i < N; i++) L.marks.push(noteMark(R));
  } else if (style === 'midi') {
    for (let i = 0; i < N; i++) L.marks.push(midiMark(R, i));
  } else if (style === 'graph') {
    // a few hubs with leader lines radiating out to tiny black squares,
    // circles and survey crosses — like an annotated site drawing
    const H = 4;
    const hubs = Array.from({ length: H }, () => [0.2 + R() * 0.6, 0.18 + R() * 0.64]);
    for (let i = 0; i < N; i++) {
      if (i < H) {
        L.marks.push(mark({ x: hubs[i][0], y: hubs[i][1], w: 0.022, h: 0.022, round: 1, hollow: 1, r: 18, g: 18, b: 18 }));
        continue;
      }
      const h = hubs[i % H], ang = R() * Math.PI * 2, d = 0.08 + R() * 0.3;
      const x = clamp(h[0] + Math.cos(ang) * d, 0.04, 0.96), y = clamp(h[1] + Math.sin(ang) * d, 0.04, 0.96);
      const k = R();
      if (k < 0.62) L.marks.push(mark({ x, y, w: 0.009 + R() * 0.007, h: 0.009 + R() * 0.007, round: 0, r: 14, g: 14, b: 14 }));
      else if (k < 0.8) { const s = 0.008 + R() * 0.01; L.marks.push(mark({ x, y, w: s, h: s, round: 1, hollow: 1, r: 30, g: 30, b: 30, a: 0.85 })); }
      else L.marks.push(mark({ x, y, w: 0.004, h: 0.004, round: 0, cross: 1, hollow: 1, r: 40, g: 40, b: 40, a: 0.75 }));
    }
    const pairs = [];
    for (let i = H; i < N; i++) pairs.push([i % H, i]);
    for (let i = 0; i < H; i++) for (let j = i + 1; j < H; j++) pairs.push([i, j]);
    L.links = pairs.filter(() => R() < 0.55).map(([a, b]) => ({ a, b, kind: 'line' }));
    L.extra = { pairs };
  } else if (style === 'dots') {
    const curves = [0, 1, 2].map(() => ({ y: 0.2 + R() * 0.6, a1: 0.08 + R() * 0.12, f1: 2 + R() * 4, p1: R() * 6, a2: 0.03 + R() * 0.05, f2: 6 + R() * 6, p2: R() * 6, tilt: (R() - 0.5) * 0.5 }));
    const byCurve = [[], [], []];
    for (let i = 0; i < N; i++) {
      const c = i % 3, C = curves[c];
      const u = 0.06 + R() * 0.88;
      const y = clamp(C.y + C.tilt * (u - 0.5) + C.a1 * Math.sin(u * C.f1 + C.p1) + C.a2 * Math.sin(u * C.f2 + C.p2), 0.07, 0.93);
      const s = R() < 0.2 ? 0.012 : 0.03 + R() * 0.045;
      const [r, g, b] = s < 0.02 ? [20, 20, 20] : hexToRgb(INK[Math.floor(R() * INK.length)]);
      L.marks.push(mark({ x: u, y, w: s, h: s, round: 1, rough: s < 0.02 ? 0 : 0.35, halo: s < 0.02 ? 0 : 1, r, g, b, a: 0.88 }));
      byCurve[c].push(i);
    }
    for (const list of byCurve) {
      list.sort((p, q) => L.marks[p].x - L.marks[q].x);
      for (let k = 0; k < list.length - 1; k++) L.links.push({ a: list[k], b: list[k + 1], kind: 'wavy', wob: (R() - 0.5) * 0.8 });
    }
    for (let k = 0; k < 6; k++) L.links.push({ a: Math.floor(R() * N), b: Math.floor(R() * N), kind: 'wavy', wob: (R() - 0.5) * 1.2 });
  }
  return L;
}

// ── ink sketch (cs face) ────────────────────────────────────
// A list of hand-drawn pen strokes, traced progressively onto a persistent
// canvas: layered contours, hatching, a datum line with hatched teeth,
// a dense diagonal "spine", construction and dashed lines, scribble texture.

function makeSketch(seed) {
  const R = rng(seed);
  const S = [];
  const add = (pts, o = {}) => S.push({ pts, w: 0.8, a: 0.85, dash: false, delay: 0, speed: 1, ...o });
  const jit = (p, amt) => p.map(([x, y]) => [x + (R() - 0.5) * amt, y + (R() - 0.5) * amt]);
  const line = (x0, y0, x1, y1, n = 24, wob = 0.002) => jit(Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]), wob);
  const bez = (p0, p1, p2, p3, n = 60) => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
  });

  // construction lines first — long, faint, ruled
  for (let i = 0; i < 6; i++) {
    const cx = R(), cy = R(), ang = R() * Math.PI;
    add(line(cx - Math.cos(ang) * 1.4, cy - Math.sin(ang) * 1.4, cx + Math.cos(ang) * 1.4, cy + Math.sin(ang) * 1.4, 30, 0.0006), { w: 0.45, a: 0.3, delay: R() * 0.6, speed: 2.4 });
  }
  // datum line (double) with hatched teeth below it
  const dy = 0.46 + R() * 0.12;
  add(line(0.04, dy, 0.96, dy, 40, 0.0008), { w: 1.3, a: 0.95, delay: 0.3, speed: 1.6 });
  add(line(0.04, dy + 0.006, 0.96, dy + 0.006, 40, 0.0008), { w: 0.5, a: 0.7, delay: 0.5, speed: 1.6 });
  const tx0 = 0.5 + R() * 0.2;
  for (let x = tx0; x < 0.94; x += 0.022) {
    const h = 0.03 + R() * 0.09;
    add(line(x, dy + 0.008, x - 0.012, dy + h, 6, 0.0012), { w: 0.55, a: 0.75, delay: 1.2 + (x - tx0) * 3, speed: 3 });
  }
  // organic contours, each traced 2–3 times slightly offset (sketchy)
  const blobs = [];
  for (let b = 0; b < 4; b++) {
    const cx = 0.2 + R() * 0.6, cy = 0.2 + R() * 0.6, rx = 0.07 + R() * 0.16, ry = 0.05 + R() * 0.14, rot = R() * 3;
    const p1 = R() * 6, p2 = R() * 6;
    blobs.push({ cx, cy, rx, ry });
    const passes = 2 + Math.floor(R() * 2);
    for (let p = 0; p < passes; p++) {
      const pts = [];
      const o = (R() - 0.5) * 0.012;
      for (let i = 0; i <= 70; i++) {
        const t = (i / 70) * Math.PI * 2;
        const k = 1 + 0.16 * Math.sin(3 * t + p1) + 0.07 * Math.sin(7 * t + p2) + o * 6;
        const x = Math.cos(t) * rx * k, y = Math.sin(t) * ry * k;
        pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
      }
      add(jit(pts, 0.0025), { w: 0.5 + R() * 0.5, a: 0.55 + R() * 0.35, delay: 0.8 + b * 0.5 + p * 0.25, speed: 0.9 + R() * 0.4 });
    }
    // contour rings inside some blobs
    if (R() < 0.6) for (let ring = 1; ring <= 3; ring++) {
      const s = 1 - ring * 0.22, pts = [];
      for (let i = 0; i <= 50; i++) {
        const t = (i / 50) * Math.PI * 2;
        const k = 1 + 0.16 * Math.sin(3 * t + p1);
        const x = Math.cos(t) * rx * k * s, y = Math.sin(t) * ry * k * s;
        pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
      }
      add(jit(pts, 0.002), { w: 0.4, a: 0.45, dash: ring === 2, delay: 2 + b * 0.4 + ring * 0.2, speed: 1.4 });
    }
  }
  // hatching patches (fine parallel strokes within an ellipse)
  for (let hz = 0; hz < 4; hz++) {
    const b = blobs[hz % blobs.length];
    const cx = b.cx + (R() - 0.5) * b.rx, cy = b.cy + (R() - 0.5) * b.ry;
    const r = 0.03 + R() * 0.06, ang = R() < 0.5 ? Math.PI / 4 : -Math.PI / 3, step = 0.0065;
    const dx = Math.cos(ang), dyy = Math.sin(ang);
    for (let d = -r; d <= r; d += step) {
      const half = Math.sqrt(Math.max(0, r * r - d * d)) * (0.75 + R() * 0.3);
      const mx = cx - dyy * d, my = cy + dx * d;
      add(line(mx - dx * half, my - dyy * half, mx + dx * half, my + dyy * half, 4, 0.0012), { w: 0.4, a: 0.65, delay: 2.6 + hz * 0.5 + (d + r) * 4, speed: 4 });
    }
  }
  // the dense diagonal spine: a bundle of nearly parallel strokes
  const a0 = [0.12 + R() * 0.2, 0.08 + R() * 0.2], a3 = [0.55 + R() * 0.3, 0.6 + R() * 0.3];
  const a1 = [a0[0] + 0.25, a0[1] + 0.05 + R() * 0.2], a2 = [a3[0] - 0.2, a3[1] - 0.3];
  for (let k = 0; k < 16; k++) {
    const off = (R() - 0.5) * 0.03 * (k < 6 ? 0.35 : 1);
    const pts = bez([a0[0] + off, a0[1] - off], [a1[0] + off, a1[1]], [a2[0], a2[1] + off], [a3[0] - off, a3[1] + off], 70);
    add(jit(pts, 0.0022), { w: k < 5 ? 1.1 : 0.45, a: k < 5 ? 0.9 : 0.55, delay: 1.6 + k * 0.12, speed: 0.8 + R() * 0.3 });
  }
  // dashed survey curves
  for (let i = 0; i < 3; i++) {
    const p0 = [R(), R()], p3 = [R(), R()];
    add(bez(p0, [R(), R()], [R(), R()], p3, 50), { w: 0.5, a: 0.6, dash: true, delay: 3 + i * 0.4, speed: 1.2 });
  }
  // a large dashed arc
  const ac = [0.3 + R() * 0.4, 0.4 + R() * 0.3], ar = 0.25 + R() * 0.12;
  add(Array.from({ length: 61 }, (_, i) => { const t = Math.PI * (0.8 + i / 60 * 1.3); return [ac[0] + Math.cos(t) * ar, ac[1] + Math.sin(t) * ar]; }), { w: 0.5, a: 0.45, dash: true, delay: 1, speed: 1.2 });
  // small circles, some with a centre cross
  for (let i = 0; i < 9; i++) {
    const cx = 0.08 + R() * 0.84, cy = 0.08 + R() * 0.84, r = 0.004 + R() * 0.014;
    add(Array.from({ length: 25 }, (_, j) => [cx + Math.cos((j / 24) * Math.PI * 2) * r, cy + Math.sin((j / 24) * Math.PI * 2) * r]), { w: 0.6, a: 0.85, delay: 3.5 + R() * 2, speed: 3 });
    if (R() < 0.5) { add(line(cx - r * 1.8, cy, cx + r * 1.8, cy, 2, 0), { w: 0.5, delay: 4 + R() * 2, speed: 5 }); add(line(cx, cy - r * 1.8, cx, cy + r * 1.8, 2, 0), { w: 0.5, delay: 4 + R() * 2, speed: 5 }); }
  }
  // scribble texture clusters
  for (let c = 0; c < 4; c++) {
    const b = blobs[c % blobs.length];
    const cx = b.cx + (R() - 0.5) * b.rx * 1.2, cy = b.cy + (R() - 0.5) * b.ry * 1.2;
    for (let i = 0; i < 46; i++) {
      const x = cx + (R() + R() - 1) * 0.07, y = cy + (R() + R() - 1) * 0.06, ang = R() * Math.PI, len = 0.004 + R() * 0.02;
      add(line(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len, 3, 0.001), { w: 0.4 + R() * 0.6, a: 0.5 + R() * 0.4, delay: 3.2 + c * 0.6 + R() * 2.5, speed: 6 });
    }
  }
  // stipple dots
  const dots = [];
  for (let c = 0; c < 3; c++) {
    const cx = 0.15 + R() * 0.7, cy = 0.15 + R() * 0.7;
    for (let i = 0; i < 70; i++) dots.push({ x: cx + (R() + R() - 1) * 0.09, y: cy + (R() + R() - 1) * 0.07, r: 0.4 + R() * 1.1, delay: 4 + c * 0.7 + R() * 2.5 });
  }
  for (const s of S) { s.n = s.pts.length - 1; s.done = 0; s.prog = 0; }
  return { strokes: S, dots, dotsDone: 0 };
}

// ── messy ink for the other styles ──────────────────────────
// Every style also gets loose hand-made marks — dry-brush streaks, splatter,
// threads, and long "spill" lines that start beyond one edge and run off
// another, so the ink reads as continuing across the cube's edges.

function makeInk(kind, seed) {
  if (kind === 'graph') {
    const sk = makeSketch(seed);
    addSpill(sk, rng(seed + 5), kind);
    return sk;
  }
  const R = rng(seed + 77);
  const S = [], dots = [];
  const add = (pts, o = {}) => S.push({ pts, w: 0.8, a: 0.85, dash: false, delay: 0, speed: 1, ...o });
  const wobbly = (x0, y0, x1, y1, n, amp, f) => Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n, nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1;
    const o = Math.sin(u * f + seed) * amp + (R() - 0.5) * amp * 0.25;
    return [x0 + (x1 - x0) * u + (nx / L) * o, y0 + (y1 - y0) * u + (ny / L) * o];
  });
  // a dry brush: several bristles side by side that run out at different lengths
  const brush = (x0, y0, x1, y1, width, o) => {
    const bristles = 4 + Math.floor(width * 1.5);
    for (let b = 0; b < bristles; b++) {
      const off = (b / bristles - 0.5) * width * 0.004;
      const cut = 0.55 + R() * 0.45;
      const pts = wobbly(x0, y0 + off, x0 + (x1 - x0) * cut, y0 + off + (y1 - y0) * cut, 30, 0.004, 3 + R() * 4);
      add(pts, { w: 0.6 + R() * 1.6, a: 0.5 + R() * 0.45, ...o, delay: o.delay + R() * 0.15 });
    }
  };
  const splat = (cx, cy, n, spread, col, delay, big = 3) => {
    for (let i = 0; i < n; i++) {
      const d = Math.pow(R(), 1.8) * spread, a = R() * 6.28;
      dots.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: 0.4 + Math.pow(R(), 3) * big * 3, delay: delay + R() * 0.6, c: col, a: 0.55 + R() * 0.4 });
    }
  };

  if (kind === 'notes') {
    for (let i = 0; i < 12; i++) {
      const y = STAVES[Math.floor(R() * STAVES.length)] + (R() - 0.5) * 0.05, x = 0.05 + R() * 0.6;
      brush(x, y, x + 0.12 + R() * 0.35, y + (R() - 0.5) * 0.04, 2 + R() * 4, { delay: 0.1 + R() * 0.9, speed: 2.2 });
    }
    for (let i = 0; i < 7; i++) {
      const x = 0.1 + R() * 0.8, y = 0.1 + R() * 0.6;
      add(wobbly(x, y, x + (R() - 0.5) * 0.04, y + 0.08 + R() * 0.25, 20, 0.006, 5), { w: 1.2 + R() * 2.2, a: 0.8, delay: 0.3 + R(), speed: 2.5 });
    }
    for (let i = 0; i < 3; i++) {
      const cx = 0.2 + R() * 0.6, cy = 0.2 + R() * 0.6, pts = [];
      for (let k = 0; k <= 80; k++) { const t = k / 80 * Math.PI * 6, r = 0.01 + k / 80 * 0.05; pts.push([cx + Math.cos(t) * r + k * 0.002, cy + Math.sin(t) * r * 0.6]); }
      add(pts, { w: 0.7, a: 0.7, delay: 0.6 + R() * 0.8, speed: 3 });
    }
    for (let i = 0; i < 4; i++) splat(0.1 + R() * 0.8, 0.1 + R() * 0.8, 30, 0.06, '18,18,18', 0.4 + R() * 0.8);
  } else if (kind === 'dots') {
    for (let i = 0; i < 7; i++) {
      const y0 = R(), y1 = R();
      add(wobbly(-0.05, y0, 1.05, y1, 60, 0.03 + R() * 0.05, 4 + R() * 8), { w: 0.5 + R() * 0.5, a: 0.6, delay: R() * 0.8, speed: 2.6 });
    }
    for (let i = 0; i < 9; i++) {
      const col = hexToRgb(INK[Math.floor(R() * INK.length)]).join(',');
      const cx = R(), cy = R();
      dots.push({ x: cx, y: cy, r: 14 + R() * 30, delay: 0.2 + R() * 0.9, c: col, a: 0.16 });
      splat(cx, cy, 16, 0.05, col, 0.4 + R() * 0.8, 2.4);
    }
    for (let i = 0; i < 3; i++) splat(R(), R(), 22, 0.07, '18,18,18', 0.5 + R(), 1.2);
  } else if (kind === 'midi') {
    for (let i = 0; i < 14; i++) {
      const y = 0.08 + R() * 0.84, x0 = -0.05 + R() * 0.3;
      add(wobbly(x0, y, x0 + 0.4 + R() * 0.7, y, 20, 0.0008, 3), { w: 0.4 + R() * 0.5, a: 0.55, dash: R() < 0.4, delay: R() * 0.8, speed: 3.5 });
    }
  }
  const sk = { strokes: S, dots, dotsDone: 0 };
  addSpill(sk, R, kind);
  for (const s of S) { s.n = s.pts.length - 1; s.done = 0; }
  return sk;
}

// long lines entering from beyond one edge and leaving another
function addSpill(sk, R, kind) {
  const n = kind === 'midi' ? 3 : 6;
  for (let i = 0; i < n; i++) {
    const side = Math.floor(R() * 4);
    const a = [[R(), -0.1], [1.1, R()], [R(), 1.1], [-0.1, R()]][side];
    const b = [[R(), 1.1], [-0.1, R()], [R(), -0.1], [1.1, R()]][side];
    const pts = [];
    const cx = 0.5 + (R() - 0.5) * 0.6, cy = 0.5 + (R() - 0.5) * 0.6;
    for (let k = 0; k <= 60; k++) {
      const u = k / 60, v = 1 - u;
      pts.push([v * v * a[0] + 2 * v * u * cx + u * u * b[0] + (R() - 0.5) * 0.004, v * v * a[1] + 2 * v * u * cy + u * u * b[1] + (R() - 0.5) * 0.004]);
    }
    const s = { pts, w: kind === 'notes' ? 1 + R() * 2.4 : 0.5 + R() * 0.9, a: 0.55 + R() * 0.35, dash: kind === 'graph' && R() < 0.3, delay: R() * 0.5, speed: 3 };
    s.n = pts.length - 1; s.done = 0;
    sk.strokes.push(s);
  }
}

// ── engine ──────────────────────────────────────────────────

const TEMPO = 2.4; // overall speed of pen tracing

export class FaceArt {
  constructor(px, canvas, seed = 1) {
    this.S = px;
    this.canvas = canvas || document.createElement('canvas');
    this.canvas.width = this.canvas.height = px;
    this.ctx = this.canvas.getContext('2d');
    this.marks = [];
    this.links = [];
    this.layers = {};
    this.style = null;
    this.alpha = 0;
    this.alphaT = 0;
    this.tiles = 1; this.tilesT = 1;
    this.seed = seed * 1009;
    this.t = 0;
    this.lastEvent = 0;
    this.flow = { delay: 0, mode: 'radial' };
    for (let i = 0; i < N; i++) {
      const R = rng(seed * 7919 + i * 31 + 13);
      this.marks.push({
        cur: mark({ a: 0 }), tgt: mark({ a: 0 }), base: null,
        jit: Array.from({ length: SEG }, () => R() - 0.5),
        streaks: Array.from({ length: 4 }, () => [R() - 0.5, R()]),
        glyph: GLYPHS[Math.floor(R() * GLYPHS.length)],
        seed: R() * 100, delay: R() * 0.25, startA: 0, startB: 0, respawn: 0,
      });
    }
  }

  // extra delay for a point, so ink spreads across the face in a direction
  off(x, y) {
    const f = this.flow;
    const d = f.mode === 'down' ? y * 0.45 : f.mode === 'up' ? (1 - y) * 0.45 : Math.hypot(x - 0.5, y - 0.5) * 0.6;
    return f.delay + d;
  }

  // Show `style` at opacity `alpha` (1 = lit, small = ghost). If the face is
  // already showing something, it morphs from that. `flow` = { delay, mode }
  // sets when and in which direction the change sweeps over this face.
  show(style, alpha = 1, flow = { delay: 0, mode: 'radial' }) {
    this.flow = flow;
    if (flow.delay > 0) { this.pending = { style, alpha, at: this.t + flow.delay }; return; }
    this.pending = null;
    this.apply(style, alpha);
  }

  apply(style, alpha) {
    this.alphaT = alpha;
    if (style === this.style) return;
    this.seed += 1;
    const L1 = layout(style, this.seed);
    this.extra = L1.extra;
    const visible = this.alpha > 0.01 && this.style;
    this.style = style;
    this.flow = { ...this.flow, delay: 0 };
    if (visible) this.morph(L1);
    else this.fresh(L1);
  }

  fresh(L1) {
    const t = this.t;
    this.marks.forEach((m, i) => {
      const p = L1.marks[i];
      Object.assign(m.cur, p, { a: 0, w: p.glitch ? 0 : p.w * 0.2, h: p.h * (p.glitch ? 1 : 0.2) });
      m.tgt = { ...p }; m.base = { ...p };
      m.startA = m.startB = t + this.off(p.x, p.y) + m.delay;
      m.respawn = 0;
    });
    this.links = L1.links.map((l) => ({ ...l, prog: 0, alpha: 1, alphaT: 1, start: t + 0.25 + Math.random() * 0.5 }));
    this.layers = { [L1.layer]: this.newLayer(L1.layer) };
    this.settleAt = t + 1.2;
  }

  morph(L1) {
    const t = this.t;
    this.marks.forEach((m, i) => {
      const p = L1.marks[i];
      m.tgt = { ...p }; m.base = { ...p };
      const o = this.off(m.cur.x, m.cur.y);
      m.startA = t + o + m.delay * 0.5;
      m.startB = t + o + 0.22 + m.delay;
      m.respawn = 0;
    });
    for (const l of this.links) l.alphaT = 0;
    for (const l of L1.links) this.links.push({ ...l, prog: 0, alpha: 1, alphaT: 1, start: t + 0.35 + Math.random() * 0.5 });
    for (const k in this.layers) this.layers[k].alphaT = 0;
    this.layers[L1.layer] = this.newLayer(L1.layer);
    this.settleAt = t + 1.3;
  }

  newLayer(key) {
    const ink = document.createElement('canvas');
    ink.width = ink.height = this.S;
    const sk = makeInk(key, this.seed);
    // stroke timing follows the flow direction
    for (const s of sk.strokes) s.delay = s.delay * 0.4 + this.off(s.pts[0][0], s.pts[0][1]);
    for (const d of sk.dots) d.delay = d.delay * 0.4 + this.off(d.x, d.y);
    sk.dots.sort((p, q) => p.delay - q.delay);
    return { alpha: 1, alphaT: 1, prog: 0, ink, inkCtx: ink.getContext('2d'), sk, t0: this.t };
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    if (this.pending && t >= this.pending.at) { const p = this.pending; this.pending = null; this.apply(p.style, p.alpha); }
    this.alpha += (this.alphaT - this.alpha) * (1 - Math.exp(-dt * (this.alphaT > this.alpha ? 9 : 4)));
    this.tiles += (this.tilesT - this.tiles) * (1 - Math.exp(-dt * 5));

    if (this.settleAt && t > this.settleAt) this.ongoing(dt);

    const k = 1 - Math.exp(-dt * 7);
    for (const m of this.marks) {
      if (t >= m.startA) for (const p of PROPS_A) m.cur[p] += (m.tgt[p] - m.cur[p]) * k;
      if (t >= m.startB) for (const p of PROPS_B) m.cur[p] += (m.tgt[p] - m.cur[p]) * k;
      if (m.respawn === 1 && m.cur.a < 0.05) {
        const n = this.style === 'notes' ? noteMark(Math.random) : null;
        if (n) {
          Object.assign(m.cur, n, { a: 0, w: n.w > n.h ? 0.002 : n.w, h: n.h > n.w ? 0.002 : n.h });
          m.tgt = n; m.base = { ...n };
        }
        m.respawn = 0; m.startA = m.startB = t;
      }
    }
    for (const l of this.links) {
      if (t >= l.start && l.prog < 1) l.prog = Math.min(1, l.prog + dt * 2.8);
      l.alpha += (l.alphaT - l.alpha) * (1 - Math.exp(-dt * 7));
    }
    this.links = this.links.filter((l) => l.alpha > 0.01 || l.alphaT > 0);
    for (const key in this.layers) {
      const L = this.layers[key];
      L.prog = Math.min(1, L.prog + dt * 1.6);
      L.alpha += (L.alphaT - L.alpha) * (1 - Math.exp(-dt * 5));
      if (L.alphaT === 0 && L.alpha < 0.01) { delete this.layers[key]; continue; }
      if (L.alphaT > 0) this.trace(L);
    }
    this.draw();
  }

  // advance the pens and commit newly drawn segments to the layer's ink canvas
  trace(L) {
    const sk = L.sk, ctx = L.inkCtx, S = this.S;
    const el = this.t - L.t0;
    const lw = S / 620;
    ctx.lineCap = 'round';
    for (const s of sk.strokes) {
      if (s.done >= s.n || el < s.delay) continue;
      const target = Math.min(s.n, Math.floor((el - s.delay) * s.speed * 34 * TEMPO));
      if (target <= s.done) continue;
      ctx.strokeStyle = `rgba(${s.c || '18,18,18'},${s.a})`;
      for (let i = s.done; i < target; i++) {
        if (s.dash && i % 4 > 1) continue;
        const [x0, y0] = s.pts[i], [x1, y1] = s.pts[i + 1];
        // pressure: thicker in the middle of a stroke, tapering at the ends
        const taper = Math.sin(Math.PI * Math.min(1, (i + 0.5) / s.n)) * 0.6 + 0.4;
        ctx.lineWidth = lw * s.w * taper * (0.75 + 0.5 * Math.abs(Math.sin(i * 1.7 + s.n)));
        ctx.beginPath(); ctx.moveTo(x0 * S, y0 * S); ctx.lineTo(x1 * S, y1 * S); ctx.stroke();
      }
      s.done = target;
    }
    while (sk.dotsDone < sk.dots.length) {
      const d = sk.dots[sk.dotsDone];
      if (d.delay > el) break;
      sk.dotsDone++;
      ctx.fillStyle = `rgba(${d.c || '18,18,18'},${d.a ?? 0.8})`;
      ctx.beginPath(); ctx.arc(d.x * S, d.y * S, d.r * lw, 0, 7); ctx.fill();
    }
  }

  // Continuous behaviour once a style has settled.
  ongoing(dt) {
    const t = this.t;
    const every = (s) => t - this.lastEvent > s && ((this.lastEvent = t), true);
    if (this.style === 'notes') {
      if (every(0.25)) {
        const m = this.marks[Math.floor(Math.random() * N)];
        m.tgt.a = 0; m.respawn = 1; m.startA = t;
      }
    } else if (this.style === 'midi') {
      for (const m of this.marks) {
        m.tgt.x -= dt * (0.02 + (m.seed % 1) * 0.035);
        m.cur.x = m.tgt.x;
        if (m.tgt.x + m.tgt.w / 2 < 0.04) { m.tgt.x = m.cur.x = 0.96 + m.tgt.w / 2; m.cur.a = 0; }
        m.tgt.a = clamp(Math.min((m.tgt.x - m.tgt.w / 2 - 0.02) * 12, (0.98 - m.tgt.x + m.tgt.w / 2) * 12), 0, 1);
      }
    } else if (this.style === 'graph' && this.extra) {
      if (every(0.2)) {
        const { pairs } = this.extra;
        const [a, b] = pairs[Math.floor(Math.random() * pairs.length)];
        if (!this.links.some((l) => l.alphaT && l.a === a && l.b === b)) this.links.push({ a, b, kind: 'line', prog: 0, alpha: 1, alphaT: 1, start: t });
        const live = this.links.filter((l) => l.alphaT > 0);
        if (live.length > 40) live[0].alphaT = 0;
      }
      for (const m of this.marks) if (m.base) {
        m.tgt.x = m.base.x + Math.sin(t * 0.5 + m.seed) * 0.003;
        m.tgt.y = m.base.y + Math.cos(t * 0.4 + m.seed) * 0.003;
      }
    } else if (this.style === 'dots') {
      for (const m of this.marks) if (m.base) {
        m.tgt.x = m.base.x + Math.sin(t * 0.5 + m.seed) * 0.012;
        m.tgt.y = m.base.y + Math.cos(t * 0.45 + m.seed * 1.3) * 0.012;
        m.tgt.halo = m.base.halo ? 0.75 + 0.35 * Math.sin(t * 1.2 + m.seed) : 0;
      }
    }
  }

  // ── drawing ───────────────────────────────────────────────

  draw() {
    const { ctx, S } = this;
    ctx.clearRect(0, 0, S, S);
    this.drawTiles();
    ctx.save();
    ctx.globalAlpha = clamp(this.alpha);
    const lw = S / 620;
    for (const key in this.layers) this.drawLayer(key, this.layers[key], lw);
    for (const l of this.links) this.drawLink(l, lw);
    for (const m of this.marks) this.drawMark(m, lw);
    ctx.restore();
  }
  // the faint 3×3 floating stickers of a speedcube
  drawTiles() {
    const { ctx, S } = this;
    const a = this.tiles;
    if (a < 0.01) return;
    const c = S / 3, pad = c * 0.07, r = c * 0.1;
    ctx.save();
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.roundRect(i * c + pad, j * c + pad, c - pad * 2, c - pad * 2, r);
      ctx.fillStyle = `rgba(20,20,20,${0.016 * a})`;
      ctx.fill();
      ctx.lineWidth = S / 900;
      ctx.strokeStyle = `rgba(20,20,20,${0.055 * a})`;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawLayer(key, L, lw) {
    const { ctx, S } = this;
    const p = L.prog, A = L.alpha;
    if (A < 0.01) return;
    ctx.save();
    ctx.lineWidth = lw;
    const hline = (y, x0, x1, a) => {
      ctx.strokeStyle = `rgba(20,20,20,${a * A})`;
      ctx.beginPath(); ctx.moveTo(x0 * S, y * S); ctx.lineTo((x0 + (x1 - x0) * p) * S, y * S); ctx.stroke();
    };
    if (key === 'notes') {
      for (const y0 of STAVES) for (let i = -2; i <= 2; i++) hline(y0 + i * 0.011, 0.05, 0.95, 0.32);
    } else if (key === 'midi') {
      for (let i = 0; i < N; i++) hline(0.1 + (i / (N - 1)) * 0.8, 0.04, 0.96, 0.06);
      ctx.strokeStyle = `rgba(20,20,20,${0.08 * A})`;
      for (let x = 0.1; x < 0.95; x += 0.1) { ctx.beginPath(); ctx.moveTo(x * S, 0.06 * S); ctx.lineTo(x * S, (0.06 + 0.88 * p) * S); ctx.stroke(); }
    } else if (key === 'dots') {
      ctx.strokeStyle = `rgba(20,20,20,${0.12 * A})`;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        for (let u = 0; u <= p; u += 0.02) {
          const x = u * S, y = (0.2 + k * 0.2 + 0.05 * Math.sin(u * 7 + k * 2)) * S;
          u ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    }
    if (L.ink) { ctx.globalAlpha *= A; ctx.drawImage(L.ink, 0, 0); }
    ctx.restore();
  }

  drawLink(l, lw) {
    const { ctx, S } = this;
    if (l.prog <= 0 || l.alpha < 0.01) return;
    const A = l.alpha;
    const a = this.marks[l.a].cur, b = this.marks[l.b].cur;
    ctx.strokeStyle = `rgba(20,20,20,${(l.kind === 'wavy' ? 0.55 : 0.5) * A})`;
    ctx.lineWidth = lw * (l.kind === 'wavy' ? 0.9 : 0.6);
    ctx.beginPath();
    if (l.kind === 'wavy') {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const nx = -(b.y - a.y), ny = b.x - a.x;
      const cx = mx + nx * l.wob, cy = my + ny * l.wob;
      const steps = 20, end = Math.ceil(steps * l.prog);
      for (let s = 0; s <= end; s++) {
        const u = Math.min(s / steps, l.prog), v = 1 - u;
        const x = v * v * a.x + 2 * v * u * cx + u * u * b.x;
        const y = v * v * a.y + 2 * v * u * cy + u * u * b.y;
        s ? ctx.lineTo(x * S, y * S) : ctx.moveTo(x * S, y * S);
      }
      ctx.stroke();
      ctx.fillStyle = `rgba(20,20,20,${0.7 * A})`;
      for (const u of [0.3, 0.62]) if (l.prog > u) {
        const v = 1 - u;
        ctx.beginPath();
        ctx.arc((v * v * a.x + 2 * v * u * cx + u * u * b.x) * S, (v * v * a.y + 2 * v * u * cy + u * u * b.y) * S, lw * 1.6, 0, 7);
        ctx.fill();
      }
    } else {
      ctx.moveTo(a.x * S, a.y * S);
      ctx.lineTo((a.x + (b.x - a.x) * l.prog) * S, (a.y + (b.y - a.y) * l.prog) * S);
      ctx.stroke();
    }
  }

  shapePath(c, jit, extra = 1) {
    const { ctx, S } = this;
    const cx = c.x * S, cy = c.y * S, hw = (c.w * S) / 2 * extra, hh = (c.h * S) / 2 * extra;
    const amp = c.rough * Math.min(hh, hw, S * 0.01) * 0.9;
    ctx.beginPath();
    for (let i = 0; i < SEG; i++) {
      const ph = (i / SEG) * Math.PI * 2;
      const co = Math.cos(ph), si = Math.sin(ph);
      const m = Math.max(Math.abs(co), Math.abs(si));
      const ux = co / m + (co - co / m) * c.round, uy = si / m + (si - si / m) * c.round;
      const j = jit[i] * amp;
      const x = cx + ux * hw + co * j, y = cy + uy * hh + si * j;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  drawMark(m, lw) {
    const { ctx, S, t } = this;
    const c = m.cur;
    if (c.a < 0.01 || (c.w * S < 0.4 && c.h * S < 0.4)) return;
    const col = (a) => `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${a})`;

    if (c.halo > 0.01) {
      this.shapePath(c, m.jit, 1.55 + 0.1 * c.halo);
      ctx.fillStyle = col(0.22 * c.halo * c.a);
      ctx.fill();
    }

    this.shapePath(c, m.jit);
    if (c.hollow > 0.01) {
      ctx.fillStyle = col(c.a * (1 - c.hollow));
      ctx.fill();
      ctx.lineWidth = lw * 0.9;
      ctx.strokeStyle = col(c.a * c.hollow);
      ctx.stroke();
    } else {
      ctx.fillStyle = col(c.a);
      ctx.fill();
    }

    if (c.halo > 0.05 && c.w > 0.02) {
      ctx.beginPath();
      ctx.arc(c.x * S, c.y * S, (c.w * S) * 0.18, 0, 7);
      ctx.strokeStyle = `rgba(30,20,20,${0.45 * c.halo * c.a})`;
      ctx.lineWidth = lw;
      ctx.stroke();
    }

    if (c.rough > 0.05 && c.w > c.h) {
      ctx.strokeStyle = col(0.55 * c.rough * c.a);
      ctx.lineWidth = lw * 0.9;
      ctx.beginPath();
      for (const [dy, len] of m.streaks) {
        const y = (c.y + dy * c.h * 1.3) * S, x0 = (c.x + c.w / 2) * S;
        ctx.moveTo(x0 - c.w * S * 0.2, y);
        ctx.lineTo(x0 + c.w * S * 0.45 * len * c.rough, y + dy * lw * 6);
      }
      ctx.stroke();
    }

    if (c.cross > 0.01) {
      const r = Math.max(c.w, 0.01) * S * 0.9;
      ctx.strokeStyle = col(c.cross * Math.max(c.a, 0.7));
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.moveTo(c.x * S - r, c.y * S); ctx.lineTo(c.x * S + r, c.y * S);
      ctx.moveTo(c.x * S, c.y * S - r); ctx.lineTo(c.x * S, c.y * S + r);
      ctx.stroke();
    }

    if (c.glitch > 0.05) {
      const g = c.glitch;
      const tick = Math.floor(t * 7 + m.seed * 13);
      const h1 = ((tick * 9301 + 49297) % 233280) / 233280;
      const h2 = ((tick * 4271 + 1123) % 233280) / 233280;
      const x0 = (c.x - c.w / 2) * S, x1 = (c.x + c.w / 2) * S, y = c.y * S, hh = (c.h * S) / 2;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0,0,0,${0.9 * g})`;
      ctx.fillRect(x0 + (x1 - x0) * h1 * 0.7, y - hh * 0.3, (x1 - x0) * 0.25 * h2, hh * 0.6);
      ctx.restore();
      if (h2 > 0.55) {
        ctx.fillStyle = col(c.a * g);
        ctx.fillRect(x0 + (h1 - 0.5) * S * 0.05, y - hh - lw * 2, (x1 - x0) * 0.4, lw * 1.5);
      }
      ctx.strokeStyle = col(0.45 * g * c.a);
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 + S * 0.12 * h2, y); ctx.stroke();
      if ((m.seed * 10) % 3 < 1.6) {
        ctx.fillStyle = col(0.9 * g * c.a);
        ctx.font = `${Math.round(S * 0.02)}px "Geist Mono", ui-monospace, monospace`;
        ctx.fillText(m.glyph, x1 + S * (0.02 + 0.05 * ((m.seed * 7) % 1)), y + S * 0.007);
      }
    }
  }
}
