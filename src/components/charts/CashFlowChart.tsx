import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useI18n } from '../../i18n/I18nProvider';
import type { CashFlowBucket } from '../../lib/types';
import { ChartTooltipCard, AXIS_TICK, CHART_HEIGHT, useChartColors } from '@/ui';

/** Expected inflows per period: single-series thin bars, or an accessible table view. */
export function CashFlowChart({
  buckets,
  groupBy,
  view,
}: {
  buckets: CashFlowBucket[];
  groupBy: 'week' | 'month';
  view: 'chart' | 'table';
}) {
  const colors = useChartColors();
  const { t, fmt } = useI18n();
  const label = (bucket: CashFlowBucket) =>
    groupBy === 'week'
      ? t('dashboard.cashFlow.weekOf', { date: fmt.shortDate(bucket.start) })
      : fmt.period(bucket.key);
  const tick = (bucket: CashFlowBucket) =>
    groupBy === 'week' ? fmt.shortDate(bucket.start) : fmt.shortPeriod(bucket.key);

  if (view === 'table') {
    return (
      <div className="max-h-[260px] overflow-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface-2 text-[11px] tracking-wide text-muted uppercase">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">
                {t('dashboard.cashFlow.period')}
              </th>
              <th className="px-3 py-2 text-left font-semibold">{t('dashboard.cashFlow.dates')}</th>
              <th className="px-3 py-2 text-right font-semibold">
                {t('dashboard.cashFlow.receivables')}
              </th>
              <th className="px-3 py-2 text-right font-semibold">
                {t('dashboard.cashFlow.expectedAmount')}
              </th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => (
              <tr key={bucket.key} className="border-t border-line">
                <td className="px-3 py-2 font-medium">{label(bucket)}</td>
                <td className="px-3 py-2 text-muted">
                  {fmt.shortDate(bucket.start)} – {fmt.shortDate(bucket.end)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{bucket.count}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">
                  {fmt.money(bucket.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const data = buckets.map((bucket) => ({ ...bucket, tick: tick(bucket) }));

  return (
    <div className="h-[260px] w-full min-w-0" role="img" aria-label={t('dashboard.cashFlow.title')}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          barCategoryGap="30%"
        >
          <CartesianGrid vertical={false} stroke={colors.grid} />
          <XAxis
            dataKey="tick"
            tickLine={false}
            axisLine={{ stroke: colors.grid }}
            tick={{ ...AXIS_TICK, fill: colors.axis }}
            interval="preserveStartEnd"
            minTickGap={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={68}
            tick={{ ...AXIS_TICK, fill: colors.axis }}
            tickFormatter={(value: number) => fmt.compactMoney(value)}
          />
          <Tooltip
            cursor={{ fill: colors.grid, fillOpacity: 0.5 }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const bucket = payload?.[0]?.payload as CashFlowBucket | undefined;
              if (!active || !bucket) return null;
              return (
                <ChartTooltipCard
                  title={label(bucket)}
                  rows={[
                    {
                      label: t('dashboard.cashFlow.expectedAmount'),
                      value: fmt.money(bucket.amount),
                      color: colors.series1,
                    },
                    { label: t('dashboard.cashFlow.receivables'), value: bucket.count },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="amount"
            fill={colors.series1}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
