import type { ProductUnit } from '../../lib/types';

/** Quantities keep up to 3 decimals (kilos, liters…), like the API. */
export const roundQuantity = (value: number) => Math.round(value * 1000) / 1000;

/** A typed quantity ("0.3", "1,25", " 2 "), or null while it is not a number yet ("", "0."). */
export function parseQuantity(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d*\.?\d+$/.test(normalized)) return null;
  return roundQuantity(Number(normalized));
}

/** Units sold by weight or volume: they take fractions and show grams / milliliters. */
export const isWeighed = (unit: ProductUnit) => unit === 'kg' || unit === 'liter';

/** Quick amounts for a weighed product: a quarter, a half and one kilo or liter. */
export const WEIGHED_PRESETS = [0.25, 0.5, 1] as const;
