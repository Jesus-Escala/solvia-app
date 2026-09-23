/**
 * Geometry of Soli's head in a 64x64 box, shared by the logo mark and the full-body mascot so
 * both always look identical. Friendly on purpose: rounded ear tufts, big sparkly eyes, brows
 * arched upward (never a V, which reads as angry), blush and a small rounded beak.
 * Keep in sync with public/favicon.svg and the PDF header (backend/src/services/statement.service.ts).
 */
export const OWL = {
  head: 'M13 17C13.5 14.5 16 13.8 18 15L24 19.6C26.5 18.9 29.2 18.5 32 18.5C34.8 18.5 37.5 18.9 40 19.6L46 15C48 13.8 50.5 14.5 51 17L51.5 29.5C52.5 32 53 34.7 53 37.5C53 47.7 43.6 54.5 32 54.5C20.4 54.5 11 47.7 11 37.5C11 34.7 11.5 32 12.5 29.5Z',
  brows: ['M17 27.4Q23.5 23.6 29.6 26.4', 'M34.4 26.4Q40.5 23.6 47 27.4'],
  beak: 'M32 41.6C30.4 41.6 29 42.6 29 43.9C29 45.6 30.8 47.3 32 48C33.2 47.3 35 45.6 35 43.9C35 42.6 33.6 41.6 32 41.6Z',
  eyes: [
    { cx: 23.5, cy: 38 },
    { cx: 40.5, cy: 38 },
  ],
  eyeRing: 9.2,
  pupil: 6.4,
  /** Two sparkles per eye: a big one up-right and a small one down-left. */
  highlights: [
    { dx: 2.2, dy: -2.3, r: 2.3 },
    { dx: -2.1, dy: 2.3, r: 1 },
  ],
  blush: [
    { cx: 15.8, cy: 45, rx: 3.3, ry: 2 },
    { cx: 48.2, cy: 45, rx: 3.3, ry: 2 },
  ],
  /** "S/" drawn inside the gold coin of the logo mark (coin centered at 49,49, r 9.5). */
  coin: { cx: 49, cy: 49, r: 9.5 },
  coinS:
    'M50.4 45.6C49.7 44.8 48.8 44.4 47.7 44.4C46.1 44.4 45.1 45.2 45.1 46.4C45.1 47.7 46.3 48 47.8 48.3C49.4 48.6 50.5 49 50.5 50.3C50.5 51.5 49.4 52.3 47.8 52.3C46.6 52.3 45.7 51.9 45.1 51.1',
  coinSlash: 'M54.4 43.8L52 54',
} as const;

export const OWL_COLORS = {
  head: '#f0fdfa',
  brow: '#0d9488',
  eyeRing: '#a7f3d0',
  pupil: '#0b2530',
  beak: '#f59e0b',
  blush: '#fb7185',
  gold: ['#fde68a', '#f59e0b'] as const,
  coinInk: '#92400e',
  teal: ['#34d399', '#0d9488', '#0c3a47'] as const,
  wing: '#0f766e',
  /** Soft outline so the light head/body read on white backgrounds (mascot only). */
  outline: '#5eead4',
};
