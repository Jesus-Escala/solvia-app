/** Period presets and helpers for the dashboard (calendar days, local time, YYYY-MM-DD). */

export type Granularity = 'day' | 'week' | 'month';
export type PeriodPreset =
  | 'thisMonth'
  | 'lastMonth'
  | 'last30'
  | 'thisQuarter'
  | 'last6Months'
  | 'last12Months'
  | 'thisYear'
  | 'lastYear'
  | 'custom';

export const PRESETS: Exclude<PeriodPreset, 'custom'>[] = [
  'thisMonth',
  'lastMonth',
  'last30',
  'thisQuarter',
  'last6Months',
  'last12Months',
  'thisYear',
  'lastYear',
];

export interface PeriodRange {
  from: string;
  to: string;
}

const pad = (value: number) => String(value).padStart(2, '0');

export function toIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromIso(value: string): Date {
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, day);
}

/** Date range of a preset, relative to `today`. Ranges never go past today. */
export function presetRange(
  preset: Exclude<PeriodPreset, 'custom'>,
  today = new Date(),
): PeriodRange {
  const y = today.getFullYear();
  const m = today.getMonth();
  const todayIso = toIso(today);
  switch (preset) {
    case 'thisMonth':
      return { from: toIso(new Date(y, m, 1)), to: todayIso };
    case 'lastMonth':
      return { from: toIso(new Date(y, m - 1, 1)), to: toIso(new Date(y, m, 0)) };
    case 'last30':
      return { from: toIso(new Date(y, m, today.getDate() - 29)), to: todayIso };
    case 'thisQuarter':
      return { from: toIso(new Date(y, Math.floor(m / 3) * 3, 1)), to: todayIso };
    case 'last6Months':
      return { from: toIso(new Date(y, m - 5, 1)), to: todayIso };
    case 'last12Months':
      return { from: toIso(new Date(y, m - 11, 1)), to: todayIso };
    case 'thisYear':
      return { from: toIso(new Date(y, 0, 1)), to: todayIso };
    case 'lastYear':
      return { from: toIso(new Date(y - 1, 0, 1)), to: toIso(new Date(y - 1, 11, 31)) };
  }
}

/** Which preset (if any) exactly matches a range. */
export function matchPreset(range: PeriodRange, today = new Date()): PeriodPreset {
  return (
    PRESETS.find((preset) => {
      const candidate = presetRange(preset, today);
      return candidate.from === range.from && candidate.to === range.to;
    }) ?? 'custom'
  );
}

export function daysBetween(range: PeriodRange): number {
  return Math.round((fromIso(range.to).getTime() - fromIso(range.from).getTime()) / 86_400_000) + 1;
}

/** Same rule as the API: ≤ 31 days → day, ≤ 120 days → week, otherwise month. */
export function autoGranularity(range: PeriodRange): Granularity {
  const days = daysBetween(range);
  if (days <= 31) return 'day';
  if (days <= 120) return 'week';
  return 'month';
}

/** Granularities that make sense for a range (no 700 daily bars, no single monthly bar). */
export function allowedGranularities(range: PeriodRange): Granularity[] {
  const days = daysBetween(range);
  const options: Granularity[] = [];
  if (days <= 93) options.push('day');
  if (days >= 14 && days <= 400) options.push('week');
  if (days >= 45) options.push('month');
  return options.length > 0 ? options : [autoGranularity(range)];
}

export function isValidRange(range: PeriodRange): boolean {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(range.from) || !iso.test(range.to) || range.from > range.to) return false;
  return daysBetween(range) <= 366 * 3;
}
