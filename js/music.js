import { tracks, events, discography, art, writing } from './content.js';
import { el, rng, lerp, reducedMotion } from './util.js';
import { pageChrome } from './chrome.js';

const SECTIONS = [
  { id: 'listen', label: 'listen' },
  { id: 'events', label: 'events' },
  { id: 'discography', label: 'discography' },
  { id: 'art', label: 'art' },
  { id: 'writing', label: 'writing' },
];

const todo = (x) => (x.todo ? el('span', { class: 'todo' }, 'placeholder') : null);
const BINS = 220;      // bars in the top waveform
const N = 128;         // samples per Fourier window
const TERMS = 28;      // epicycles drawn

// ── content ──────────────────────────────────────────────────

function embedFor(url) {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('spotify.com')) {
      const [, kind, id] = u.pathname.split('/');
      return { src: `https://open.spotify.com/embed/${kind}/${id}`, h: kind === 'track' ? 152 : 352 };
    }
    if (u.hostname.endsWith('soundcloud.com'))
      return { src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23d9dde3&visual=false&show_comments=false`, h: 166 };
  } catch { /* not a URL */ }
  return null;
}

function eventRow(e, i, today) {
  const past = e.date < today;
  const d = new Date(`${e.date}T12:00:00`);
  return el('li', { class: `m-ev reveal ${past ? 'is-past' : 'is-next'}`, style: `--i:${i}` },
    el('time', { datetime: e.date }, d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })),
    el('div', {},
      el('h3', {}, e.title, todo(e)),
      el('p', { class: 'm-ev__place' }, e.place),
      e.note ? el('p', {}, e.note) : null),
    el('span', { class: 'm-ev__tag' }, past ? 'past' : 'upcoming'));
}

function release(r, i) {
  const emb = r.url && embedFor(r.url);
  const box = el('div', { class: 'm-rel__embed' });
  if (emb) {
    const btn = el('button', { class: 'm-rel__load', type: 'button' }, '▶ load player');
    btn.addEventListener('click', () => {
      box.replaceChildren(el('iframe', { src: emb.src, height: emb.h, loading: 'lazy', allow: 'autoplay; encrypted-media; clipboard-write', title: r.title }));
    });
    box.append(btn);
  } else {
    box.append(el('p', { class: 'm-muted' }, 'Add a Spotify or SoundCloud link in js/content.js'));
  }
  return el('article', { class: 'm-rel reveal', style: `--i:${i}` },
    el('div', { class: 'm-rel__head' }, el('h3', {}, r.title, todo(r)), el('span', {}, r.year)),
    box);
}

export function mountMusic(root) {
  const { bar, back } = pageChrome('music', SECTIONS);
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...events].sort((a, b) => (a.date < b.date ? 1 : -1));

  const bg = el('canvas', { class: 'm-bg', 'aria-hidden': 'true' });
  const wave = el('canvas', { class: 'm-wave' });
  const four = el('canvas', { class: 'm-four', 'aria-hidden': 'true' });
  const player = el('div', { class: 'm-player' },
    el('button', { class: 'm-btn', type: 'button', 'data-act': 'prev', 'aria-label': 'Previous track' }, '⏮'),
    el('button', { class: 'm-btn m-btn--play', type: 'button', 'data-act': 'play', 'aria-label': 'Play' }, '▶'),
    el('button', { class: 'm-btn', type: 'button', 'data-act': 'next', 'aria-label': 'Next track' }, '⏭'),
    el('div', { class: 'm-player__info' },
      el('p', { class: 'm-player__title' }),
      el('p', { class: 'm-player__meta' })),
    el('p', { class: 'm-player__time' }, '0:00'));

  root.append(bg, back, bar,
    el('main', { class: 'm-main' },
      el('section', { class: 'm-hero', 'data-sec': 'listen' },
        el('h1', { class: 'm-title' }, 'music', el('em', {}, ' & '), 'writing'),
        wave, four, player,
        el('p', { class: 'm-caption' }, 'the curves are the waveform’s Fourier series — each circle one frequency, together tracing the sound above')),
      el('section', { class: 'm-sec', 'data-sec': 'events' },
        el('h2', { class: 'reveal' }, el('span', {}, '01'), 'events'),
        el('ol', { class: 'm-timeline' }, sorted.map((e, i) => eventRow(e, i, today)))),
      el('section', { class: 'm-sec', 'data-sec': 'discography' },
        el('h2', { class: 'reveal' }, el('span', {}, '02'), 'discography'),
        el('div', { class: 'm-rels' }, discography.map(release))),
      el('section', { class: 'm-sec', 'data-sec': 'art' },
        el('h2', { class: 'reveal' }, el('span', {}, '03'), 'art'),
        el('div', { class: 'm-art' }, art.map((a, i) => el('figure', { class: 'reveal', style: `--i:${i}` },
          a.src ? el('img', { src: a.src, alt: a.title, loading: 'lazy' }) : el('div', { class: 'm-art__ph' }),
          el('figcaption', {}, a.title, todo(a), a.note ? el('span', {}, a.note) : null))))),
      el('section', { class: 'm-sec', 'data-sec': 'writing' },
        el('h2', { class: 'reveal' }, el('span', {}, '04'), 'writing'),
        el('div', { class: 'm-poems' }, writing.map((p, i) => el('article', { class: 'm-poem reveal', style: `--i:${i}` },
          el('h3', {}, p.title, todo(p)),
          el('p', {}, p.lines.flatMap((l, k) => (k ? [el('br'), l] : [l])))))))));

  viz = new Viz({ bg, wave, four, player });
}

let viz;
export const enterMusic = () => viz && viz.start();
export const leaveMusic = () => viz && viz.stop();

// ── signal helpers ───────────────────────────────────────────

// Generated stand-in for a track with no audio file: a few harmonics whose
// mix drifts slowly over the song, under a loudness envelope.
function synth(seed) {
  const R = rng(seed * 101 + 7);
  const h = Array.from({ length: 6 }, (_, k) => ({ f: k + 1, a: R() / (k + 1) ** 0.7, p: R() * 6.28, d: 0.2 + R() * 1.5 }));
  const env = Array.from({ length: 9 }, () => 0.25 + R() * 0.75);
  const envAt = (u) => { const x = u * (env.length - 1), i = Math.floor(x); return lerp(env[i], env[Math.min(i + 1, env.length - 1)], x - i); };
  return {
    duration: 150 + Math.floor(R() * 90),
    peaks: Array.from({ length: BINS }, (_, i) => {
      const u = i / BINS;
      return Math.min(1, envAt(u) * (0.55 + 0.45 * Math.abs(Math.sin(i * 0.9 + seed)) * (0.6 + 0.4 * R())));
    }),
    window(u) {
      const out = new Float32Array(N);
      for (let n = 0; n < N; n++) {
        let v = 0;
        for (const x of h) v += x.a * Math.sin((2 * Math.PI * x.f * n) / N + x.p + Math.sin(u * 40 * x.d) * 1.2);
        out[n] = v;
      }
      return out;
    },
  };
}

function dft(x) {
  const coeffs = [];
  for (let k = 1; k < N / 2; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const a = (2 * Math.PI * k * n) / N;
      re += x[n] * Math.cos(a); im -= x[n] * Math.sin(a);
    }
    coeffs.push({ k, re: (2 * re) / N, im: (2 * im) / N });
  }
  return coeffs;
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ── visualiser + player ─────────────────────────────────────

class Viz {
  constructor({ bg, wave, four, player }) {
    Object.assign(this, { bg, wave, four, player });
    this.i = 0;
    this.pos = 0;
    this.playing = false;
    this.peaks = new Array(BINS).fill(0);
    this.coef = dft(new Float32Array(N)).map((c) => ({ ...c }));
    this.trail = [];
    this.trace = [];
    this.tau = 0;
    this.stars = Array.from({ length: 160 }, () => ({ a: Math.random() * 6.28, r: Math.random(), s: 0.2 + Math.random() * 1.6, z: Math.random() }));
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.addEventListener('ended', () => this.go(1, true));
    player.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'play') this.toggle();
      else this.go(b.dataset.act === 'next' ? 1 : -1, this.playing);
    });
    wave.addEventListener('click', (e) => {
      const r = wave.getBoundingClientRect();
      this.seek((e.clientX - r.left) / r.width);
    });
    this.load(0);
    addEventListener('resize', () => this.size());
  }

  size() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    for (const c of [this.bg, this.wave, this.four]) {
      const r = c === this.bg ? { width: innerWidth, height: innerHeight } : c.getBoundingClientRect();
      c.width = Math.max(1, r.width * dpr); c.height = Math.max(1, r.height * dpr);
    }
    this.dpr = dpr;
  }

  async load(i) {
    this.i = (i + tracks.length) % tracks.length;
    const tr = tracks[this.i];
    this.track = tr;
    this.pos = 0;
    this.trace = []; this.trail = [];
    this.player.querySelector('.m-player__title').textContent = tr.title;
    this.player.querySelector('.m-player__meta').textContent = tr.meta + (tr.src ? '' : ' · visual only');
    this.gen = synth(tr.seed ?? this.i);
    this.target = this.gen.peaks;
    this.duration = this.gen.duration;
    this.decoded = null;
    if (tr.src) {
      this.audio.src = tr.src;
      try {
        const buf = await (await fetch(tr.src)).arrayBuffer();
        const ac = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
        this.ctx = ac;
        const ab = await ac.decodeAudioData(buf);
        const data = ab.getChannelData(0);
        this.decoded = data;
        this.duration = ab.duration;
        const step = Math.floor(data.length / BINS);
        const peaks = [];
        let max = 0;
        for (let b = 0; b < BINS; b++) {
          let m = 0;
          for (let j = b * step; j < (b + 1) * step; j += 16) m = Math.max(m, Math.abs(data[j]));
          peaks.push(m); max = Math.max(max, m);
        }
        this.target = peaks.map((p) => p / (max || 1));
      } catch (err) { console.warn('could not decode', tr.src, err); }
    } else {
      this.audio.removeAttribute('src');
    }
  }

  async go(d, autoplay) {
    const wasPlaying = this.playing;
    this.pause();
    await this.load(this.i + d);
    if (autoplay || wasPlaying) this.play();
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  play() {
    this.playing = true;
    this.player.querySelector('[data-act=play]').textContent = '❚❚';
    this.player.querySelector('[data-act=play]').setAttribute('aria-label', 'Pause');
    if (this.track.src) {
      this.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (!this.analyser) {
        const srcNode = this.ctx.createMediaElementSource(this.audio);
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 2048;
        srcNode.connect(this.analyser).connect(this.ctx.destination);
        this.buf = new Float32Array(this.analyser.fftSize);
      }
      this.ctx.resume();
      this.audio.currentTime = this.pos;
      this.audio.play().catch(() => {});
    }
  }

  pause() {
    this.playing = false;
    this.player.querySelector('[data-act=play]').textContent = '▶';
    this.player.querySelector('[data-act=play]').setAttribute('aria-label', 'Play');
    this.audio.pause();
  }

  seek(u) {
    this.pos = Math.max(0, Math.min(1, u)) * this.duration;
    if (this.track.src) this.audio.currentTime = this.pos;
  }

  // The 128-sample slice of sound the epicycles are rebuilding right now.
  currentWindow() {
    const u = this.pos / this.duration;
    if (this.playing && this.analyser) {
      this.analyser.getFloatTimeDomainData(this.buf);
      let z = 0; // start at a rising zero crossing so the shape holds still
      for (let j = 1; j < 1024; j++) if (this.buf[j - 1] < 0 && this.buf[j] >= 0) { z = j; break; }
      const w = new Float32Array(N);
      for (let n = 0; n < N; n++) w[n] = this.buf[z + n * 8] || 0;
      return w;
    }
    if (this.decoded) {
      const start = Math.floor(u * (this.decoded.length - N * 8));
      const w = new Float32Array(N);
      for (let n = 0; n < N; n++) w[n] = this.decoded[start + n * 8] || 0;
      return w;
    }
    return this.gen.window(u);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.size();
    let last = performance.now(), acc = 0;
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += dt;
      if (acc > 0.12) { acc = 0; this.retarget(); }
      this.frame(dt, now / 1000);
      this.raf = requestAnimationFrame(loop);
    };
    this.retarget();
    this.raf = requestAnimationFrame(loop);
  }

  stop() { this.running = false; cancelAnimationFrame(this.raf); this.pause(); }

  retarget() {
    const w = this.currentWindow();
    let max = 0;
    for (const v of w) max = Math.max(max, Math.abs(v));
    for (let n = 0; n < N; n++) w[n] /= max || 1;
    this.next = dft(w);
  }

  frame(dt, t) {
    if (this.playing) {
      this.pos = this.track.src ? this.audio.currentTime : this.pos + dt;
      if (!this.track.src && this.pos >= this.duration) this.go(1, true);
    }
    this.player.querySelector('.m-player__time').textContent = `${fmt(this.pos)} / ${fmt(this.duration)}`;
    for (let b = 0; b < BINS; b++) this.peaks[b] = lerp(this.peaks[b], this.target[b], 1 - Math.exp(-dt * 5));
    // morph coefficients smoothly toward the newest window
    if (this.next) for (let j = 0; j < this.coef.length; j++) {
      const k = 1 - Math.exp(-dt * 4);
      this.coef[j].re = lerp(this.coef[j].re, this.next[j].re, k);
      this.coef[j].im = lerp(this.coef[j].im, this.next[j].im, k);
    }
    this.drawBg(t);
    this.drawWave(t);
    this.drawFourier(dt, t);
  }

  drawBg(t) {
    const c = this.bg, x = c.getContext('2d'), W = c.width, H = c.height, d = this.dpr;
    x.clearRect(0, 0, W, H);
    const cx = W * 0.62, cy = H * 0.42;
    // hairline radial fan
    x.strokeStyle = 'rgba(200,210,225,0.035)';
    x.lineWidth = d;
    x.beginPath();
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2 + t * 0.01;
      x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * W, cy + Math.sin(a) * W);
    }
    x.stroke();
    // big orbit arcs
    x.strokeStyle = 'rgba(220,228,240,0.09)';
    x.beginPath(); x.ellipse(cx, cy, W * 0.42, H * 0.46, 0.2, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(cx - W * 0.3, cy + H * 0.1, H * 0.5, -1.2, 1.4); x.stroke();
    // HUD grid patches with digits
    x.font = `${9 * d}px "JetBrains Mono", monospace`;
    for (const [gx, gy] of [[0.03, 0.62], [0.86, 0.8]]) {
      const X = gx * W, Y = gy * H, s = 14 * d;
      x.strokeStyle = 'rgba(220,228,240,0.08)';
      x.beginPath();
      for (let i = 0; i <= 8; i++) { x.moveTo(X + i * s, Y); x.lineTo(X + i * s, Y + 5 * s); }
      for (let j = 0; j <= 5; j++) { x.moveTo(X, Y + j * s); x.lineTo(X + 8 * s, Y + j * s); }
      x.stroke();
      x.fillStyle = 'rgba(220,228,240,0.28)';
      for (let j = 0; j < 4; j++) x.fillText(String(Math.floor(((Math.sin(gx * 99 + j + Math.floor(t * 0.5)) + 1) * 4.5e6))), X + 2 * d, Y + (j + 1) * s - 3 * d);
    }
    // drifting stars, flowing outward
    for (const s of this.stars) {
      s.r += 0.0006 * s.s * (reducedMotion() ? 0 : 1);
      if (s.r > 1) s.r = 0.02;
      const R = s.r * Math.max(W, H) * 0.7;
      x.fillStyle = `rgba(235,240,248,${0.15 + 0.6 * s.z * s.r})`;
      x.beginPath(); x.arc(cx + Math.cos(s.a) * R, cy + Math.sin(s.a) * R * 0.8, (0.4 + s.z * 1.4 * s.r) * d, 0, 7); x.fill();
    }
  }

  drawWave() {
    const c = this.wave, x = c.getContext('2d'), W = c.width, H = c.height, d = this.dpr;
    x.clearRect(0, 0, W, H);
    const u = this.pos / this.duration;
    const bw = W / BINS, mid = H / 2;
    for (let b = 0; b < BINS; b++) {
      const h = Math.max(1 * d, this.peaks[b] * (H * 0.46));
      const played = b / BINS < u;
      x.fillStyle = played ? 'rgba(236,240,246,0.92)' : 'rgba(236,240,246,0.24)';
      x.fillRect(b * bw + bw * 0.2, mid - h, bw * 0.6, h * 2);
    }
    // the slice currently being traced
    const px = u * W;
    x.fillStyle = 'rgba(255,255,255,0.08)';
    x.fillRect(px - 4 * d, 0, 8 * d, H);
    x.fillStyle = '#fff';
    x.fillRect(px - 0.5 * d, 0, 1 * d, H);
  }

  drawFourier(dt) {
    const c = this.four, x = c.getContext('2d'), W = c.width, H = c.height, d = this.dpr;
    x.clearRect(0, 0, W, H);
    const terms = [...this.coef].map((q) => ({ ...q, amp: Math.hypot(q.re, q.im), ph: Math.atan2(q.im, q.re) }))
      .sort((a, b) => b.amp - a.amp).slice(0, TERMS);
    const total = terms.reduce((s, q) => s + q.amp, 0) || 1;
    const A = (H * 0.36) / Math.max(1, total * 0.75);
    const ox = W * 0.24, oy = H * 0.5;
    if (!reducedMotion()) this.tau += dt * (this.playing ? 1 : 0.35) * (N / 3.2);
    const tau = this.tau;

    let px = ox, py = oy;
    x.lineWidth = d * 0.8;
    for (const q of terms) {
      const r = q.amp * A;
      const a = (2 * Math.PI * q.k * tau) / N + q.ph;
      x.strokeStyle = 'rgba(210,220,235,0.14)';
      x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.stroke();
      const nx = px + Math.sin(a) * r, ny = py - Math.cos(a) * r;
      x.strokeStyle = 'rgba(230,236,245,0.45)';
      x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke();
      px = nx; py = ny;
    }
    // light-trail of the tip (the loops)
    this.trail.push([px, py]);
    if (this.trail.length > 420) this.trail.shift();
    x.save();
    x.shadowColor = 'rgba(255,255,255,0.8)';
    x.shadowBlur = 8 * d;
    for (let i = 1; i < this.trail.length; i++) {
      x.strokeStyle = `rgba(245,248,255,${(i / this.trail.length) * 0.85})`;
      x.lineWidth = d * (0.6 + (1.4 * i) / this.trail.length);
      x.beginPath(); x.moveTo(...this.trail[i - 1]); x.lineTo(...this.trail[i]); x.stroke();
    }
    x.restore();
    // the reconstructed wave, scrolling right from the pen
    const penX = W * 0.5;
    this.trace.unshift(py);
    const maxLen = Math.floor((W - penX) / (1.6 * d));
    if (this.trace.length > maxLen) this.trace.length = maxLen;
    x.strokeStyle = 'rgba(230,236,245,0.25)';
    x.setLineDash([3 * d, 4 * d]);
    x.beginPath(); x.moveTo(px, py); x.lineTo(penX, py); x.stroke();
    x.setLineDash([]);
    x.strokeStyle = 'rgba(240,244,250,0.9)';
    x.lineWidth = 1.3 * d;
    x.beginPath();
    this.trace.forEach((y, i) => (i ? x.lineTo(penX + i * 1.6 * d, y) : x.moveTo(penX, y)));
    x.stroke();
    x.fillStyle = '#fff';
    x.beginPath(); x.arc(penX, py, 2.5 * d, 0, 7); x.fill();
    // little axis ticks
    x.fillStyle = 'rgba(220,228,240,0.35)';
    x.font = `${9 * d}px "JetBrains Mono", monospace`;
    x.fillText(`Σ ${terms.length} terms`, ox - 40 * d, H - 10 * d);
    x.fillText(`f₁ = ${terms[0] ? terms[0].k : 0}`, penX, H - 10 * d);
  }
}
