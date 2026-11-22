// Landing cube: 27 cubies in CSS 3D. Three visible faces carry procedural
// art (see faceArt.js). The camera tilts towards the hovered face, and the
// top face turns the cube into a scrambling Rubik's cube.

import { FaceArt } from './faceArt.js';
import { el, lerp, clamp, reducedMotion } from './util.js';

// Visible faces → section. dir = outward normal in cube space (CSS: y points down).
export const FACES = {
  cs:    { dir: 'left',  label: 'computer science', sub: 'career · research', route: 'career' },
  play:  { dir: 'top',   label: 'projects & play', sub: 'volunteering · code · books', route: 'play' },
  music: { dir: 'front', label: 'music & writing', sub: 'sound · art · poems', route: 'music' },
};

const VIEW = {
  idle:  { rx: -28, ry: 45 },
  cs:    { rx: -17, ry: 67 },
  music: { rx: -17, ry: 23 },
  play:  { rx: -52, ry: 45 },
};
const FACE_ON = { cs: { rx: 0, ry: 90 }, music: { rx: 0, ry: 0 }, play: { rx: -90, ry: 0 } };

const FACE_TF = {
  front: 'translateZ(var(--h))',
  back: 'rotateY(180deg) translateZ(var(--h))',
  right: 'rotateY(90deg) translateZ(var(--h))',
  left: 'rotateY(-90deg) translateZ(var(--h))',
  top: 'rotateX(90deg) translateZ(var(--h))',
  bottom: 'rotateX(-90deg) translateZ(var(--h))',
};
const OUTER = { front: ['z', 1], back: ['z', -1], right: ['x', 1], left: ['x', -1], top: ['y', -1], bottom: ['y', 1] };
const AXIS = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

