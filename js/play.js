import { volunteering, work, projects, books, hobbies } from './content.js';
import { el, INK, hexToRgb, reducedMotion } from './util.js';
import { pageChrome } from './chrome.js';

const SECTIONS = [
  { id: 'volunteering', label: 'volunteering', color: INK[0] },
  { id: 'work', label: 'work', color: INK[1] },
  { id: 'projects', label: 'coding projects', color: INK[3] },
  { id: 'books', label: 'books', color: INK[5] },
  { id: 'hobbies', label: 'hobbies', color: INK[6] },
];

const todo = (x) => (x.todo ? el('span', { class: 'todo' }, 'placeholder') : null);

function card(x, i, color) {
  const title = x.url
    ? el('a', { href: x.url, target: x.url.startsWith('http') ? '_blank' : null, rel: 'noopener' }, x.title, ' ↗')
    : x.title;
  return el('article', { class: 'p-card reveal', style: `--i:${i};--ink:${color}` },
    el('span', { class: 'p-card__dot', 'aria-hidden': 'true' }),
    el('h3', {}, title, todo(x)),
    x.when || x.author ? el('p', { class: 'p-card__meta' }, x.when || x.author) : null,
    el('p', {}, x.text || x.note));
}

export function mountPlay(root) {
  const { bar, back } = pageChrome('play', SECTIONS);
  const canvas = el('canvas', { class: 'p-tiles', 'aria-hidden': 'true' });
  const data = { volunteering, work, projects, books, hobbies };
  root.append(
    canvas, back, bar,
    el('main', { class: 'p-main' },
      el('section', { class: 'p-hero' },
        el('h1', {}, 'projects ', el('em', {}, '&'), ' play'),
        el('p', {}, 'Volunteering, side work, code I build for fun, books and everything else.'),
        el('p', { class: 'p-hint' }, 'hover the background to reveal the tiles · drag to turn a row or column')),
      SECTIONS.map((s) =>
        el('section', { class: 'p-sec', 'data-sec': s.id, style: `--ink:${s.color}` },
          el('h2', { class: 'reveal' }, el('span', { class: 'p-blot', 'aria-hidden': 'true' }), s.label),
          el('div', { class: `p-cards ${s.id === 'hobbies' ? 'p-cards--dense' : ''}` },
            data[s.id].map((x, i) => card(x, i, INK[(i * 3 + SECTIONS.indexOf(s)) % INK.length])))))));
  tiles = new Tiles(canvas);
}

let tiles;
export const enterPlay = () => tiles && tiles.start();
export const leavePlay = () => tiles && tiles.stop();

// ── Rubik tile background ────────────────────────────────────
// A grid of hidden tiles. Hovering reveals them; dragging turns the row
// or column under the pointer by one tile, wrapping like a cube slice.

class Tiles {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = 76;
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
    this.size = innerWidth < 640 ? 58 : 76;
    const cols = Math.ceil(innerWidth / this.size) + 1, rows = Math.ceil(innerHeight / this.size) + 1;
    if (cols !== this.cols || rows !== this.rows) {
      this.cols = cols; this.rows = rows;
      this.grid = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => ({
        col: Math.floor(((r * 7 + c * 13 + r * c) % 97) / 97 * INK.length),
        rev: 0, seed: Math.random() * 10,
      })));
    }
  }

  // reveal everything in a diagonal wave, then let it fade back
  intro() {
    if (reducedMotion()) return;
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) this.grid[r][c].wave = performance.now() / 1000 + (r + c) * 0.035;
  }

  down(e) {
    if (!this.running || e.target.closest('a, button, .p-card, h1, h2, p, .tabs')) return;
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
    const R = 150;
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const tile = this.grid[r][c];
      let x = c * S, y = r * S;
      if (slide && slide.axis === 'row' && slide.i === r) x += slide.dir * e * S;
      if (slide && slide.axis === 'col' && slide.i === c) y += slide.dir * e * S;
      const d = Math.hypot(this.mouse.x - (x + S / 2), this.mouse.y - (y + S / 2));
      const target = Math.max(0, 1 - d / R);
      tile.rev += (Math.max(target, tile.rev * 0.0) - tile.rev) * (target > tile.rev ? 0.25 : 0.02);
      let rev = tile.rev;
      if (tile.wave) {
        const w = t - tile.wave;
        if (w > 0 && w < 1.6) rev = Math.max(rev, Math.sin((w / 1.6) * Math.PI) * 0.8);
        if (w >= 1.6) tile.wave = 0;
      }
      if (slide && ((slide.axis === 'row' && slide.i === r) || (slide.axis === 'col' && slide.i === c))) rev = Math.max(rev, 0.55);
      this.drawTile(x, y, S, tile, rev, t);
      // wrap the slice so it reads as a loop
      if (slide && slide.axis === 'row' && slide.i === r && (c === 0 || c === this.cols - 1)) this.drawTile(x - slide.dir * this.cols * S, y, S, tile, rev, t);
      if (slide && slide.axis === 'col' && slide.i === c && (r === 0 || r === this.rows - 1)) this.drawTile(x, y - slide.dir * this.rows * S, S, tile, rev, t);
    }
  }

  drawTile(x, y, S, tile, rev, t) {
    const { ctx } = this;
    // faint grid always present
    ctx.strokeStyle = 'rgba(40,30,20,0.05)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, S, S);
    if (rev < 0.02) return;
    const [r, g, b] = hexToRgb(INK[tile.col]);
    const cx = x + S / 2, cy = y + S / 2;
    const pad = S * 0.08;
    // inky sticker wash
    ctx.fillStyle = `rgba(${r},${g},${b},${0.16 * rev})`;
    ctx.beginPath();
    ctx.roundRect(x + pad, y + pad, S - pad * 2, S - pad * 2, S * 0.12);
    ctx.fill();
    // watercolour dot with darker ring and centre point
    const rad = S * (0.18 + 0.05 * Math.sin(t * 1.3 + tile.seed)) * (0.6 + 0.4 * rev);
    const grd = ctx.createRadialGradient(cx - rad * 0.3, cy - rad * 0.3, rad * 0.1, cx, cy, rad * 1.4);
    grd.addColorStop(0, `rgba(${r},${g},${b},${0.85 * rev})`);
    grd.addColorStop(0.7, `rgba(${r},${g},${b},${0.55 * rev})`);
    grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(cx, cy, rad * 1.4, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(40,25,20,${0.35 * rev})`;
    ctx.beginPath(); ctx.arc(cx, cy, rad * 0.45, 0, 7); ctx.stroke();
    ctx.fillStyle = `rgba(20,20,20,${0.6 * rev})`;
    ctx.beginPath(); ctx.arc(cx, cy, 1.6, 0, 7); ctx.fill();
  }
}
