import { cx } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { DashboardAnalytics } from '../../lib/types';

type Day = DashboardAnalytics['byWeekday'][number];

/**
 * Collections per weekday (Mon → Sun) as vertical bars; the strongest day is highlighted.
 * With `onSelect` each day is a button (to filter the dashboard): the `selected` day stays
 * solid and the others fade.
 */
export function WeekdayBars({
  days,
  selected = null,
  onSelect,
}: {
  days: Day[];
  selected?: number | null;
  onSelect?: (weekday: number) => void;
}) {
  const { fmt, locale } = useI18n();
  const max = Math.max(...days.map((day) => day.amount), 1);
  const best = days.reduce((top, day) => (day.amount > top.amount ? day : top), days[0]!);
  // 2024-01-01 was a Monday: weekday N (ISO) = January N.
  const name = (weekday: number, style: 'short' | 'long') =>
    new Intl.DateTimeFormat(locale === 'es' ? 'es-PE' : 'en-US', { weekday: style }).format(
      new Date(2024, 0, weekday),
    );

  return (
    <ol className="flex h-full min-h-[210px] items-end gap-1.5 sm:gap-2.5" aria-label="weekday">
      {days.map((day) => {
        const isSelected = selected === day.weekday;
        // With a selection, the selected day is the emphasized one; otherwise the best day.
        const top = selected === null ? day.amount > 0 && day.weekday === best.weekday : isSelected;
        const faded = selected !== null && !isSelected;
        const title = `${name(day.weekday, 'long')}: ${fmt.money(day.amount)} · ${day.count}`;
        const content = (
          <>
            <span
              className={cx(
                'text-[10px] font-semibold whitespace-nowrap tabular-nums',
                top ? 'text-primary-ink' : 'text-subtle',
              )}
            >
              {fmt.compactMoney(day.amount)}
            </span>
            <div className="flex w-full flex-1 items-end">
              <div
                className={cx(
                  'w-full rounded-t-md transition-[height,background-color] duration-500',
                  top
                    ? 'bg-primary'
                    : faded
                      ? 'bg-primary/15 group-hover:bg-primary/35'
                      : 'bg-primary/35 group-hover:bg-primary/55',
                )}
                style={{ height: `${Math.max(3, (day.amount / max) * 100)}%` }}
              />
            </div>
            <span
              className={cx('text-xs capitalize', top ? 'font-semibold text-ink' : 'text-muted')}
            >
              {name(day.weekday, 'short').replace('.', '')}
            </span>
          </>
        );
        return (
          <li key={day.weekday} className="flex h-full min-w-0 flex-1" title={title}>
            {onSelect ? (
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={title}
                onClick={() => onSelect(day.weekday)}
                className={cx(
                  'group flex h-full w-full flex-col items-center justify-end gap-1.5 rounded-md pb-0.5 transition',
                  isSelected ? 'bg-primary-soft ring-1 ring-primary/40' : 'hover:bg-surface-2',
                )}
              >
                {content}
              </button>
            ) : (
              <div className="group flex h-full w-full flex-col items-center justify-end gap-1.5">
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
