/**
 * What a money box shows. While typing, at most 2 decimals (a third one is not taken; a comma
 * counts as the decimal point); when the box is left, always 2 ("5" → "5.00").
 */

/** Cleans what is being typed: digits and one decimal point, with up to 2 decimals. */
export function limitMoneyText(text: string): string {
  const clean = text.replace(',', '.').replace(/[^\d.]/g, '');
  const [whole = '', ...rest] = clean.split('.');
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join('').slice(0, 2)}`;
}

/** The box once left: 2 decimals, or empty when nothing (or not a number) was typed. */
export function padMoneyText(text: string): string {
  if (text.trim() === '') return '';
  const value = Number(limitMoneyText(text));
  return Number.isFinite(value) ? value.toFixed(2) : '';
}

/** An amount as the text of its box ("3.5" → "3.50"). */
export const moneyText = (value: number) => value.toFixed(2);
