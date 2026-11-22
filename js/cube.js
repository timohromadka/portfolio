// Landing cube: six transparent faces in CSS 3D, each a canvas of
// procedural art (faceArt.js). At rest every face shows faint speedcube
// stickers and a ghost of its own pattern. Hovering a side tilts the cube
// towards it and the whole cube takes on that side's pattern.

import { FaceArt } from './faceArt.js';
import { el, lerp, clamp, reducedMotion } from './util.js';

export const FACES = {
  cs:    { label: 'computer science', sub: 'career · research', route: 'career' },
  play:  { label: 'projects & play', sub: 'volunteering · code · books', route: 'play' },
  music: { label: 'music & writing', sub: 'sound · art · poems', route: 'music' },
};

const VIEW = {
  idle:  { rx: -28, ry: 45 },
  cs:    { rx: -17, ry: 67 },
  music: { rx: -17, ry: 23 },
  play:  { rx: -52, ry: 45 },
};
const FACE_ON = { cs: { rx: 0, ry: 90 }, music: { rx: 0, ry: 0 }, play: { rx: -90, ry: 0 } };

// CSS transform, outward normal (CSS axes: y points down) and resting pattern.
const SIDES = {
  front:  { tf: 'translateZ(var(--h))',                  n: [0, 0, 1],  home: 'notes' },
  back:   { tf: 'rotateY(180deg) translateZ(var(--h))',  n: [0, 0, -1], home: 'notes' },
  left:   { tf: 'rotateY(-90deg) translateZ(var(--h))',  n: [-1, 0, 0], home: 'graph' },
  right:  { tf: 'rotateY(90deg) translateZ(var(--h))',   n: [1, 0, 0],  home: 'graph' },
  top:    { tf: 'rotateX(90deg) translateZ(var(--h))',   n: [0, -1, 0], home: 'dots' },
  bottom: { tf: 'rotateX(-90deg) translateZ(var(--h))',  n: [0, 1, 0],  home: 'dots' },
};
const GHOST = 0.16;

export class Cube {
  constructor(root, { onEnter }) {
    this.root = root;
    this.onEnter = onEnter;
    this.rot = { ...VIEW.idle };
    this.scale = 1; this.scaleT = 1;
    this.fade = 1; this.fadeT = 1;
    this.mouse = { x: 0, y: 0 };
    this.active = null;
    this.running = false;
    this.lockView = null;
    this.build();
    this.bind();
  }

  build() {
    const stage = el('div', { class: 'cube-stage' });
    this.cubeEl = el('div', { class: 'cube' });
    stage.append(el('div', { class: 'cube-persp' }, this.cubeEl));
    this.stage = stage;

    this.labels = {};
    for (const [key, f] of Object.entries(FACES)) {
      const b = el('button', { class: `face-label face-label--${key}`, type: 'button', 'data-face': key },
        el('span', { class: 'face-label__t' }, f.label),
        el('span', { class: 'face-label__s' }, f.sub));
      b.addEventListener('mouseenter', () => this.setActive(key));
      b.addEventListener('focus', () => this.setActive(key));
      b.addEventListener('click', (e) => { e.stopPropagation(); this.enter(key); });
      this.labels[key] = b;
      stage.append(b);
    }
    this.root.append(stage);

    this.faces = Object.entries(SIDES).map(([name, s], i) => {
      const cv = el('canvas', { class: 'cf__art' });
      const node = el('div', { class: `cf cf--${name}` }, cv);
      node.style.transform = s.tf;
      this.cubeEl.append(node);
      return { name, ...s, node, cv, seed: i + 1 };
    });
    this.measure();
    this.makeArt();
  }

  measure() {
    const s = Math.round(clamp(Math.min(innerWidth * 0.2, innerHeight * 0.155), 64, 160));
    this.s = s;
    this.root.style.setProperty('--s', `${s}px`);
  }

  makeArt() {
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const px = Math.round(this.s * 3 * dpr);
    for (const f of this.faces) {
      f.art = new FaceArt(px, f.cv, f.seed);
      f.art.show(this.styleFor(f, this.active, null), this.active ? 1 : GHOST);
    }
  }

