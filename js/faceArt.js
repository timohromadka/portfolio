// Procedural art drawn on one face of the landing cube.
//
// Every style is drawn with the same set of N "marks" (ink blobs, bars,
// dots, nodes), plus links between marks and a background layer. Since
// every style uses the same primitives, any style can morph into any other:
//   notes  — inked, smeared notes on staves          (music face)
//   midi   — crisp glitchy piano-roll bars            (cs face, when coming from music)
//   graph  — blueprint lattice, nodes, traced edges   (cs face)
//   dots   — colourful ink dots on wavy lines         (play face)

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
    const d = 0.16, dy = d * Math.sin(Math.PI / 3);
    const pts = [];
    for (let row = 0; 0.12 + row * dy <= 0.9; row++) {
      for (let col = 0; ; col++) {
        const x = 0.1 + col * d + (row % 2 ? d / 2 : 0);
        if (x > 0.9) break;
        pts.push([x + (R() - 0.5) * 0.035, 0.12 + row * dy + (R() - 0.5) * 0.035]);
      }
    }
    const nodes = Math.min(pts.length, N);
    for (let i = 0; i < N; i++) {
      if (i < nodes) {
        const s = 0.012 + R() * 0.012;
        L.marks.push(mark({ x: pts[i][0], y: pts[i][1], w: s, h: s, round: 1, hollow: 1, r: 24, g: 24, b: 24, a: 1 }));
      } else {
        L.marks.push(mark({ x: 0.06 + R() * 0.88, y: 0.06 + R() * 0.88, w: 0.012, h: 0.012, round: 0, cross: 1, r: 40, g: 40, b: 40, a: 0.7 }));
      }
    }
    const pairs = [];
    for (let i = 0; i < nodes; i++)
      for (let j = i + 1; j < nodes; j++) {
        const dd = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
        if (dd < d * 1.3) pairs.push([i, j]);
      }
    const has = (a, b) => pairs.some(([p, q]) => (p === a && q === b) || (p === b && q === a));
    const tris = [];
    for (const [i, j] of pairs)
      for (let k = j + 1; k < nodes; k++) if (has(i, k) && has(j, k)) tris.push([i, j, k]);
    L.links = pairs.filter(() => R() < 0.6).map(([a, b]) => ({ a, b, kind: 'line' }));
    for (const t of tris) if (R() < 0.12) L.links.push({ tri: t, kind: 'hatch' });
    L.extra = { pairs, tris };
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

// ── engine ──────────────────────────────────────────────────

export class FaceArt {
  constructor(px) {
    this.S = px;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = px;
    this.ctx = this.canvas.getContext('2d');
    this.marks = [];
    this.links = [];
    this.layers = {};
    this.style = null;
    this.alpha = 0;
    this.alphaT = 0;
    this.active = false;
    this.dirty = true;
    this.seed = Math.floor(Math.random() * 1e6);
    this.t = 0;
    for (let i = 0; i < N; i++) {
      const R = rng(i * 7919 + 13);
      this.marks.push({
        cur: mark({ a: 0 }), tgt: mark({ a: 0 }), base: null,
        jit: Array.from({ length: SEG }, () => R() - 0.5),
        streaks: Array.from({ length: 4 }, () => [R() - 0.5, R()]),
        glyph: GLYPHS[Math.floor(R() * GLYPHS.length)],
        seed: R() * 100, delay: R() * 0.5, startA: 0, startB: 0, respawn: 0,
      });
    }
  }

  get visible() { return this.alpha > 0.004 || this.active; }

  // Show `style`, morphing from `from` (a style name) when given.
  enter(style, from = null) {
    const t = this.t;
    this.active = true;
    this.alphaT = 1;
    this.seed += 1;
    const L1 = layout(style, this.seed);
    this.extra = L1.extra;
    this.style = style;
    this.lastEvent = t;

    if (from && from !== style) {
      const L0 = layout(from, this.seed + 999);
      // start from the source picture (faded in quickly), then morph
      this.marks.forEach((m, i) => {
        Object.assign(m.cur, L0.marks[i], { a: 0 });
        m.tgt = { ...L0.marks[i] };
        m.startA = m.startB = t;
        m.respawn = 0;
      });
      this.links = L0.links.map((l) => ({ ...l, prog: 1, alpha: 1, alphaT: 1, start: t }));
      this.layers = { [L0.layer]: { alpha: 1, alphaT: 1, prog: 1 } };
      this.alpha = Math.max(this.alpha, 0.6);
      this.pending = { L1, at: t + 0.45 };
    } else {
      this.marks.forEach((m, i) => {
        const p = L1.marks[i];
        Object.assign(m.cur, p, { a: 0, w: p.glitch ? 0 : p.w * 0.2, h: p.h * (p.glitch ? 1 : 0.2) });
        m.tgt = { ...p };
        m.base = { ...p };
        m.startA = m.startB = t + 0.25 + m.delay * 1.6;
        m.respawn = 0;
      });
      this.links = L1.links.map((l) => ({ ...l, prog: 0, alpha: 1, alphaT: 1, start: t + 0.6 + Math.random() * 1.6 }));
      this.layers = { [L1.layer]: { alpha: 1, alphaT: 1, prog: 0 } };
      this.pending = null;
      this.settleAt = t + 2.6;
    }
    this.dirty = true;
  }

