import { normalizeHex } from '@/ui';

/** Theme colors the first spots were saved with, and the palette shade that stands for each. */
const THEME: Record<string, string> = {
  primary: '#0f766e',
  info: '#2563eb',
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#dc2626',
  accent: '#b45309',
};

/** Color of a new spot. */
export const DEFAULT_SPOT_COLOR = '#0d9488';

/** The spot's color as a hex (for the picker and to pick a readable text color). */
export function spotHex(color: string): string {
  return THEME[color] ?? normalizeHex(color) ?? DEFAULT_SPOT_COLOR;
}

/** CSS colors to paint a spot: its color, a soft fill and darker shades for the sides of a box. */
export function spotPaint(color: string) {
  const base = THEME[color] ? `var(--color-${color})` : spotHex(color);
  return {
    base,
    soft: `color-mix(in srgb, ${base} 22%, var(--color-surface))`,
    side: `color-mix(in srgb, ${base} 80%, black)`,
    shade: `color-mix(in srgb, ${base} 62%, black)`,
  };
}