export class Cube {
  constructor(root, { onEnter }) {
    this.root = root;
    this.onEnter = onEnter;
    this.rot = { ...VIEW.idle };
    this.rotT = { ...VIEW.idle };
    this.scale = 1; this.scaleT = 1;
    this.fade = 1; this.fadeT = 1;
    this.k = 1; this.kT = 1;
    this.mouse = { x: 0, y: 0 };
    this.active = null;
    this.style = {}; // style currently shown on each face
    this.moves = []; this.anim = null; this.history = [];
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

    this.measure();
    this.cubies = [];
    this.stickers = [];
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      const c = { p: [x, y, z], o: new DOMMatrix(), node: el('div', { class: 'cubie' }) };
      const pos = { x, y, z };
      for (const [name, tf] of Object.entries(FACE_TF)) {
        const [ax, sgn] = OUTER[name];
        const outer = pos[ax] === sgn;
        const f = el('div', { class: `cf ${outer ? `cf--out cf--${name}` : 'cf--in'}` });
        f.style.transform = `${tf} scale(var(--k))`;
        if (outer) {
          const art = Object.keys(FACES).find((k) => FACES[k].dir === name);
          // row/col of this sticker in its face's own 2D frame (see faceArt mapping)
          const col = name === 'left' ? z + 1 : x + 1;
          const row = name === 'top' ? z + 1 : y + 1;
          if (name === 'front' || name === 'left' || name === 'top') {
            if (col === 0) f.classList.add('e-l');
            if (col === 2) f.classList.add('e-r');
            if (row === 0) f.classList.add('e-t');
            if (row === 2) f.classList.add('e-b');
          }
          if (art) {
            const cv = el('canvas', { class: 'cf__art' });
            f.append(cv);
            f.dataset.face = art;
            this.stickers.push({ face: art, col, row, cv, ctx: cv.getContext('2d'), node: f });
          }
        }
        c.node.append(f);
      }
      this.cubies.push(c);
      this.cubeEl.append(c.node);
    }
    this.sizeCanvases();
    this.applyCubies();
  }

  measure() {
    const s = Math.round(clamp(Math.min(innerWidth, innerHeight) * 0.13, 64, 128));
    this.s = s;
    this.root.style.setProperty('--s', `${s}px`);
  }

  sizeCanvases() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cell = Math.round(this.s * dpr);
    const old = this.art;
    this.art = {};
    for (const k of Object.keys(FACES)) {
      this.art[k] = new FaceArt(cell * 3);
      if (old && old[k] && old[k].active) this.art[k].enter(this.style[k]);
    }
    for (const st of this.stickers) { st.cv.width = st.cv.height = cell; }
    this.cell = cell;
  }

  bind() {
    addEventListener('resize', () => {
      const prev = this.s;
      this.measure();
      if (this.s !== prev) { this.sizeCanvases(); this.applyCubies(); }
    });
    addEventListener('pointermove', (e) => {
      if (!this.running || e.pointerType === 'touch') return;
      this.mouse.x = (e.clientX / innerWidth) * 2 - 1;
      this.mouse.y = (e.clientY / innerHeight) * 2 - 1;
      this.hoverSector(e.clientX, e.clientY);
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

  // Which face is "under" the pointer. The three visible faces meet at the
  // near corner of the cube; split the plane into three 120° sectors from there.
  sectorAt(x, y) {
    const r = this.stage.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2 - this.s * 0.12;
    const dx = x - cx, dy = y - cy;
    if (Math.hypot(dx, dy) > this.s * 3.2) return null;
    const a = (Math.atan2(dy, dx) * 180) / Math.PI; // screen coords: -90 = up
    if (a > -150 && a < -30) return 'play';
    return dx < 0 ? 'cs' : 'music';
  }

  hoverSector(x, y) { this.queue(this.sectorAt(x, y)); }

  // debounce so brushing across a sector on the way somewhere else doesn't trigger it
  queue(face) {
    if (face === this.active) { clearTimeout(this.qt); this.qFace = undefined; return; }
    if (face === this.qFace) return;
    this.qFace = face;
    clearTimeout(this.qt);
    this.qt = setTimeout(() => { this.qFace = undefined; this.setActive(face); }, face ? 90 : 320);
  }

  styleFor(face, fromFace) {
    if (face === 'music') return 'notes';
    if (face === 'play') return 'dots';
    return fromFace === 'music' ? 'midi' : 'graph';
  }

  setActive(face) {
    if (face === this.active || this.lockView) return;
    const prev = this.active;
    // treat a face left a moment ago as the one we're coming from
    const from = prev || (this.lastLeft && performance.now() - this.lastLeft.at < 700 ? this.lastLeft.face : null);
    if (prev) { this.art[prev].leave(); this.lastLeft = { face: prev, at: performance.now() }; }
    this.active = face;
    for (const [k, b] of Object.entries(this.labels)) b.classList.toggle('is-active', k === face);
    this.root.dataset.active = face || '';
    if (face) {
      const fromStyle = from ? this.style[from] : null;
      const style = this.styleFor(face, from);
      this.art[face].enter(style, reducedMotion() ? null : fromStyle);
      this.style[face] = style;
    }
    if (face === 'play') this.startRubik();
    else this.stopRubik();
  }

  enter(face) {
    if (this.lockView) return;
    if (face !== this.active) this.setActive(face);
    this.onEnter(face);
  }

  // ── Rubik's mode ───────────────────────────────────────────

  startRubik() {
    if (reducedMotion()) return;
    this.rubik = true;
    this.kT = 0.9;
    this.root.classList.add('is-rubik');
    clearTimeout(this.rubikTimer);
    const step = () => {
      if (!this.rubik) return;
      if (this.history.length >= 10 || (this.history.length > 3 && Math.random() < 0.18)) {
        const m = this.history.pop();
        this.moves.push({ ...m, dir: -m.dir, undo: true, dur: 0.42 });
      } else {
        const ax = 'xyz'[Math.floor(Math.random() * 3)];
        const layer = [-1, 0, 1][Math.floor(Math.random() * 3)];
        const last = this.history[this.history.length - 1];
        if (last && last.ax === ax && last.layer === layer) return (this.rubikTimer = setTimeout(step, 10));
        this.moves.push({ ax, layer, dir: Math.random() < 0.5 ? 1 : -1, dur: 0.42 });
      }
      this.rubikTimer = setTimeout(step, 640);
    };
    this.rubikTimer = setTimeout(step, 700);
  }

  stopRubik() {
    if (!this.rubik && !this.history.length) return;
    this.rubik = false;
    clearTimeout(this.rubikTimer);
    this.moves = [];
    // a slice that is mid-turn finishes, then gets undone first
    if (this.anim && !this.anim.undo) {
      this.anim.undo = true;
      this.moves.push({ ...this.anim, dir: -this.anim.dir, undo: true, dur: 0.16, t: 0 });
    }
    while (this.history.length) {
      const m = this.history.pop();
      this.moves.push({ ...m, dir: -m.dir, undo: true, dur: 0.16 });
    }
    this.kT = 1;
    this.root.classList.remove('is-rubik');
  }

  resetRubik() {
    this.rubik = false;
    clearTimeout(this.rubikTimer);
    this.moves = []; this.anim = null; this.history = [];
    for (const c of this.cubies) { c.p = [...c.home]; c.o = new DOMMatrix(); }
    this.k = this.kT = 1;
    this.root.classList.remove('is-rubik');
    this.applyCubies();
  }

  stepMoves(dt) {
    if (!this.anim && this.moves.length) { this.anim = this.moves.shift(); this.anim.t = 0; }
    const m = this.anim;
    if (!m) return;
    m.t = Math.min(1, m.t + dt / m.dur);
    const e = m.t < 0.5 ? 2 * m.t * m.t : 1 - Math.pow(-2 * m.t + 2, 2) / 2;
    const i = 'xyz'.indexOf(m.ax);
    const [ax, ay, az] = AXIS[m.ax];
    const sel = this.cubies.filter((c) => c.p[i] === m.layer);
    if (m.t < 1) {
      for (const c of sel) c.extra = `rotate3d(${ax},${ay},${az},${90 * m.dir * e}deg) `;
    } else {
      const R = new DOMMatrix().rotateAxisAngle(ax, ay, az, 90 * m.dir);
      for (const c of sel) {
        const q = R.transformPoint(new DOMPoint(...c.p));
        c.p = [Math.round(q.x), Math.round(q.y), Math.round(q.z)];
        const o = R.multiply(c.o).toFloat64Array().map(Math.round);
        c.o = DOMMatrix.fromFloat64Array(o);
        c.extra = '';
      }
      if (!m.undo) this.history.push(m);
      this.anim = null;
    }
    this.applyCubies();
  }

  applyCubies() {
    const s = this.s;
    for (const c of this.cubies) {
      c.home ||= [...c.p];
      c.node.style.transform = `${c.extra || ''}translate3d(${c.p[0] * s}px,${c.p[1] * s}px,${c.p[2] * s}px) ${c.o.toString()}`;
    }
  }

  // ── view transitions ───────────────────────────────────────

  // Rotate the chosen face to face the camera and push through it.
  zoomInto(face) {
    this.lockView = FACE_ON[face];
    this.stopRubik();
    this.scaleT = 7; this.fadeT = 0;
    return new Promise((res) => setTimeout(res, reducedMotion() ? 50 : 820));
  }

  // Arrive back on the landing page from a section.
  zoomOut(face) {
    this.resetRubik();
    if (face && FACE_ON[face]) { this.rot = { ...FACE_ON[face] }; this.scale = 7; this.fade = 0; }
    this.lockView = null;
    this.scaleT = 1; this.fadeT = 1;
    this.active = null;
    for (const k of Object.keys(this.art)) this.art[k].leave();
    for (const b of Object.values(this.labels)) b.classList.remove('is-active');
    this.root.dataset.active = '';
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
    this.rotT.rx = base.rx - this.mouse.y * follow + bob;
    this.rotT.ry = base.ry + this.mouse.x * follow;
    const kr = 1 - Math.exp(-dt * (this.lockView ? 7 : 4));
    this.rot.rx = lerp(this.rot.rx, this.rotT.rx, kr);
    this.rot.ry = lerp(this.rot.ry, this.rotT.ry, kr);
    const ks = 1 - Math.exp(-dt * (this.scaleT > this.scale ? 3.2 : 5));
    this.scale = lerp(this.scale, this.scaleT, ks);
    this.fade = lerp(this.fade, this.fadeT, 1 - Math.exp(-dt * (this.fadeT < this.fade ? 3 : 5)));
    this.k = lerp(this.k, this.kT, 1 - Math.exp(-dt * 5));
    this.cubeEl.style.transform = `scale(${this.scale}) rotateX(${this.rot.rx}deg) rotateY(${this.rot.ry}deg)`;
    this.root.style.setProperty('--k', this.k.toFixed(4));
    this.root.style.setProperty('--fade', this.fade.toFixed(3));

    this.stepMoves(dt);

    for (const [k, art] of Object.entries(this.art)) {
      if (!art.update(dt) && !art.blitted) continue;
      art.blitted = art.visible;
      const S3 = art.S / 3;
      for (const st of this.stickers) if (st.face === k) {
        st.ctx.clearRect(0, 0, st.cv.width, st.cv.height);
        st.ctx.drawImage(art.canvas, st.col * S3, st.row * S3, S3, S3, 0, 0, st.cv.width, st.cv.height);
      }
    }
  }
}
