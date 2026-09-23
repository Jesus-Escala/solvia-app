import { cx } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { DashboardAnalytics } from '../../lib/types';

type Day = DashboardAnalytics['byWeekday'][number];

/** Collections per weekday (Mon → Sun) as vertical bars; the strongest day is highlighted. */
export function WeekdayBars({ days }: { days: Day[] }) {
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
        const top = day.amount > 0 && day.weekday === best.weekday;
        return (
          <li
            key={day.weekday}
            className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
            title={`${name(day.weekday, 'long')}: ${fmt.money(day.amount)} · ${day.count}`}
          >
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
                  'w-full rounded-t-md transition-[height] duration-500',
                  top ? 'bg-primary' : 'bg-primary/35 group-hover:bg-primary/55',
                )}
                style={{ height: `${Math.max(3, (day.amount / max) * 100)}%` }}
              />
            </div>
            <span
              className={cx('text-xs capitalize', top ? 'font-semibold text-ink' : 'text-muted')}
            >
              {name(day.weekday, 'short').replace('.', '')}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
