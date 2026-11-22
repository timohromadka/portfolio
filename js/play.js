import { volunteering, work, projects, books, hobbies } from './content.js';
import { el, rng, reducedMotion } from './util.js';
import { pageChrome } from './chrome.js';

// Styled after a graphic score: cream paper, horizontal staves of circles
// in black, vermilion, orange and slate, thin vertical hairlines, bars.

export const SCORE = ['#141414', '#e5392b', '#f0932f', '#5e7f99', '#141414', '#9fb3c2', '#d9c9a6', '#e5392b', '#283a6b', '#f2c14e'];

const SECTIONS = [
  { id: 'volunteering', label: 'volunteering', color: '#e5392b' },
  { id: 'work', label: 'work', color: '#f0932f' },
  { id: 'projects', label: 'coding projects', color: '#5e7f99' },
  { id: 'books', label: 'books', color: '#283a6b' },
  { id: 'hobbies', label: 'hobbies', color: '#141414' },
];

const todo = (x) => (x.todo ? el('span', { class: 'todo' }, 'placeholder') : null);

function item(x, i, color) {
  const title = x.url
    ? el('a', { href: x.url, target: x.url.startsWith('http') ? '_blank' : null, rel: 'noopener' }, x.title, ' ↗')
    : x.title;
  return el('article', { class: 'p-item reveal', style: `--i:${i};--ink:${color}` },
    el('span', { class: 'p-item__dot', 'aria-hidden': 'true' }),
    el('h3', {}, title, todo(x)),
    x.when || x.author ? el('p', { class: 'p-item__meta' }, x.when || x.author) : null,
    el('p', {}, x.text || x.note));
}

export function mountPlay(root) {
  const { bar, back } = pageChrome('play', SECTIONS);
  const canvas = el('canvas', { class: 'p-tiles', 'aria-hidden': 'true' });
  const data = { volunteering, work, projects, books, hobbies };
  const heroScore = el('canvas', { class: 'p-score p-score--hero', 'aria-hidden': 'true', 'data-seed': 3, 'data-density': 1 });
  root.append(
    canvas, back, bar,
    el('main', { class: 'p-main' },
      el('section', { class: 'p-hero' },
        el('h1', {}, 'projects ', el('span', {}, '&'), ' play'),
        el('p', {}, 'Volunteering, side work, code I build for fun, books and everything else.'),
        heroScore,
        el('p', { class: 'p-hint' }, 'hover the paper to reveal the tiles · drag to slide a row or column')),
      SECTIONS.map((s, k) =>
        el('section', { class: 'p-sec', 'data-sec': s.id, style: `--ink:${s.color}` },
          el('canvas', { class: 'p-score', 'aria-hidden': 'true', 'data-seed': 11 + k * 7, 'data-density': 0.55 }),
          el('h2', { class: 'reveal' }, el('span', { class: 'p-num' }, String(k + 1).padStart(2, '0')), s.label),
          el('div', { class: `p-items ${s.id === 'hobbies' ? 'p-items--dense' : ''}` },
            data[s.id].map((x, i) => item(x, i, SCORE[(i * 3 + k) % 4 + (i % 2 ? 0 : 1)])))))),
    el('p', { class: 'p-colophon' }, 'untitled composition no. 1'));
  tiles = new Tiles(canvas);
  scores = [...root.querySelectorAll('.p-score')].map((c) => new Score(c));
}

let tiles, scores = [];
export const enterPlay = () => { tiles && tiles.start(); scores.forEach((s) => s.watch()); };
export const leavePlay = () => { tiles && tiles.stop(); scores.forEach((s) => s.stop()); };

// ── graphic-score stave ──────────────────────────────────────

class Score {
  constructor(c) {
    this.c = c;
    this.ctx = c.getContext('2d');
    this.seed = +c.dataset.seed;
    this.density = +c.dataset.density;
    this.io = new IntersectionObserver(([e]) => (e.isIntersecting ? this.play() : this.stop()));
    addEventListener('resize', () => { this.items = null; });
  }

  watch() { this.io.observe(this.c); }

