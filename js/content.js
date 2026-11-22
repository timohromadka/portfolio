// ─────────────────────────────────────────────────────────────
//  All site content lives here. Edit this file to update the site.
//  Entries marked `todo: true` are placeholders and render with a
//  small "placeholder" tag so they are easy to spot.
// ─────────────────────────────────────────────────────────────

export const site = {
  name: 'Timo Hromádka',
  tagline: 'computer science · projects & play · music & writing',
  email: 'timo.hromadka@gmail.com',
  location: 'Cambridge, UK',
  cv: 'pdf2/resume_january_2024.pdf',
  links: [
    { label: 'GitHub', url: 'https://github.com/timohromadka' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/timo-hromadka' },
    { label: 'Instagram', url: 'https://www.instagram.com/timohromadka/' },
  ],
};

// ── Career / computer science ────────────────────────────────

export const education = [
  {
    title: 'MPhil Advanced Computer Science',
    org: 'University of Cambridge',
    when: '2023 – 2024',
    points: ['Details to be added from the updated CV.'],
    todo: true,
  },
  {
    title: 'BSc Computer Science',
    org: "King's College London",
    when: '2019 – 2022',
    points: [
      'First Class Honours — 82% C-score',
      'Thesis: Exploring the Efficacy of Paraphrase-Based Data Augmentation in Fake News Detection',
    ],
  },
  {
    title: 'International Baccalaureate',
    org: '',
    when: '2016 – 2018',
    points: ['Higher Level: Mathematics, Biology, English'],
  },
];

export const experience = [
  {
    title: 'Data Scientist — Bioinformatician',
    org: 'CircaGene',
    when: '02/2023 – present',
    points: [
      'Whole genome analysis — productionised variant calling and mutation detection, with automatic report generation for doctors and customers.',
      'AI development — literature review, EDA and a machine-learning experimentation pipeline on metagenomic and metabolomic data; deployed models to production.',
    ],
  },
  {
    title: 'NLP Research Intern',
    org: 'KInIT',
    when: '07/2022 – 01/2023',
    points: [
      'Multilingual persuasion-technique detection — led the team that won the most gold medals in SemEval 2023 Task 3, subtask 3.',
      'Previously fact-checked claim retrieval — literature review, EDA, pipelines, annotation and paper writing.',
    ],
  },
  {
    title: "King's Undergraduate Research Fellow",
    org: "King's College London",
    when: '06/2022 – 08/2022',
    points: [
      'UML models from hand-drawn sketches — edge detection and image segmentation to digitise hand-drawn UML diagrams.',
    ],
  },
  {
    title: 'Teaching Assistant',
    org: "King's College London",
    when: '09/2020 – 05/2022',
    points: [
      'Logic (4CCS1ELA) — propositional and predicate logic, proof methods, and their use in specifying and validating software requirements.',
      'Computer Systems (4CCS1CS1) — machine organisation, binary arithmetic, assembly programming, memory and performance.',
    ],
  },
  {
    title: 'Computer Vision Research Intern',
    org: 'Slovak Academy of Sciences',
    when: '07/2020 – 09/2020',
    points: [
      'Built an automated CNC controller and image stitcher (OpenCV, Raspberry Pi) to capture high-resolution images of gallery paintings.',
    ],
  },
];

export const research = [
  {
    title: 'Multilingual Previously Fact-Checked Claim Retrieval',
    venue: 'KInIT · 2023',
    url: 'https://arxiv.org/abs/2305.07991',
    abstract:
      'Introduces MultiClaim, a multilingual dataset for previously fact-checked claim retrieval: 28k social-media posts in 27 languages, 206k fact-checks in 39 languages and 31k connections between them — the most extensive and linguistically diverse dataset of its kind. Evaluates unsupervised methods across its dimensions and shows a supervised fine-tuning approach improves on them significantly.',
  },
  {
    title:
      'KInITVeraAI at SemEval-2023 Task 3: Simple yet Powerful Multilingual Fine-Tuning for Persuasion Techniques Detection',
    venue: 'SemEval · 2023',
    url: 'https://arxiv.org/abs/2304.11924',
    abstract:
      'The best-performing system for persuasion-techniques detection (subtask 3): XLM-RoBERTa large fine-tuned jointly on all languages, with confidence thresholds calibrated separately for seen and surprise languages. Best on 6 of 9 languages, including two surprise languages.',
  },
];

// ── Projects & play ──────────────────────────────────────────

export const volunteering = [
  {
    title: 'Founder & President — KCL Calisthenics Society',
    when: "King's College London",
    text: 'Founded the society, led regular group workouts and organised inter-university meetups.',
    url: 'https://www.instagram.com/kclcalisthenics/',
  },
  {
    title: 'SSLC & Class Representative',
    when: "King's College London · 2019 – 2022",
    text: 'Liaison between Computer Science students and the department on educational, social and equality matters.',
  },
];

export const work = [
  {
    title: 'Work entry',
    when: '—',
    text: 'Placeholder — to be filled in from the updated CV.',
    todo: true,
  },
];

export const projects = [
  {
    title: 'Chess tournament manager',
    when: 'web app',
    text: 'Swiss-pairing tournament manager with live standings and a projector view that follows the main window.',
    url: 'chess_tournament/',
  },
  {
    title: 'OpenCV CNC controller',
    when: 'python · raspberry pi',
    text: 'Automated CNC rig and image stitcher for photographing paintings at very high resolution.',
  },
  {
    title: 'More on GitHub',
    when: 'github.com/timohromadka',
    text: 'Other experiments and code.',
    url: 'https://github.com/timohromadka',
  },
];

export const books = [
  { title: 'Book title', author: 'Author', note: 'Placeholder — add books you love.', todo: true },
];

export const hobbies = [
  {
    title: "Rubik's cubes",
    text: 'Competitive speedcuber specialising in blindfolded events; national record holder in 3×3 blindfolded and multi-blind.',
    url: 'https://www.worldcubeassociation.org/persons/2016HROM01',
  },
  { title: 'Piano', text: 'Level 8+. Favourites: La Campanella, Sofiane Pamart’s LETTER, Rachmaninoff’s preludes in C♯ and G♯ minor.' },
  { title: 'Chess', text: 'First-team classical player for KCL Chess Club.', url: 'https://lichess.org/@/YouDonut' },
  { title: 'Baseball', text: 'Slovak national junior & cadet teams (2010–2014); London Mets Sidewinders since 2023.' },
  { title: 'Calisthenics', text: 'Founded KCL Calisthenics.' },
  { title: 'Memory & mnemonics', text: 'Memory palaces, working and episodic memory.' },
  { title: 'Puzzles', text: 'Competitive-programming-style puzzles and physical mind puzzles.' },
  { title: 'Cards & magic', text: 'Amateur magician. Oh Hell, Durak, Exploding Kittens, Texas Hold ’em.' },
];

// ── Music, art & writing ─────────────────────────────────────
//  tracks: `src` is an MP3 in /audio (same site, so the visualiser can
//  read it). Leave src null to show a generated waveform instead.

export const tracks = [
  { title: 'Untitled I', meta: 'piano · placeholder', src: null, seed: 3 },
  { title: 'Untitled II', meta: 'piano · placeholder', src: null, seed: 11 },
  { title: 'Untitled III', meta: 'piano · placeholder', src: null, seed: 27 },
];

// date: YYYY-MM-DD. Past/future is worked out from today's date.
export const events = [
  { date: '2026-12-12', title: 'Event title', place: 'Venue, City', note: 'Placeholder upcoming event.', todo: true },
  { date: '2025-06-01', title: 'Event title', place: 'Venue, City', note: 'Placeholder past event.', todo: true },
];

// Paste Spotify (open.spotify.com/track|album/…) or SoundCloud URLs.
export const discography = [
  { title: 'Release title', year: '—', url: '', todo: true },
];

export const art = [
  { title: 'Artwork', note: 'Placeholder — add images to /images/art and list them here.', src: '', todo: true },
];

export const writing = [
  {
    title: 'Untitled',
    lines: ['placeholder lines,', 'a poem goes here —', 'edit js/content.js'],
    todo: true,
  },
];
