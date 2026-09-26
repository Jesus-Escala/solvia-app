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

const ACCENTS: Record<SummaryTone, string> = {
  default: 'before:bg-primary',
  success: 'before:bg-success',
  warning: 'before:bg-warning',
  danger: 'before:bg-danger',
};

/**
 * The figures of a report as cards that catch the eye: the first one filled with the brand color
 * (what was sold, collected, bought…), the others with a colored edge. Phones: one row that slides
 * sideways, so the list below keeps its room.
 */
export function ReportSummary({
  figures,
  loading = false,
}: {
  figures: SummaryFigure[];
  loading?: boolean;
}) {
  const row =
    'flex shrink-0 gap-2 max-md:-mx-4 max-md:overflow-x-auto max-md:px-4 max-md:pb-1 max-md:[scrollbar-width:none]! md:grid md:auto-cols-fr md:grid-flow-col md:gap-3';
  if (loading || figures.length === 0) {
    return (
      <div className={row}>
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[4.5rem] w-44 shrink-0 rounded-xl md:w-auto" />
        ))}
      </div>
    );
  }
  return (
    <div className={row}>
      {figures.map((figure, index) =>
        index === 0 ? (
          <article
            key={figure.label}
            className="w-44 shrink-0 rounded-xl bg-primary px-3.5 py-3 text-on-primary shadow-card md:w-auto md:px-4"
          >
            <p className="truncate text-[11px] font-semibold tracking-[0.1em] uppercase opacity-80">
              {figure.label}
            </p>
            <p className="mt-0.5 truncate font-display text-2xl leading-tight font-semibold tabular-nums md:text-3xl">
              {figure.value}
            </p>
          </article>
        ) : (
          <article
            key={figure.label}
            className={cx(
              'relative w-40 shrink-0 overflow-hidden rounded-xl border border-line bg-surface py-3 pr-3 pl-4 shadow-card before:absolute before:inset-y-0 before:left-0 before:w-1 md:w-auto',
              ACCENTS[figure.tone ?? 'default'],
            )}
          >
            <p className="truncate text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">
              {figure.label}
            </p>
            <p
              className={cx(
                'mt-0.5 truncate font-display text-xl leading-tight font-semibold tabular-nums md:text-2xl',
                VALUE_TONES[figure.tone ?? 'default'],
              )}
            >
              {figure.value}
            </p>
          </article>
        ),
      )}
    </div>
  );
}