  build() {
    const r = this.c.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.W = r.width; this.H = r.height;
    this.c.width = r.width * dpr; this.c.height = r.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = rng(this.seed), W = this.W, H = this.H, d = this.density;
    const items = [];
    const mid = H * (0.45 + R() * 0.1);
    const staves = [mid, mid + (R() - 0.5) * H * 0.3];
    // horizontal staves
    for (const y of staves) items.push({ k: 'h', x0: W * (0.02 + R() * 0.1), x1: W * (0.88 + R() * 0.1), y, w: 0.8 + R() * 0.6 });
    // vertical hairlines and grid ticks
    for (let i = 0; i < 60 * d; i++) {
      const x = W * (0.04 + R() * 0.92), len = H * (0.08 + R() * R() * 0.8);
      items.push({ k: 'v', x, y0: mid - len * R(), len, w: 0.5 });
    }
    // circles: a few large, many small
    const n = Math.round(70 * d);
    for (let i = 0; i < n; i++) {
      const big = R() < 0.08;
      const r = big ? H * (0.12 + R() * 0.16) : 1.5 + R() * R() * H * 0.08;
      const y = staves[Math.floor(R() * staves.length)] + (R() - 0.5) * H * (big ? 0.2 : 0.55);
      const col = SCORE[Math.floor(R() * SCORE.length)];
      items.push({ k: 'c', x: W * (0.05 + R() * 0.9), y, r, col, ring: R() < 0.12, a: big ? 0.92 : 0.95, ph: R() * 6 });
    }
    // bars and small squares
    for (let i = 0; i < 9 * d; i++) {
      const x = W * (0.1 + R() * 0.8), y = staves[0] + (R() - 0.5) * H * 0.5;
      items.push(R() < 0.6
        ? { k: 'b', x, y, w: 20 + R() * 90, h: 3 + R() * 6, col: R() < 0.6 ? '#141414' : SCORE[Math.floor(R() * SCORE.length)] }
        : { k: 's', x, y, s: 3 + R() * 6, col: '#141414' });
    }
    // order: lines first, then shapes left to right — the score "plays" in
    items.sort((p, q) => (p.k === 'h' ? -1 : q.k === 'h' ? 1 : (p.x ?? p.x0) - (q.x ?? q.x0)));
    items.forEach((it, i) => (it.at = 0.15 + (i / items.length) * 1.8));
    this.items = items;
  }

  play() {
    if (this.running) return;
    if (!this.items) this.build();
    this.running = true;
    const t0 = this.t0 ??= performance.now();
    const loop = (now) => {
      if (!this.running) return;
      this.draw((now - t0) / 1000);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() { this.running = false; cancelAnimationFrame(this.raf); }

  draw(t) {
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);
    const rm = reducedMotion();
    for (const it of this.items) {
      const p = rm ? 1 : Math.min(1, Math.max(0, (t - it.at) / 0.6));
      if (p <= 0) continue;
      const e = 1 - Math.pow(1 - p, 3);
      if (it.k === 'h') {
        ctx.strokeStyle = '#141414'; ctx.lineWidth = it.w;
        ctx.beginPath(); ctx.moveTo(it.x0, it.y); ctx.lineTo(it.x0 + (it.x1 - it.x0) * e, it.y); ctx.stroke();
      } else if (it.k === 'v') {
        ctx.strokeStyle = 'rgba(20,20,20,0.55)'; ctx.lineWidth = it.w;
        ctx.beginPath(); ctx.moveTo(it.x, it.y0); ctx.lineTo(it.x, it.y0 + it.len * e); ctx.stroke();
      } else if (it.k === 'c') {
        const drift = rm ? 0 : Math.sin(t * 0.25 + it.ph) * 3;
        ctx.globalAlpha = it.a;
        ctx.fillStyle = it.col;
        ctx.beginPath(); ctx.arc(it.x + drift, it.y, it.r * e, 0, 7); ctx.fill();
        if (it.ring) {
          ctx.fillStyle = '#f3efe6';
          ctx.beginPath(); ctx.arc(it.x + drift, it.y, it.r * e * 0.55, 0, 7); ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (it.k === 'b') {
        ctx.fillStyle = it.col; ctx.fillRect(it.x, it.y, it.w * e, it.h);
      } else if (it.k === 's') {
        ctx.fillStyle = it.col; ctx.fillRect(it.x, it.y, it.s * e, it.s * e);
      }
    }
  }
}

// ── Rubik tile background ────────────────────────────────────
// A grid of hidden tiles. Hovering reveals them (each a small score mark:
// a circle on a hairline); dragging slides the row or column under the
// pointer by one tile, wrapping like a cube slice.

class Tiles {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.mouse = { x: -1e4, y: -1e4 };
    this.slides = [];
    this.resize();
    addEventListener('resize', () => this.resize());
    addEventListener('pointermove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    addEventListener('pointerdown', (e) => this.down(e));
    addEventListener('pointerup', (e) => this.up(e));
    addEventListener('pointercancel', () => (this.drag = null));
  }

  resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.dpr = dpr;
    this.c.width = innerWidth * dpr; this.c.height = innerHeight * dpr;
    this.size = innerWidth < 640 ? 58 : 74;
    const cols = Math.ceil(innerWidth / this.size) + 1, rows = Math.ceil(innerHeight / this.size) + 1;
    if (cols !== this.cols || rows !== this.rows) {
      this.cols = cols; this.rows = rows;
      const R = rng(42);
      this.grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({
        col: SCORE[Math.floor(R() * SCORE.length)], r: 0.08 + R() * R() * 0.3, ox: (R() - 0.5) * 0.3, oy: (R() - 0.5) * 0.3,
        ring: R() < 0.15, vline: R() < 0.35, rev: 0,
      })));
    }
  }

