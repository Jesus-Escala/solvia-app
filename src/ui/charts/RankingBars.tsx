import { Link } from 'react-router';
import { cx } from '../components/cx';

export interface RankingItem {
  id: string;
  label: string;
  href?: string;
  /** Total value; the bar length is relative to the largest item. */
  value: number;
  /** Portion of `value` highlighted as a second segment (e.g. the overdue part). */
  highlighted?: number;
}

/**
 * Ranked horizontal bars in plain HTML (label, track, value). The leader gets a filled rank badge.
 * Two segments per bar with a labelled legend, so identity never depends on color alone.
 */
export function RankingBars({
  items,
  formatValue,
  baseLabel,
  highlightLabel,
}: {
  items: RankingItem[];
  formatValue: (value: number) => string;
  baseLabel: string;
  highlightLabel: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  const hasHighlight = items.some((item) => (item.highlighted ?? 0) > 0);

  return (
    <div>
      <ol className="space-y-2.5">
        {items.map((item, index) => {
          const highlighted = Math.min(item.highlighted ?? 0, item.value);
          const label = item.href ? (
            <Link to={item.href} className="truncate hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="truncate">{item.label}</span>
          );
          return (
            <li
              key={item.id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1"
              title={`${item.label}: ${formatValue(item.value)}${highlighted ? ` · ${highlightLabel}: ${formatValue(highlighted)}` : ''}`}
            >
              <span
                className={cx(
                  'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums',
                  index === 0 ? 'bg-primary text-on-primary' : 'border border-line text-muted',
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0 text-sm font-medium">{label}</span>
              <span className="text-right text-sm font-semibold tabular-nums">
                {formatValue(item.value)}
              </span>
              <span />
              <div className="col-span-2 flex h-2 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="flex h-full gap-[2px]"
                  style={{ width: `${(item.value / max) * 100}%` }}
                >
                  {highlighted > 0 && (
                    <div
                      className="h-full rounded-l-full bg-danger"
                      style={{ width: `${(highlighted / item.value) * 100}%` }}
                    />
                  )}
                  {item.value - highlighted > 0 && (
                    <div className="h-full flex-1 rounded-r-full bg-chart-1" />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {hasHighlight && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-danger" aria-hidden="true" />
            {highlightLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-chart-1" aria-hidden="true" />
            {baseLabel}
          </span>
        </div>
      )}
    </div>
  );
}