  bind() {
    addEventListener('resize', () => {
      const prev = this.s;
      this.measure();
      if (this.s !== prev) this.makeArt();
    });
    addEventListener('pointermove', (e) => {
      if (!this.running || e.pointerType === 'touch') return;
      this.mouse.x = (e.clientX / innerWidth) * 2 - 1;
      this.mouse.y = (e.clientY / innerHeight) * 2 - 1;
      this.queue(this.sectorAt(e.clientX, e.clientY));
    });
    this.root.addEventListener('pointerdown', (e) => {
      if (!this.running || e.target.closest('.face-label')) return;
      const f = this.sectorAt(e.clientX, e.clientY);
      if (e.pointerType === 'touch') {
        if (f && f === this.active) this.enter(f);
        else if (f) this.setActive(f);
      } else if (f && f === this.active) this.enter(f);
    });
    this.root.addEventListener('pointerleave', () => this.queue(null));
  }

  // The three visible faces meet at the cube's near corner; split the plane
  // into three 120° sectors from there.
  sectorAt(x, y) {
    const r = this.stage.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2 - this.s * 0.12;
    const dx = x - cx, dy = y - cy;
    if (Math.hypot(dx, dy) > this.s * 3.2) return null;
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (a > -150 && a < -30) return 'play';
    return dx < 0 ? 'cs' : 'music';
  }

  // debounce so brushing across a sector on the way elsewhere doesn't trigger it
  queue(face) {
    if (face === this.active) { clearTimeout(this.qt); this.qFace = undefined; return; }
    if (face === this.qFace) return;
    this.qFace = face;
    clearTimeout(this.qt);
    this.qt = setTimeout(() => { this.qFace = undefined; this.setActive(face); }, face ? 90 : 320);
  }

  // What a given face shows for the hovered side (`theme`).
  styleFor(face, theme, prevTheme) {
    if (!theme) return face.home;
    if (theme === 'music') return 'notes';
    if (theme === 'play') return 'dots';
    return prevTheme === 'music' ? 'midi' : 'graph';
  }

  setActive(theme) {
    if (theme === this.active || this.lockView) return;
    const prev = this.active;
    this.active = theme;
    for (const [k, b] of Object.entries(this.labels)) b.classList.toggle('is-active', k === theme);
    this.root.dataset.active = theme || '';
    for (const f of this.faces) {
      f.art.show(this.styleFor(f, theme, prev), theme ? 1 : GHOST);
      f.art.tilesT = theme ? 0.35 : 1;
    }
  }

  enter(face) {
    if (this.lockView) return;
    if (face !== this.active) this.setActive(face);
    this.onEnter(face);
  }

  // ── view transitions ───────────────────────────────────────

  zoomInto(face) {
    this.lockView = FACE_ON[face];
    this.scaleT = 6; this.fadeT = 0;
    return new Promise((res) => setTimeout(res, reducedMotion() ? 50 : 820));
  }

  zoomOut(face) {
    if (face && FACE_ON[face]) { this.rot = { ...FACE_ON[face] }; this.scale = 6; this.fade = 0; }
    this.lockView = null;
    this.scaleT = 1; this.fadeT = 1;
    this.active = 'x';
    this.setActive(null);
  }

  start() {
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.frame(dt, now / 1000);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() { this.running = false; cancelAnimationFrame(this.raf); }

  frame(dt, t) {
    const base = this.lockView || VIEW[this.active || 'idle'];
    const follow = this.lockView ? 0 : this.active ? 4 : 9;
    const bob = this.lockView || reducedMotion() ? 0 : Math.sin(t * 0.6) * 1.2;
    const kr = 1 - Math.exp(-dt * (this.lockView ? 7 : 4));
    this.rot.rx = lerp(this.rot.rx, base.rx - this.mouse.y * follow + bob, kr);
    this.rot.ry = lerp(this.rot.ry, base.ry + this.mouse.x * follow, kr);
    this.scale = lerp(this.scale, this.scaleT, 1 - Math.exp(-dt * (this.scaleT > this.scale ? 3.2 : 5)));
    this.fade = lerp(this.fade, this.fadeT, 1 - Math.exp(-dt * (this.fadeT < this.fade ? 3 : 5)));
    this.cubeEl.style.transform = `scale(${this.scale}) rotateX(${this.rot.rx}deg) rotateY(${this.rot.ry}deg)`;
    this.root.style.setProperty('--fade', this.fade.toFixed(3));

    // faces turned away from the camera are seen through the cube: dimmer
    const ry = (this.rot.ry * Math.PI) / 180, rx = (this.rot.rx * Math.PI) / 180;
    for (const f of this.faces) {
      const [x, y, z] = f.n;
      const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
      const nz = y * Math.sin(rx) + z1 * Math.cos(rx);
      f.node.style.opacity = (0.3 + 0.7 * clamp(nz * 1.6 + 0.15)).toFixed(3);
      f.art.update(dt);
    }
  }
}
