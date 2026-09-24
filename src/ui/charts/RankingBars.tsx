import { ArrowUpRight } from 'lucide-react';
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
 *
 * With `onSelect`, the label selects the item (e.g. to filter a dashboard) and `href` moves to a
 * small arrow link labelled `openLabel`; the `selectedId` row is outlined, the others fade.
 */
export function RankingBars({
  items,
  formatValue,
  baseLabel,
  highlightLabel,
  selectedId = null,
  onSelect,
  openLabel,
}: {
  items: RankingItem[];
  formatValue: (value: number) => string;
  baseLabel: string;
  highlightLabel: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Accessible label of the arrow link when `onSelect` is used (e.g. "View customer"). */
  openLabel?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  const hasHighlight = items.some((item) => (item.highlighted ?? 0) > 0);

  return (
    <div>
      <ol className="space-y-2.5">
        {items.map((item, index) => {
          const highlighted = Math.min(item.highlighted ?? 0, item.value);
          const selected = item.id === selectedId;
          const label = onSelect ? (
            <span className="flex min-w-0 items-center gap-1">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(item.id)}
                className="min-w-0 truncate text-left hover:text-primary-ink hover:underline"
              >
                {item.label}
              </button>
              {item.href && (
                <Link
                  to={item.href}
                  aria-label={openLabel ? `${openLabel}: ${item.label}` : item.label}
                  title={openLabel}
                  className="shrink-0 rounded p-0.5 text-subtle hover:bg-surface-3 hover:text-ink"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </span>
          ) : item.href ? (
            <Link to={item.href} className="block truncate hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="block truncate">{item.label}</span>
          );
          return (
            <li
              key={item.id}
              className={cx(
                'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-lg transition',
                onSelect && '-mx-2 px-2 py-1',
                selected && 'bg-primary-soft ring-1 ring-primary/40',
                selectedId !== null && !selected && 'opacity-55',
              )}
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
