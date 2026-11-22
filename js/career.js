import { site, education, experience, research } from './content.js';
import { el } from './util.js';
import { pageChrome } from './chrome.js';

const SECTIONS = [
  { id: 'education', file: 'education.md' },
  { id: 'experience', file: 'experience.json' },
  { id: 'research', file: 'research.bib' },
];

const todo = (x) => (x.todo ? el('span', { class: 'todo' }, 'placeholder') : null);

function entry(x, i) {
  return el('article', { class: 'c-entry reveal', style: `--i:${i}` },
    el('div', { class: 'c-entry__when' }, x.when),
    el('div', { class: 'c-entry__body' },
      el('h3', {}, x.title, todo(x)),
      x.org ? el('p', { class: 'c-entry__org' }, el('span', { class: 'tok-k' }, '@ '), x.org) : null,
      el('ul', {}, x.points.map((p) => el('li', {}, p)))));
}

function paper(p, i) {
  return el('article', { class: 'c-paper reveal', style: `--i:${i}` },
    el('p', { class: 'c-paper__venue' }, p.venue),
    el('h3', {}, el('a', { href: p.url, target: '_blank', rel: 'noopener' }, p.title)),
    el('p', { class: 'c-paper__abs' }, p.abstract),
    el('a', { class: 'c-link', href: p.url, target: '_blank', rel: 'noopener' }, 'read paper ↗'));
}

export function mountCareer(root) {
  const { bar, back } = pageChrome('career', SECTIONS.map((s) => ({ id: s.id, label: s.file })));
  const head = (n, id, title, comment) =>
    el('header', { class: 'c-sec__head reveal' },
      el('span', { class: 'c-sec__n' }, `// ${n}`),
      el('h2', { id: `career-${id}` }, title),
      el('p', { class: 'c-sec__c' }, comment));

  root.append(
    back, bar,
    el('div', { class: 'c-grid', 'aria-hidden': 'true' }),
    el('main', { class: 'c-main' },
      el('section', { class: 'c-hero' },
        el('p', { class: 'c-hero__path' }, '~/timo/computer-science'),
        el('h1', { class: 'c-hero__name' }, site.name),
        el('p', { class: 'c-hero__type' }, el('span', { class: 'tok-k' }, '> '), el('span', { class: 'type-target', 'data-text': 'machine learning · NLP · bioinformatics' })),
        el('p', { class: 'c-hero__meta' }, site.location, ' · ', el('a', { href: `mailto:${site.email}` }, site.email))),
      el('section', { class: 'c-sec', 'data-sec': 'education' },
        head('01', 'education', 'education', 'where I studied'),
        education.map(entry)),
      el('section', { class: 'c-sec', 'data-sec': 'experience' },
        head('02', 'experience', 'experience', 'work, internships & teaching'),
        experience.map(entry)),
      el('section', { class: 'c-sec', 'data-sec': 'research' },
        head('03', 'research', 'research', 'papers & publications'),
        research.map(paper)),
      el('footer', { class: 'c-foot' },
        el('span', {}, 'contact'),
        el('a', { href: `mailto:${site.email}` }, site.email),
        site.links.map((l) => el('a', { href: l.url, target: '_blank', rel: 'noopener' }, l.label)),
        el('a', { href: site.cv, target: '_blank' }, 'cv.pdf'))));
}

let typing;
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
    }, 38);
  }, 450);
}
