import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useI18n } from '../../i18n/I18nProvider';
import type { CashFlowBucket } from '../../lib/types';
import { ChartTooltipCard, AXIS_TICK, CHART_HEIGHT, DataTable, useChartColors } from '@/ui';

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
      <DataTable
        caption={t('dashboard.cashFlow.title')}
        fill={false}
        maxHeight={260}
        rows={buckets}
        rowKey={(bucket) => bucket.key}
        columns={[
          {
            id: 'period',
            header: t('dashboard.cashFlow.period'),
            mobile: 'title',
            sortValue: (bucket) => bucket.start,
            cell: (bucket) => <span className="font-medium">{label(bucket)}</span>,
          },
          {
            id: 'dates',
            header: t('dashboard.cashFlow.dates'),
            mobile: 'subtitle',
            sortValue: (bucket) => bucket.start,
            cell: (bucket) => (
              <span className="text-muted">
                {fmt.shortDate(bucket.start)} – {fmt.shortDate(bucket.end)}
              </span>
            ),
          },
          {
            id: 'count',
            header: t('dashboard.cashFlow.receivables'),
            align: 'right',
            sortValue: (bucket) => bucket.count,
            cell: (bucket) => <span className="tabular-nums">{bucket.count}</span>,
          },
          {
            id: 'amount',
            header: t('dashboard.cashFlow.expectedAmount'),
            align: 'right',
            mobile: 'aside',
            sortValue: (bucket) => bucket.amount,
            cell: (bucket) => (
              <span className="font-semibold tabular-nums">{fmt.money(bucket.amount)}</span>
            ),
          },
        ]}
      />
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
