import { useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, MousePointerClick } from 'lucide-react';
import {
  AXIS_TICK,
  ChartTooltipCard,
  cx,
  DataTable,
  downloadCsv,
  IconButton,
  useChartColors,
} from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { AnalyticsGranularity, DashboardAnalytics } from '../../lib/types';

type Point = DashboardAnalytics['series'][number];
type SeriesKey = 'collected' | 'issued' | 'due';

/** Label helpers shared by the chart and its table view. */
function useBucketLabels(granularity: AnalyticsGranularity) {
  const { t, fmt } = useI18n();
  return {
    tick: (bucket: string) =>
      granularity === 'month' ? fmt.shortPeriod(bucket.slice(0, 7)) : fmt.shortDate(bucket),
    title: (bucket: string) =>
      granularity === 'month'
        ? fmt.period(bucket.slice(0, 7))
        : granularity === 'week'
          ? t('dashboard.analytics.weekOf', { date: fmt.shortDate(bucket) })
          : fmt.date(bucket),
  };
}

/**
 * Collected vs issued (bars) and amount falling due (line) per day/week/month of the period.
 * One money axis; each series can be toggled from its legend chip; a table view is available.
 */
export function PeriodChart({
  series,
  granularity,
  view,
  onBucketClick,
  exportName,
}: {
  series: Point[];
  granularity: AnalyticsGranularity;
  view: 'chart' | 'table';
  /** Drill-down: called with the clicked bucket (month/week start); omit to disable. */
  onBucketClick?: (bucket: string) => void;
  /** File name for the CSV export button; omit to hide it. */
  exportName?: string;
}) {
  const colors = useChartColors();
  const { t, fmt } = useI18n();
  const labels = useBucketLabels(granularity);
  // "What was due" starts hidden: two bars read at a glance; its chip turns the line on.
  const [hidden, setHidden] = useState<Set<SeriesKey>>(() => new Set(['due']));

  const SERIES: Array<{ key: SeriesKey; label: string; color: string }> = [
    { key: 'collected', label: t('dashboard.analytics.series.collected'), color: colors.series3 },
    { key: 'issued', label: t('dashboard.analytics.series.issued'), color: colors.series1 },
    { key: 'due', label: t('dashboard.analytics.series.due'), color: colors.series2 },
  ];

  const exportCsv = () =>
    downloadCsv(
      exportName ?? 'solvia',
      [
        t('dashboard.analytics.bucket'),
        ...SERIES.map((item) => item.label),
        t('dashboard.analytics.series.payments'),
      ],
      series.map((point) => [
        labels.title(point.bucket),
        point.collected,
        point.issued,
        point.due,
        point.payments,
      ]),
    );
  const exportButton = exportName && (
    <IconButton label={t('dashboard.analytics.export')} onClick={exportCsv} className="ml-auto">
      <Download className="h-4 w-4" />
    </IconButton>
  );

  if (view === 'table') {
    return (
      <div className="space-y-2">
        {exportButton && <div className="flex">{exportButton}</div>}
        <DataTable
          caption={t('dashboard.analytics.table')}
          fill={false}
          maxHeight={300}
          rows={[...series].reverse()}
          rowKey={(point) => point.bucket}
          columns={[
            {
              id: 'bucket',
              header: t('dashboard.analytics.bucket'),
              mobile: 'title',
              sortValue: (point) => point.bucket,
              cell: (point) => (
                <span className="whitespace-nowrap capitalize">{labels.title(point.bucket)}</span>
              ),
            },
            ...SERIES.map((item) => ({
              id: item.key,
              header: item.label,
              align: 'right' as const,
              sortValue: (point: (typeof series)[number]) => point[item.key],
              cell: (point: (typeof series)[number]) => (
                <span className="tabular-nums">{fmt.money(point[item.key])}</span>
              ),
            })),
            {
              id: 'payments',
              header: t('dashboard.analytics.series.payments'),
              align: 'right',
              sortValue: (point) => point.payments,
              cell: (point) => <span className="tabular-nums">{fmt.number(point.payments)}</span>,
            },
          ]}
        />
      </div>
    );
  }

  const toggle = (key: SeriesKey) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else if (next.size < SERIES.length - 1) next.add(key);
      return next;
    });

  return (
    <div className="min-w-0">
      <div
        className="mb-2 flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label={t('dashboard.analytics.legend')}
      >
        {SERIES.map((item) => {
          const off = hidden.has(item.key);
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={!off}
              onClick={() => toggle(item.key)}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
                off ? 'border-line text-subtle line-through' : 'border-line-strong text-ink',
              )}
            >
              <span
                className={cx(
                  'h-2 w-2',
                  item.key === 'due' ? 'h-0.5 w-3 rounded-full' : 'rounded-sm',
                )}
                style={{ background: item.color, opacity: off ? 0.35 : 1 }}
                aria-hidden="true"
              />
              {item.label}
            </button>
          );
        })}
        {exportButton}
      </div>
      {onBucketClick && (
        <p className="mb-1 flex items-center gap-1.5 text-[11px] text-subtle">
          <MousePointerClick className="h-3.5 w-3.5" />
          {t('dashboard.analytics.drillHint')}
        </p>
      )}
      <div
        className={cx('h-[280px] w-full', onBucketClick && '[&_.recharts-surface]:cursor-pointer')}
        role="img"
        aria-label={t('dashboard.analytics.chartTitle')}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={series}
            margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
            barGap={2}
            onClick={(state) => {
              if (!onBucketClick) return;
              // activeLabel can be empty depending on where the click lands; the index is not.
              const index = Number(state?.activeIndex ?? state?.activeTooltipIndex);
              const bucket =
                typeof state?.activeLabel === 'string'
                  ? state.activeLabel
                  : Number.isInteger(index)
                    ? series[index]?.bucket
                    : undefined;
              if (bucket) onBucketClick(bucket);
            }}
          >
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis
              dataKey="bucket"
              tickFormatter={labels.tick}
              tickLine={false}
              axisLine={{ stroke: colors.grid }}
              tick={{ ...AXIS_TICK, fill: colors.axis }}
              interval="preserveStartEnd"
              minTickGap={18}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={58}
              tick={{ ...AXIS_TICK, fill: colors.axis }}
              tickFormatter={(value: number) => fmt.compactMoney(value)}
            />
            <Tooltip
              cursor={{ fill: colors.grid, opacity: 0.45 }}
              isAnimationActive={false}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as Point | undefined;
                if (!active || !point) return null;
                return (
                  <ChartTooltipCard
                    title={<span className="capitalize">{labels.title(point.bucket)}</span>}
                    rows={[
                      ...SERIES.filter((item) => !hidden.has(item.key)).map((item) => ({
                        label: item.label,
                        value: fmt.money(point[item.key]),
                        color: item.color,
                      })),
                      {
                        label: t('dashboard.analytics.series.payments'),
                        value: fmt.number(point.payments),
                      },
                    ]}
                  />
                );
              }}
            />
            {!hidden.has('collected') && (
              <Bar
                dataKey="collected"
                fill={colors.series3}
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
                isAnimationActive={false}
              />
            )}
            {!hidden.has('issued') && (
              <Bar
                dataKey="issued"
                fill={colors.series1}
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
                isAnimationActive={false}
              />
            )}
            {!hidden.has('due') && (
              <Line
                type="monotone"
                dataKey="due"
                stroke={colors.series2}
                strokeWidth={2}
                dot={series.length <= 16 ? { r: 3, strokeWidth: 2, fill: colors.surface } : false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: colors.surface }}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
