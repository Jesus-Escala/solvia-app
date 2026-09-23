import { TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from './cx';
import { Skeleton } from './Feedback';

export type KpiTone = 'default' | 'danger' | 'success' | 'warning';

export interface KpiCardProps {
  label: string;
  value: string;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: KpiTone;
  /** Relative change, e.g. 0.12 = +12%. */
  delta?: number | null;
  deltaLabel?: string;
  /** When false, a decrease is shown as good (e.g. overdue amount). */
  higherIsBetter?: boolean;
  /** 0..1 ring gauge shown next to the value. */
  gauge?: number;
  loading?: boolean;
  formatPercent?: (value: number) => string;
}

const ICON_TONES: Record<KpiTone, string> = {
  default: 'bg-primary-soft text-primary-ink',
  danger: 'bg-danger-soft text-danger-ink',
  success: 'bg-success-soft text-success-ink',
  warning: 'bg-warning-soft text-warning-ink',
};

function Gauge({ value, tone }: { value: number; tone: KpiTone }) {
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const stroke =
    tone === 'danger' ? 'var(--danger)' : tone === 'success' ? 'var(--success)' : 'var(--primary)';
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="16" cy="16" r={radius} fill="none" strokeWidth="4" stroke="var(--surface-3)" />
      <circle
        cx="16"
        cy="16"
        r={radius}
        fill="none"
        strokeWidth="4"
        stroke={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - Math.min(1, Math.max(0, value)))}
        className="transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  );
}

/** Metric tile: label, headline value, optional trend delta, ring gauge and supporting line. */
export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  delta,
  deltaLabel,
  higherIsBetter = true,
  gauge,
  loading = false,
  formatPercent = (v) => `${Math.round(v * 100)}%`,
}: KpiCardProps) {
  if (loading) {
    return (
      <article className="flex h-full flex-col gap-2 rounded-xl border border-line bg-surface p-4 shadow-card">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-3 w-20" />
      </article>
    );
  }

  const hasDelta = delta !== undefined && delta !== null && Number.isFinite(delta);
  const positive = hasDelta && delta >= 0;
  const good = hasDelta && (positive ? higherIsBetter : !higherIsBetter);

  return (
    <article className="flex h-full min-w-0 flex-col gap-1 rounded-xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted">{label}</p>
        {icon && (
          <span
            className={cx(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg [&>svg]:h-4 [&>svg]:w-4',
              ICON_TONES[tone],
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-2">
        {gauge !== undefined && <Gauge value={gauge} tone={tone} />}
        <p
          className={cx(
            'min-w-0 truncate text-xl font-semibold tracking-tight tabular-nums',
            tone === 'danger' ? 'text-danger-ink' : 'text-ink',
          )}
          title={value}
        >
          {value}
        </p>
        {hasDelta && (
          <span
            className={cx(
              'ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
              good ? 'bg-success-soft text-success-ink' : 'bg-danger-soft text-danger-ink',
            )}
          >
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {positive ? '+' : ''}
            {formatPercent(delta)}
          </span>
        )}
      </div>
      {(hint || deltaLabel) && (
        <p className="truncate text-[11px] text-subtle">
          {hint}
          {hint && deltaLabel && ' · '}
          {deltaLabel}
        </p>
      )}
    </article>
  );
}

/** Responsive KPI row: 2 per row on phones, 3 on tablets, all in one row on wide screens. */
export function KpiRow({
  children,
  ...rest
}: { children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className="stagger-in grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-flow-col 2xl:grid-cols-none 2xl:auto-cols-fr"
      {...rest}
    >
      {children}
    </div>
  );
}
