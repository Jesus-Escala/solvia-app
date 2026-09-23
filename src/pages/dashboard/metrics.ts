import type { PaymentMethod, PeriodMetric, ReceivableStatus, RiskLevel } from '../../lib/types';

/** Shared constants and helpers of the dashboard views. */

export const STATUS_COLORS: Record<ReceivableStatus, string> = {
  pending: 'var(--chart-neutral)',
  partial: 'var(--warning)',
  overdue: 'var(--danger)',
  paid: 'var(--success)',
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: 'var(--success)',
  medium: 'var(--warning)',
  high: 'var(--danger)',
};

/** Categorical chart slots in a fixed order (identity never depends on rank). */
export const METHOD_COLORS: Record<PaymentMethod, 'series1' | 'series2' | 'series3' | 'series4'> = {
  yape: 'series1',
  plin: 'series2',
  bank_transfer: 'series3',
  cash: 'series4',
};

/** Money for a metric tile: abbreviated from one million up (S/ 6.1 M) so it never gets cut. */
export function tileMoney(
  fmt: { money: (v: number) => string; compactMoney: (v: number) => string },
  value: number,
) {
  return Math.abs(value) >= 1_000_000 ? fmt.compactMoney(value) : fmt.money(value);
}

/** Formats a rate difference as percentage points ("8 pts"). */
export function formatPoints(value: number) {
  return `${Math.round(value * 100)} pts`;
}

/** Relative change against the previous period (null when there is nothing to compare). */
export function change(metric: PeriodMetric | undefined): number | null {
  if (!metric || metric.value === null || metric.previous === null || metric.previous === 0) {
    return null;
  }
  return (metric.value - metric.previous) / Math.abs(metric.previous);
}

/** Difference in percentage points between two rates (62% → 70% = +0.08). */
export function pointsChange(metric: PeriodMetric | undefined): number | null {
  if (!metric || metric.value === null || metric.previous === null) return null;
  return metric.value - metric.previous;
}
