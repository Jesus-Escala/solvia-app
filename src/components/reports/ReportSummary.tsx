import { Skeleton, cx } from '@/ui';

export type SummaryTone = 'default' | 'success' | 'warning' | 'danger';

export interface SummaryFigure {
  label: string;
  value: string;
  tone?: SummaryTone;
}

const VALUE_TONES: Record<SummaryTone, string> = {
  default: 'text-ink',
  success: 'text-success-ink',
  warning: 'text-warning-ink',
  danger: 'text-danger-ink',
};

const STRIP_TONES: Record<SummaryTone, string> = {
  default: 'border-primary/25 bg-primary-soft/45',
  success: 'border-success/25 bg-success-soft/50',
  warning: 'border-warning/30 bg-warning-soft/50',
  danger: 'border-danger/25 bg-danger-soft/45',
};

/**
 * The figures of a report at a glance: the first one big and in color (what was sold, collected,
 * bought…), the others beside it (below it on phones, two per row).
 */
export function ReportSummary({
  figures,
  loading = false,
}: {
  figures: SummaryFigure[];
  loading?: boolean;
}) {
  const [main, ...rest] = figures;
  if (loading || !main) {
    return <Skeleton className="h-24 w-full shrink-0 rounded-2xl" />;
  }
  const tone = main.tone ?? 'default';
  return (
    <section
      className={cx(
        'flex shrink-0 flex-col gap-3 rounded-2xl border px-4 py-3 md:flex-row md:items-center md:gap-6 md:px-5 md:py-4',
        STRIP_TONES[tone],
      )}
    >
      <div className="min-w-0 md:pr-6 md:[&:not(:last-child)]:border-r md:[&:not(:last-child)]:border-line">
        <p className="text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">
          {main.label}
        </p>
        <p
          className={cx(
            'font-display text-3xl leading-tight font-semibold tabular-nums md:text-4xl',
            VALUE_TONES[tone],
          )}
        >
          {main.value}
        </p>
      </div>
      {rest.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 md:flex md:flex-wrap md:gap-x-8">
          {rest.map((figure) => (
            <div key={figure.label} className="min-w-0">
              <dt className="truncate text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
                {figure.label}
              </dt>
              <dd
                className={cx(
                  'truncate text-lg font-semibold tabular-nums',
                  VALUE_TONES[figure.tone ?? 'default'],
                )}
              >
                {figure.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
