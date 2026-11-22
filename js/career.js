import { site, education, experience, research } from './content.js';
import { el, rng } from './util.js';
import { pageChrome } from './chrome.js';

// Laid out like an analytical site-mapping sheet: a central spine of ink
// clusters, dashed leaders out to numbered entries, small annotations.

const SECTIONS = [
  { id: 'education', label: 'education' },
  { id: 'experience', label: 'experience' },
  { id: 'research', label: 'research' },
];

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const todo = (x) => (x.todo ? el('span', { class: 'todo' }, 'placeholder') : null);

function row(n, x, i) {
  const { title, org, when, points, url, abstract } = x;
  return el('article', { class: 'c-row reveal', style: `--i:${i % 4}`, 'data-n': n },
    el('div', { class: 'c-row__note' },
      el('p', { class: 'c-row__when' }, when),
      org ? el('p', { class: 'c-row__org' }, org) : null),
    el('div', { class: 'c-row__spine', 'aria-hidden': 'true' }),
    el('div', { class: 'c-row__body' },
      el('div', { class: 'c-row__head' },
        el('span', { class: 'c-num' }, ROMAN[n] || n + 1),
        el('h3', {}, url ? el('a', { href: url, target: '_blank', rel: 'noopener' }, title) : title, todo(x))),
      abstract ? el('p', { class: 'c-row__abs' }, abstract) : null,
      points ? el('ul', {}, points.map((p) => el('li', {}, p))) : null,
      url ? el('a', { class: 'c-link', href: url, target: '_blank', rel: 'noopener' }, 'read paper ↗') : null));
}

export function mountCareer(root) {
  const { bar, back } = pageChrome('career', SECTIONS);
  let n = 0;
  const head = (id, title, note) =>
    el('header', { class: 'c-sec__head reveal' },
      el('span', { class: 'c-sec__rule' }),
      el('h2', { id: `career-${id}` }, title),
      el('span', { class: 'c-sec__rule' }),
      el('p', {}, note));

  const ink = el('canvas', { class: 'c-ink', 'aria-hidden': 'true' });
  const map = el('div', { class: 'c-map' }, ink,
    el('section', { class: 'c-sec', 'data-sec': 'education' },
      head('education', 'Education', 'where the foundations were laid'),
      education.map((x, i) => row(n++, x, i))),
    el('section', { class: 'c-sec', 'data-sec': 'experience' },
      head('experience', 'Experience', 'work, internships & teaching'),
      experience.map((x, i) => row(n++, x, i))),
    el('section', { class: 'c-sec', 'data-sec': 'research' },
      head('research', 'Research', 'papers & publications'),
      research.map((p, i) => row(n++, { title: p.title, when: p.venue, url: p.url, abstract: p.abstract }, i))));

  root.append(back, bar,
    el('main', { class: 'c-main' },
      el('header', { class: 'c-top' },
        el('h1', {}, 'Computer Science'),
        el('p', { class: 'c-top__sub' }, el('span', { class: 'type-target', 'data-text': 'machine learning · natural language processing · bioinformatics' })),
        el('p', { class: 'c-top__meta' }, site.location, ' · ', el('a', { href: `mailto:${site.email}` }, site.email))),
      map,
      el('footer', { class: 'c-foot' },
        el('div', { class: 'c-scale', 'aria-hidden': 'true' },
          el('span', {}, '2016'), el('span', {}, '2019'), el('span', {}, '2022'), el('span', {}, '2026')),
        el('p', { class: 'c-foot__cap' }, 'Analytically denoting and mapping education, work and research across a career-scale. Procedural sequencing of these dynamics outlines the influences that shape what comes next.'),
        el('nav', { class: 'c-foot__links' },
          el('a', { href: `mailto:${site.email}` }, site.email),
          site.links.map((l) => el('a', { href: l.url, target: '_blank', rel: 'noopener' }, l.label)),
          el('a', { href: site.cv, target: '_blank' }, 'cv (pdf)')),
        el('p', { class: 'c-foot__pg' }, '01'))));

  spine = new Spine(map, ink);
}

let spine, typing;
export function enterCareer(root) {
  const t = root.querySelector('.type-target');
  const text = t.dataset.text;
  clearInterval(typing);
  t.textContent = '';
  let i = 0;
  setTimeout(() => {
    typing = setInterval(() => {
      t.textContent = text.slice(0, ++i);
      if (i >= text.length) clearInterval(typing);
    }, 32);
  }, 500);
  requestAnimationFrame(() => spine.layout());
}

// ── the ink spine ────────────────────────────────────────────
// For every entry, an ink cluster is built from many small drawing ops
// (textured patches, hatching, stipple, contours, leader lines to black
// squares) and drawn op-by-op when the entry scrolls into view.

class Spine {
  constructor(map, canvas) {
    this.map = map; this.c = canvas; this.ctx = canvas.getContext('2d');
    this.queue = [];
    addEventListener('resize', () => this.layout());
    this.io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) { this.draw(e.target); this.io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -10% 0px' });
  }

