import type { KeyboardEvent } from 'react';
import type { ProductOption, ProductUnit } from '../../lib/types';
import { isWeighed } from '../domain/quantity';

/** A line of the sale: a catalog product, or a free line (a service, something not in the catalog). */
export interface Line {
  key: string;
  product: ProductOption | null;
  description: string;
  quantity: number;
  /** Price charged for one; starts at the product's price and can be changed for this sale. */
  price: number;
}

export const round2 = (value: number) => Math.round(value * 100) / 100;

/** A typed amount of money, 0 when it is not a positive number. */
export const money = (text: string) => {
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? round2(value) : 0;
};

/**
 * Whole units step by 1; kilos and liters by a quarter, meters by a half. Any amount can still be
 * typed (0.3 kg = 300 g).
 */
export const stepFor = (unit: ProductUnit) => (isWeighed(unit) ? 0.25 : unit === 'meter' ? 0.5 : 1);

/** Enter commits a small inline field instead of submitting the whole sale. */
export const onEnter = (action: () => void) => (event: KeyboardEvent) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  action();
};