  intro() {
    if (reducedMotion()) return;
    const now = performance.now() / 1000;
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) this.grid[r][c].wave = now + (r + c) * 0.035;
  }

  down(e) {
    if (!this.running || e.target.closest('a, button, .p-item, h1, h2, p, .tabs, .p-score')) return;
    this.drag = { x: e.clientX, y: e.clientY };
  }

  up(e) {
    const d = this.drag; this.drag = null;
    if (!d || !this.running) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    const S = this.size;
    if (Math.abs(dx) > Math.abs(dy)) this.slides.push({ axis: 'row', i: Math.floor(d.y / S), dir: Math.sign(dx), t: 0 });
    else this.slides.push({ axis: 'col', i: Math.floor(d.x / S), dir: Math.sign(dy), t: 0 });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.intro();
    let last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      this.frame(Math.min(0.05, (now - last) / 1000), now / 1000);
      last = now;
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() { this.running = false; cancelAnimationFrame(this.raf); }

  frame(dt, t) {
    const { ctx, size: S, dpr } = this;
    const slide = this.slides[0];
    if (slide) {
      slide.t = Math.min(1, slide.t + dt / 0.38);
      if (slide.t >= 1) {
        const g = this.grid;
        if (slide.axis === 'row' && g[slide.i]) {
          const row = g[slide.i];
          slide.dir > 0 ? row.unshift(row.pop()) : row.push(row.shift());
        } else if (slide.axis === 'col') {
          const col = g.map((r) => r[slide.i]);
          slide.dir > 0 ? col.unshift(col.pop()) : col.push(col.shift());
          g.forEach((r, k) => (r[slide.i] = col[k]));
        }
        this.slides.shift();
      }
    }
    const e = slide ? (slide.t < 0.5 ? 2 * slide.t * slide.t : 1 - Math.pow(-2 * slide.t + 2, 2) / 2) : 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const RAD = 160;
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const tile = this.grid[r][c];
      let x = c * S, y = r * S;
      const inSlide = slide && ((slide.axis === 'row' && slide.i === r) || (slide.axis === 'col' && slide.i === c));
      if (inSlide && slide.axis === 'row') x += slide.dir * e * S;
      if (inSlide && slide.axis === 'col') y += slide.dir * e * S;
      const d = Math.hypot(this.mouse.x - (x + S / 2), this.mouse.y - (y + S / 2));
      const target = Math.max(0, 1 - d / RAD);
      tile.rev += (target - tile.rev) * (target > tile.rev ? 0.25 : 0.02);
      let rev = tile.rev;
      if (tile.wave) {
        const w = t - tile.wave;
        if (w > 0 && w < 1.6) rev = Math.max(rev, Math.sin((w / 1.6) * Math.PI) * 0.7);
        if (w >= 1.6) tile.wave = 0;
      }
      if (inSlide) rev = Math.max(rev, 0.6);
      this.drawTile(x, y, S, tile, rev);
      if (inSlide && slide.axis === 'row' && (c === 0 || c === this.cols - 1)) this.drawTile(x - slide.dir * this.cols * S, y, S, tile, rev);
      if (inSlide && slide.axis === 'col' && (r === 0 || r === this.rows - 1)) this.drawTile(x, y - slide.dir * this.rows * S, S, tile, rev);
    }
  }

  drawTile(x, y, S, tile, rev) {
    const { ctx } = this;
    ctx.strokeStyle = 'rgba(40,30,20,0.045)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, S, S);
    if (rev < 0.02) return;
    const cx = x + S * (0.5 + tile.ox), cy = y + S * (0.5 + tile.oy);
    ctx.globalAlpha = rev;
    ctx.strokeStyle = 'rgba(20,20,20,0.55)';
    ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + S, cy);
    if (tile.vline) { ctx.moveTo(cx + S * 0.2, y + S * 0.15); ctx.lineTo(cx + S * 0.2, y + S * 0.85); }
    ctx.stroke();
    ctx.fillStyle = tile.col;
    ctx.beginPath(); ctx.arc(cx, cy, S * tile.r * (0.5 + 0.5 * rev), 0, 7); ctx.fill();
    if (tile.ring) { ctx.fillStyle = '#f3efe6'; ctx.beginPath(); ctx.arc(cx, cy, S * tile.r * 0.5 * (0.5 + 0.5 * rev), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}
