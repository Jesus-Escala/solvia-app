import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AXIS_TICK, Card, ChartTooltipCard, Skeleton, useChartColors } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';

/**
 * Amounts per day as stacked bars (e.g. cash and on credit), with the date and each part in the
 * tooltip.
 */
export function DayBars<T extends { date: string }>({
  days,
  series,
  height = 240,
}: {
  days: T[];
  series: Array<{
    key: keyof T & string;
    label: string;
    color: 'series1' | 'series2' | 'series3' | 'series4' | 'warning' | 'success';
  }>;
  height?: number;
}) {
  const { fmt } = useI18n();
  const colors = useChartColors();
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={colors.grid} />
          <XAxis
            dataKey="date"
            tick={{ ...AXIS_TICK, fill: colors.axis }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(date: string) => fmt.shortDate(date)}
            minTickGap={16}
          />
          <YAxis
            width={64}
            tick={{ ...AXIS_TICK, fill: colors.axis }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => fmt.compactMoney(value)}
          />
          <Tooltip
            cursor={{ fill: colors.grid, opacity: 0.5 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTooltipCard
                  title={fmt.date(String(label))}
                  rows={series.map((item) => ({
                    label: item.label,
                    value: fmt.money(Number((payload[0]!.payload as T)[item.key] ?? 0)),
                    color: colors[item.color],
                  }))}
                />
              ) : null
            }
          />
          {series.map((item, index) => (
            <Bar
              key={item.key}
              dataKey={(row: T) => Number(row[item.key] ?? 0)}
              stackId="day"
              fill={colors[item.color]}
              radius={index === series.length - 1 ? [4, 4, 0, 0] : 0}
              maxBarSize={36}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface RankedItem {
  key: string;
  label: ReactNode;
  /** Small text under the label (e.g. "12 und. · 8 ventas"). */
  detail?: string;
  value: number;
  /** Shown on the right (defaults to the value as money). */
  display?: string;
  mark?: ReactNode;
}

/** A top list: position, name, detail and a bar proportional to the first one. */
export function RankedList({
  items,
  empty,
  color = 'var(--primary)',
}: {
  items: RankedItem[];
  empty: string;
  color?: string;
}) {
  const { fmt } = useI18n();
  const max = Math.max(...items.map((item) => item.value), 1);
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">{empty}</p>;
  }
  return (
    <ol className="space-y-2.5">
      {items.map((item, index) => (
        <li key={item.key} className="flex items-center gap-3">
          <span className="w-5 shrink-0 text-right text-xs font-semibold text-subtle tabular-nums">
            {index + 1}
          </span>
          {item.mark}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium">{item.label}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {item.display ?? fmt.money(item.value)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${(item.value / max) * 100}%`, background: color }}
                />
              </span>
              {item.detail && (
                <span className="shrink-0 text-[11px] text-muted tabular-nums">{item.detail}</span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A card of the insight views: title, one-line hint and its content (or a skeleton). */
export function InsightCard({
  title,
  hint,
  loading,
  children,
  className,
}: {
  title: string;
  hint: string;
  loading: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card title={title} subtitle={hint} {...(className && { className })}>
      {loading ? <Skeleton className="h-56 w-full" /> : children}
    </Card>
  );
}

/** Sales per hour of the day as small vertical bars (the busiest hour highlighted). */
export function HourBars({
  hours,
}: {
  hours: Array<{ hour: number; sales: number; total: number }>;
}) {
  const { t, fmt } = useI18n();
  if (hours.length === 0) return null;
  const first = Math.min(...hours.map((row) => row.hour));
  const last = Math.max(...hours.map((row) => row.hour));
  const byHour = new Map(hours.map((row) => [row.hour, row]));
  const slots = Array.from({ length: last - first + 1 }, (_, index) => {
    const hour = first + index;
    return byHour.get(hour) ?? { hour, sales: 0, total: 0 };
  });
  const max = Math.max(...slots.map((slot) => slot.total), 1);
  const best = slots.reduce((top, slot) => (slot.total > top.total ? slot : top), slots[0]!);
  return (
    <ol className="flex h-48 items-end gap-1" aria-label={t('dashboard.sales.hours')}>
      {slots.map((slot) => (
        <li
          key={slot.hour}
          className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
          title={`${String(slot.hour).padStart(2, '0')}:00 · ${fmt.money(slot.total)} · ${slot.sales}`}
        >
          <span
            className="w-full rounded-t-md"
            style={{
              height: `${Math.max((slot.total / max) * 100, slot.total > 0 ? 4 : 0)}%`,
              background: slot.hour === best.hour ? 'var(--primary)' : 'var(--chart-neutral)',
              opacity: slot.hour === best.hour ? 1 : 0.45,
            }}
          />
          <span className="text-[10px] text-muted tabular-nums">{slot.hour}</span>
        </li>
      ))}
    </ol>
  );
}