  layout() {
    const r = this.map.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    this.dpr = dpr;
    this.c.width = r.width * dpr; this.c.height = r.height * dpr;
    this.c.style.height = `${r.height}px`;
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.queue = [];
    const sp = this.map.querySelector('.c-row__spine');
    this.x = sp ? sp.getBoundingClientRect().left - r.left + sp.offsetWidth / 2 : r.width / 2;
    // dashed spine axis
    ctx.strokeStyle = 'rgba(20,20,20,0.5)';
    ctx.setLineDash([5, 5]); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(this.x, 0); ctx.lineTo(this.x, r.height); ctx.stroke();
    ctx.setLineDash([]);
    this.map.querySelectorAll('.c-row').forEach((row) => { this.io.unobserve(row); this.io.observe(row); });
    this.mapTop = r.top;
  }

  draw(row) {
    const top = row.getBoundingClientRect().top - this.map.getBoundingClientRect().top;
    const h = row.offsetHeight, n = +row.dataset.n;
    const head = row.querySelector('.c-row__head');
    const hy = head.getBoundingClientRect().top - row.getBoundingClientRect().top + head.offsetHeight / 2;
    const bodyX = row.querySelector('.c-row__body').getBoundingClientRect().left - this.map.getBoundingClientRect().left;
    this.queue.push(...this.cluster(n * 97 + 5, this.x, top, h, top + hy, bodyX));
    if (!this.running) this.run();
  }

  run() {
    this.running = true;
    const step = () => {
      for (let k = 0; k < 14 && this.queue.length; k++) this.queue.shift()(this.ctx);
      if (this.queue.length) requestAnimationFrame(step); else this.running = false;
    };
    requestAnimationFrame(step);
  }

  cluster(seed, x, top, h, headY, bodyX) {
    const R = rng(seed), ops = [];
    const narrow = innerWidth < 720;
    const span = narrow ? 14 : 150;
    const cy = top + h * 0.5;
    // grey textured patches straddling the spine
    for (let i = 0; i < (narrow ? 1 : 3); i++) {
      const w = 30 + R() * 110, hh = 24 + R() * Math.min(110, h * 0.8);
      const px = x + (R() < 0.5 ? -w : 0) + (R() - 0.5) * 30, py = cy - hh / 2 + (R() - 0.5) * h * 0.5;
      const tone = 0.07 + R() * 0.22;
      ops.push((c) => {
        c.fillStyle = `rgba(20,20,20,${tone})`; c.fillRect(px, py, w, hh);
        c.fillStyle = 'rgba(20,20,20,0.35)';
        for (let k = 0; k < w * hh / 26; k++) c.fillRect(px + Math.random() * w, py + Math.random() * hh, 1, 1);
      });
      if (R() < 0.6) {
        ops.push((c) => {
          c.save(); c.beginPath(); c.rect(px, py, w, hh); c.clip();
          c.strokeStyle = 'rgba(20,20,20,0.45)'; c.lineWidth = 0.5;
          c.beginPath();
          for (let o = -hh; o < w; o += 3) { c.moveTo(px + o, py); c.lineTo(px + o + hh, py + hh); }
          c.stroke(); c.restore();
        });
      }
    }
    // dense stipple along the spine
    for (let i = 0; i < 120; i++) {
      const dx = (R() + R() + R() - 1.5) * span * 0.6, dy = (R() - 0.5) * h * 0.9, r = R() < 0.1 ? 1.6 : 0.7;
      ops.push((c) => { c.fillStyle = 'rgba(15,15,15,0.75)'; c.beginPath(); c.arc(x + dx, cy + dy, r, 0, 7); c.fill(); });
    }
    // a wandering contour line
    if (!narrow) {
      const pts = [];
      let px = x - span * (0.4 + R() * 0.6), py = top + R() * h * 0.3;
      for (let i = 0; i < 40; i++) { px += (R() - 0.35) * 14; py += (h / 40) * (0.6 + R() * 0.8); pts.push([px, py]); }
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        ops.push((c) => { c.strokeStyle = 'rgba(20,20,20,0.4)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke(); });
      }
    }
    // leader lines out to small black squares, from a node near the spine
    const nx = x + (R() - 0.5) * 30, ny = cy + (R() - 0.5) * h * 0.4;
    const leaders = narrow ? 0 : 4 + Math.floor(R() * 4);
    for (let i = 0; i < leaders; i++) {
      const ang = Math.PI * (0.65 + R() * 0.7), len = 60 + R() * 170;
      const ex = nx + Math.cos(ang) * len, ey = ny + Math.sin(ang) * len * 0.5;
      ops.push((c) => {
        c.strokeStyle = 'rgba(20,20,20,0.55)'; c.lineWidth = 0.6;
        c.beginPath(); c.moveTo(nx, ny); c.lineTo(ex, ey); c.stroke();
        c.fillStyle = '#141414'; c.fillRect(ex - 2.5, ey - 2.5, 5, 5);
      });
    }
    // dashed leader from the spine out to the entry's numeral
    ops.push((c) => {
      c.strokeStyle = 'rgba(20,20,20,0.6)'; c.lineWidth = 0.8; c.setLineDash([4, 4]);
      c.beginPath(); c.moveTo(x, headY); c.lineTo(bodyX - 6, headY); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#141414'; c.fillRect(x - 3, headY - 3, 6, 6);
    });
    return ops;
  }
}
