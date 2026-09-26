import type { PaymentMethod, PaymentPart } from '../../lib/types';

export const METHODS: PaymentMethod[] = ['cash', 'yape', 'plin', 'bank_transfer'];
export const MAX_PARTS = 4;

/** One method of a payment split in several, as typed. */
export interface PartDraft {
  key: string;
  method: PaymentMethod;
  text: string;
}

export const round2 = (value: number) => Math.round(value * 100) / 100;
const amountOf = (text: string) => Math.max(0, round2(Number(text) || 0));
/** An amount as the text of its input (empty for zero). */
export const asText = (value: number) => (value > 0 ? round2(value).toFixed(2) : '');
let nextKey = 0;
export const newPartKey = () => `part-${(nextKey += 1)}`;

/**
 * Two parts to start: the first method (usually cash) empty and a second one with all of
 * `target`, so typing the cash part leaves the rest on the other method.
 */
export function startParts(target: number, first: PaymentMethod = 'cash'): PartDraft[] {
  const second = METHODS.find((method) => method !== first) ?? 'yape';
  return [
    { key: newPartKey(), method: first, text: '' },
    { key: newPartKey(), method: second, text: asText(target) },
  ];
}

export function partsSum(parts: PartDraft[]): number {
  return round2(parts.reduce((sum, part) => sum + amountOf(part.text), 0));
}

/** The parts with money, for the API. */
export function partsPayload(parts: PartDraft[]): PaymentPart[] {
  return parts
    .map((part) => ({ method: part.method, amount: amountOf(part.text) }))
    .filter((part) => part.amount > 0);
}

/** Whether the parts add up to `target` (to the cent), with at least one amount. */
export function partsComplete(parts: PartDraft[], target: number): boolean {
  return partsPayload(parts).length > 0 && Math.abs(partsSum(parts) - target) < 0.005;
}

/** A method, or "several" (the payment is split). */
export type MethodChoice = PaymentMethod | 'split';
