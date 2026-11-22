import { Cube, FACES } from './cube.js';
import { mountCareer, enterCareer } from './career.js';
import { mountPlay, enterPlay, leavePlay } from './play.js';
import { mountMusic, enterMusic, leaveMusic } from './music.js';
import { watchSections, scrollToSection, observeReveals, resetReveals } from './chrome.js';
import { reducedMotion } from './util.js';

const views = {
  home: document.getElementById('home'),
  career: document.getElementById('career'),
  play: document.getElementById('play'),
  music: document.getElementById('music'),
};
const faceOf = { career: 'cs', play: 'play', music: 'music' };
const wipe = document.querySelector('.wipe');

mountCareer(views.career);
mountPlay(views.play);
mountMusic(views.music);

const cube = new Cube(views.home.querySelector('.home-cube'), {
  onEnter: (face) => { location.hash = `#/${FACES[face].route}`; },
});

const hooks = {
  home: { enter: () => cube.start(), leave: () => cube.stop() },
  career: { enter: () => enterCareer(views.career) },
  play: { enter: enterPlay, leave: leavePlay },
  music: { enter: enterMusic, leave: leaveMusic },
};

let current = null;
let unwatch = null;
let busy = Promise.resolve();

function parse() {
  const [, view = '', sec = ''] = location.hash.split('/');
  return { view: views[view] ? view : 'home', sec };
}

const wait = (ms) => new Promise((r) => setTimeout(r, reducedMotion() ? 0 : ms));

function show(view) {
  for (const [k, v] of Object.entries(views)) {
    v.hidden = k !== view;
    v.classList.remove('is-in');
  }
  document.body.dataset.view = view;
  document.title = view === 'home' ? 'Timo Hromádka' : `${views[view].dataset.title} — Timo Hromádka`;
  scrollTo(0, 0);
  hooks[view].enter?.();
  if (unwatch) unwatch();
  unwatch = view === 'home' ? null : watchSections(views[view]);
  resetReveals(views[view]);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    views[view].classList.add('is-in');
    observeReveals(views[view]);
  }));
}

// Dark circular wipe used when moving into/out of the music page.
function setWipe(open, instant = false) {
  wipe.classList.toggle('no-anim', instant);
  wipe.classList.toggle('is-open', open);
  if (instant) void wipe.offsetWidth; // commit before re-enabling transitions
  wipe.classList.remove('no-anim');
}

async function route() {
  const { view, sec } = parse();
  if (view === current) {
    if (sec) scrollToSection(views[view], sec);
    return;
  }
  const prev = current;
  current = view;
  if (prev) hooks[prev].leave?.();

  if (prev === 'home' && faceOf[view]) {
    // push through the chosen face of the cube
    document.body.classList.add('is-transit', `to-${view}`);
    if (view === 'music') setWipe(true);
    await cube.zoomInto(faceOf[view]);
    cube.stop();
    document.body.classList.remove('is-transit');
    show(view);
    if (view === 'music') setWipe(false, true);
    setTimeout(() => document.body.classList.remove(`to-${view}`), 900);
  } else if (view === 'home' && prev) {
    views[prev].classList.remove('is-in');
    await wait(320);
    if (prev === 'music') setWipe(true, true);
    show('home');
    cube.zoomOut(faceOf[prev]);
    if (prev === 'music') { await wait(80); setWipe(false); }
  } else {
    if (prev) { views[prev].classList.remove('is-in'); await wait(250); }
    show(view);
  }
  if (sec) setTimeout(() => scrollToSection(views[view], sec, false), 60);
}

addEventListener('hashchange', () => { busy = busy.then(route); });
busy = busy.then(route);

// Esc returns home from any section.
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && current !== 'home') location.hash = '#/';
});
