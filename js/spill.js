// Ink that escapes the cube: drips running down from its lower edges and
// lines spilling outwards past its silhouette, in the hovered side's style.
// Drawn on a full-screen canvas; every mark is anchored to a point on a cube
// edge, re-projected each frame so it stays attached as the cube turns.

import { INK, hexToRgb } from './util.js';

const EDGES = [];
{
  const c = [-1, 1];
  for (const a of c) for (const b of c) {
    EDGES.push([[-1, a, b], [1, a, b]]);
    EDGES.push([[a, -1, b], [a, 1, b]]);
    EDGES.push([[a, b, -1], [a, b, 1]]);
  }
}

export class Spill {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.items = [];
    this.theme = null;
    this.spawnAcc = 0;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.dpr = dpr;
    this.c.width = innerWidth * dpr; this.c.height = innerHeight * dpr;
  }

  setTheme(theme) {
    if (theme === this.theme) return;
    this.theme = theme;
    for (const it of this.items) it.fading = true;
    this.burst = theme ? 18 : 0;
  }

  // project a cube-space point (units of half-size) to screen
  proj(p, view) {
    const { half, rx, ry, scale, cx, cy, persp } = view;
    let [x, y, z] = p.map((v) => v * half);
    const cY = Math.cos(ry), sY = Math.sin(ry);
    [x, z] = [x * cY + z * sY, -x * sY + z * cY];
    const cX = Math.cos(rx), sX = Math.sin(rx);
    [y, z] = [y * cX - z * sX, y * sX + z * cX];
    x *= scale; y *= scale; z *= scale;
    const k = persp / (persp - z);
    return [cx + x * k, cy + y * k];
  }

  anchor(it, view) {
    const [a, b] = EDGES[it.edge];
    return this.proj(a.map((v, i) => v + (b[i] - v) * it.u), view);
  }

  spawn(view) {
    const theme = this.theme;
    const kind = Math.random() < (theme === 'cs' ? 0.35 : 0.55) ? 'drip' : 'line';
    let edge;
    if (kind === 'drip') {
      // only the lower edges that face us: the ones meeting the lowest corner
      const corners = [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]].map((p) => [p, this.proj(p, view)]);
      corners.sort((p, q) => q[1][1] - p[1][1]);
      const low = corners[0][0];
      const cand = EDGES.map((e, i) => [e, i]).filter(([e]) => e[0][1] === 1 && e[1][1] === 1 && e.some((p) => p.every((v, k) => v === low[k])));
      edge = cand[Math.floor(Math.random() * cand.length)][1];
    } else {
      edge = Math.floor(Math.random() * 12);
    }
    const col = theme === 'play' && Math.random() < 0.6 ? hexToRgb(INK[Math.floor(Math.random() * INK.length)]).join(',') : '18,18,18';
    const it = { kind, edge, u: 0.08 + Math.random() * 0.84, t: 0, alpha: 1, col, seed: Math.random() * 100 };
    if (kind === 'drip') {
      it.len = 30 + Math.pow(Math.random(), 1.6) * 260;
      it.w = theme === 'cs' ? 0.6 + Math.random() * 0.8 : 1 + Math.random() * 3.2;
      it.speed = 140 + Math.random() * 220;
    } else {
      // a wandering line heading away from the cube
      const a0 = this.anchor(it, view);
      let dir = Math.atan2(a0[1] - view.cy, a0[0] - view.cx) + (Math.random() - 0.5) * 1.2;
      if (theme === 'music') dir = Math.random() < 0.5 ? Math.PI + (Math.random() - 0.5) * 0.3 : (Math.random() - 0.5) * 0.3;
      const len = 80 + Math.random() * (theme === 'cs' ? 420 : 260);
      const pts = [[0, 0]];
      let x = 0, y = 0, d = dir;
      const n = 40;
      for (let i = 1; i <= n; i++) {
        d += (Math.random() - 0.5) * (theme === 'cs' ? 0.05 : theme === 'music' ? 0.12 : 0.35);
        x += Math.cos(d) * len / n; y += Math.sin(d) * len / n;
        pts.push([x, y]);
      }
      it.pts = pts;
      it.w = theme === 'music' ? 1.2 + Math.random() * 3 : theme === 'cs' ? 0.5 + Math.random() * 0.6 : 0.7 + Math.random() * 0.8;
      it.speed = 1.6 + Math.random() * 1.6; // fraction per second
      it.dots = theme !== 'cs' ? Array.from({ length: 3 + Math.floor(Math.random() * 5) }, () => [Math.random(), (Math.random() - 0.5) * 14, 0.6 + Math.random() * 2.6]) : [];
      it.dash = theme === 'cs' && Math.random() < 0.4;
    }
    this.items.push(it);
  }

  frame(dt, view) {
    const { ctx, dpr } = this;
    if (this.theme) {
      this.spawnAcc += dt * 3;
      while (this.burst > 0) { this.spawn(view); this.burst--; }
      while (this.spawnAcc > 1) {
        this.spawnAcc--;
        const live = this.items.filter((i) => !i.fading);
        if (live.length > 46) live[0].fading = true;
        this.spawn(view);
      }
    }
    for (const it of this.items) {
      it.t += dt;
      if (it.fading) it.alpha -= dt * 1.8;
    }
    this.items = this.items.filter((i) => i.alpha > 0);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (view.fade < 0.02) return;
    ctx.lineCap = 'round';
    for (const it of this.items) {
      const [ax, ay] = this.anchor(it, view);
      const A = Math.max(0, it.alpha) * view.fade;
      ctx.strokeStyle = `rgba(${it.col},${0.85 * A})`;
      ctx.fillStyle = `rgba(${it.col},${0.85 * A})`;
      if (it.kind === 'drip') {
        // runs down fast, then slows; tapers, with a bead at the end
        const L = it.len * (1 - Math.exp(-it.t * it.speed / it.len));
        const steps = Math.max(2, Math.floor(L / 6));
        for (let i = 1; i <= steps; i++) {
          const y0 = ((i - 1) / steps) * L, y1 = (i / steps) * L;
          const wob = (y) => Math.sin(y * 0.05 + it.seed) * 1.2;
          ctx.lineWidth = it.w * (1 - 0.55 * (i / steps));
          ctx.beginPath(); ctx.moveTo(ax + wob(y0), ay + y0); ctx.lineTo(ax + wob(y1), ay + y1); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(ax + Math.sin(L * 0.05 + it.seed) * 1.2, ay + L, it.w * 0.9, 0, 7); ctx.fill();
      } else {
        const p = Math.min(1, it.t * it.speed);
        const n = Math.floor((it.pts.length - 1) * p);
        for (let i = 1; i <= n; i++) {
          if (it.dash && i % 4 > 1) continue;
          const [x0, y0] = it.pts[i - 1], [x1, y1] = it.pts[i];
          ctx.lineWidth = it.w * (1 - 0.7 * (i / it.pts.length));
          ctx.beginPath(); ctx.moveTo(ax + x0, ay + y0); ctx.lineTo(ax + x1, ay + y1); ctx.stroke();
        }
        for (const [u, o, r] of it.dots) if (u < p) {
          const [x, y] = it.pts[Math.floor(u * (it.pts.length - 1))];
          ctx.beginPath(); ctx.arc(ax + x, ay + y + o, r, 0, 7); ctx.fill();
        }
      }
    }
  }
}
