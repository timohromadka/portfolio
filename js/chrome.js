// Shared page chrome: the "back to home" button and the sticky section tabs.
import { el } from './util.js';

export function pageChrome(view, sections) {
  const back = el('a', { class: 'back', href: '#/', 'aria-label': 'Back to home' },
    el('span', { class: 'back__arrow', 'aria-hidden': 'true' }, '←'),
    el('span', { class: 'back__label' }, 'back to home'));

  const tabs = sections.map((s) =>
    el('a', {
      class: 'tab', href: `#/${view}/${s.id}`, 'data-tab': s.id, style: s.color ? `--ink:${s.color}` : null,
      onclick: (e) => {
        e.preventDefault();
        history.replaceState(null, '', `#/${view}/${s.id}`);
        scrollToSection(e.currentTarget.closest('.view'), s.id);
      },
    }, s.label));
  const bar = el('nav', { class: 'tabs', 'aria-label': 'Sections' }, el('div', { class: 'tabs__inner' }, tabs));
  return { back, bar };
}

// Highlight the tab of the section currently in view.
export function watchSections(root) {
  const tabs = [...root.querySelectorAll('.tab')];
  const secs = [...root.querySelectorAll('[data-sec]')];
  const set = (id) => tabs.forEach((t) => t.classList.toggle('is-on', t.dataset.tab === id));
  const onScroll = () => {
    const y = innerHeight * 0.35;
    let cur = null;
    for (const s of secs) if (s.getBoundingClientRect().top < y) cur = s.dataset.sec;
    set(cur);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  return () => removeEventListener('scroll', onScroll);
}

export function scrollToSection(root, id, smooth = true) {
  const s = root.querySelector(`[data-sec="${id}"]`);
  if (!s) return;
  const top = s.getBoundingClientRect().top + scrollY - 84;
  scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
}

let io;
export function observeReveals(root) {
  io ||= new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  root.querySelectorAll('.reveal:not(.in)').forEach((n) => io.observe(n));
}

export function resetReveals(root) {
  root.querySelectorAll('.reveal.in').forEach((n) => n.classList.remove('in'));
}