  applyMorph(L1) {
    const t = this.t;
    this.marks.forEach((m, i) => {
      m.tgt = { ...L1.marks[i] };
      m.base = { ...L1.marks[i] };
      m.startA = t + m.delay * 0.6;
      m.startB = t + 0.6 + m.delay;
    });
    for (const l of this.links) l.alphaT = 0;
    for (const l of L1.links) this.links.push({ ...l, prog: 0, alpha: 1, alphaT: 1, start: t + 1.0 + Math.random() * 1.2 });
    for (const k in this.layers) this.layers[k].alphaT = 0;
    this.layers[L1.layer] = { alpha: 1, alphaT: 1, prog: 0 };
    this.settleAt = t + 2.8;
  }

  leave() {
    this.active = false;
    this.alphaT = 0;
    this.pending = null;
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    this.alpha += (this.alphaT - this.alpha) * (1 - Math.exp(-dt * (this.alphaT > this.alpha ? 6 : 3)));
    if (!this.visible) { if (this.dirty) { this.ctx.clearRect(0, 0, this.S, this.S); this.dirty = false; } return false; }

    if (this.pending && t >= this.pending.at) { this.applyMorph(this.pending.L1); this.pending = null; }
    // fade the source picture in quickly while waiting for the morph
    if (this.pending) for (const m of this.marks) if (m.cur.a < m.tgt.a) m.cur.a = Math.min(m.tgt.a, m.cur.a + dt * 4);

    if (this.active && this.settleAt && t > this.settleAt) this.ongoing(dt);

    const k = 1 - Math.exp(-dt * 3.2);
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
      if (t >= l.start && l.prog < 1) l.prog = Math.min(1, l.prog + dt * 1.1);
      l.alpha += (l.alphaT - l.alpha) * (1 - Math.exp(-dt * 4));
    }
    this.links = this.links.filter((l) => l.alpha > 0.01 || l.alphaT > 0);
    for (const key in this.layers) {
      const L = this.layers[key];
      L.prog = Math.min(1, L.prog + dt * 0.55);
      L.alpha += (L.alphaT - L.alpha) * (1 - Math.exp(-dt * 3));
      if (L.alphaT === 0 && L.alpha < 0.01) delete this.layers[key];
    }
    this.draw();
    this.dirty = true;
    return true;
  }

  // Continuous behaviour once a style has settled.
  ongoing(dt) {
    const t = this.t;
    const every = (s) => t - this.lastEvent > s && ((this.lastEvent = t), true);
    if (this.style === 'notes') {
      if (every(0.42)) {
        const m = this.marks[Math.floor(Math.random() * N)];
        m.tgt.a = 0; m.respawn = 1; m.startA = t;
      }
    } else if (this.style === 'midi') {
      for (const m of this.marks) {
        m.tgt.x -= dt * (0.012 + (m.seed % 1) * 0.02);
        m.cur.x = m.tgt.x;
        if (m.tgt.x + m.tgt.w / 2 < 0.04) {
          m.tgt.x = m.cur.x = 0.96 + m.tgt.w / 2;
          m.cur.a = 0;
        }
        m.tgt.a = clamp(Math.min((m.tgt.x - m.tgt.w / 2 - 0.02) * 12, (0.98 - m.tgt.x + m.tgt.w / 2) * 12), 0, 1);
      }
    } else if (this.style === 'graph' && this.extra) {
      if (every(0.3)) {
        const { pairs, tris } = this.extra;
        if (Math.random() < 0.78) {
          const [a, b] = pairs[Math.floor(Math.random() * pairs.length)];
          if (!this.links.some((l) => l.alphaT && l.a === a && l.b === b)) this.links.push({ a, b, kind: 'line', prog: 0, alpha: 1, alphaT: 1, start: t });
        } else if (tris.length) {
          this.links.push({ tri: tris[Math.floor(Math.random() * tris.length)], kind: 'hatch', prog: 0, alpha: 1, alphaT: 1, start: t });
        }
        const live = this.links.filter((l) => l.alphaT > 0);
        if (live.length > 70) live[0].alphaT = 0;
      }
      for (const m of this.marks) if (m.base) {
        m.tgt.x = m.base.x + Math.sin(t * 0.5 + m.seed) * 0.004;
        m.tgt.y = m.base.y + Math.cos(t * 0.4 + m.seed) * 0.004;
      }
    } else if (this.style === 'dots') {
      for (const m of this.marks) if (m.base) {
        m.tgt.x = m.base.x + Math.sin(t * 0.35 + m.seed) * 0.012;
        m.tgt.y = m.base.y + Math.cos(t * 0.3 + m.seed * 1.3) * 0.012;
        m.tgt.halo = m.base.halo ? 0.75 + 0.35 * Math.sin(t * 0.9 + m.seed) : 0;
      }
    }
  }

  // ── drawing ───────────────────────────────────────────────

  draw() {
    const { ctx, S } = this;
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.globalAlpha = clamp(this.alpha);
    const lw = S / 620;
    for (const key in this.layers) this.drawLayer(key, this.layers[key], lw);
    for (const l of this.links) this.drawLink(l, lw);
    for (const m of this.marks) this.drawMark(m, lw);
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
    } else if (key === 'graph') {
      ctx.strokeStyle = `rgba(20,20,20,${0.05 * A})`;
      for (let i = 1; i < 24; i++) {
        const v = i / 24;
        ctx.beginPath(); ctx.moveTo(v * S, 0); ctx.lineTo(v * S, p * S); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, v * S); ctx.lineTo(p * S, v * S); ctx.stroke();
      }
      ctx.lineWidth = lw * 1.6;
      hline(0.555, 0.04, 0.96, 0.55);
      ctx.lineWidth = lw * 0.8;
      ctx.strokeStyle = `rgba(20,20,20,${0.28 * A})`;
      ctx.setLineDash([4 * lw, 4 * lw]);
      ctx.beginPath(); ctx.arc(0.42 * S, 0.62 * S, 0.27 * S, Math.PI * 0.9, Math.PI * (0.9 + 1.4 * p)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(0.08 * S, 0.9 * S); ctx.lineTo((0.08 + 0.8 * p) * S, (0.9 - 0.75 * p) * S); ctx.stroke();
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
    ctx.restore();
  }

  drawLink(l, lw) {
    const { ctx, S } = this;
    if (l.prog <= 0 || l.alpha < 0.01) return;
    const A = l.alpha;
    if (l.kind === 'hatch') {
      const [i, j, k] = l.tri.map((n) => this.marks[n].cur);
      ctx.save();
      ctx.beginPath(); ctx.moveTo(i.x * S, i.y * S); ctx.lineTo(j.x * S, j.y * S); ctx.lineTo(k.x * S, k.y * S); ctx.closePath();
      ctx.clip();
      ctx.strokeStyle = `rgba(20,20,20,${0.45 * A})`;
      ctx.lineWidth = lw * 0.8;
      const step = 5 * lw, n = Math.floor((S * 2 * l.prog) / step);
      ctx.beginPath();
      for (let q = 0; q < n; q++) { const o = q * step - S * 0.2; ctx.moveTo(o, 0); ctx.lineTo(o - S, S); }
      ctx.stroke();
      ctx.restore();
      return;
    }
    const a = this.marks[l.a].cur, b = this.marks[l.b].cur;
    ctx.strokeStyle = `rgba(20,20,20,${(l.kind === 'wavy' ? 0.55 : 0.6) * A})`;
    ctx.lineWidth = lw * (l.kind === 'wavy' ? 0.9 : 0.75);
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
      ctx.fillStyle = `rgba(255,255,255,${c.a * c.hollow})`;
      ctx.fill();
      ctx.fillStyle = col(c.a * (1 - c.hollow));
      ctx.fill();
      ctx.lineWidth = lw * 1.1;
      ctx.strokeStyle = col(c.a * c.hollow);
      ctx.stroke();
    } else {
      ctx.fillStyle = col(c.a);
      ctx.fill();
    }

    // little dark centre ring on coloured ink dots
    if (c.halo > 0.05 && c.w > 0.02) {
      ctx.beginPath();
      ctx.arc(c.x * S, c.y * S, (c.w * S) * 0.18, 0, 7);
      ctx.strokeStyle = `rgba(30,20,20,${0.45 * c.halo * c.a})`;
      ctx.lineWidth = lw;
      ctx.stroke();
    }

    // dry-brush streaks on ink notes
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
      ctx.strokeStyle = col(c.cross * c.a);
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(c.x * S - r, c.y * S); ctx.lineTo(c.x * S + r, c.y * S);
      ctx.moveTo(c.x * S, c.y * S - r); ctx.lineTo(c.x * S, c.y * S + r);
      ctx.stroke();
    }

    // digital glitch: knocked-out slices, offset slivers, hairlines, glyphs
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
        ctx.font = `${Math.round(S * 0.02)}px "Instrument Serif", Georgia, serif`;
        ctx.fillText(m.glyph, x1 + S * (0.02 + 0.05 * ((m.seed * 7) % 1)), y + S * 0.007);
      }
    }
  }
}
