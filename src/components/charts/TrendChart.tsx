import { useId } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useI18n } from '../../i18n/I18nProvider';
import { ChartTooltipCard, AXIS_TICK, CHART_HEIGHT, useChartColors } from '@/ui';

export interface TrendPoint {
  period: string;
  amount: number;
  count: number;
}

/** Single-series area chart of monthly collections (smooth line, soft gradient fill). */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  const colors = useChartColors();
  const { t, fmt } = useI18n();
  const gradientId = useId();
  const data = points.map((point) => ({ ...point, label: fmt.shortPeriod(point.period) }));

  return (
    <div className="h-[260px] w-full min-w-0" role="img" aria-label={t('dashboard.trend.title')}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.series1} stopOpacity={0.35} />
              <stop offset="95%" stopColor={colors.series1} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={colors.grid} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: colors.grid }}
            tick={{ ...AXIS_TICK, fill: colors.axis }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={68}
            tick={{ ...AXIS_TICK, fill: colors.axis }}
            tickFormatter={(value: number) => fmt.compactMoney(value)}
          />
          <Tooltip
            cursor={{ stroke: colors.axis, strokeDasharray: '3 3' }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as (TrendPoint & { label: string }) | undefined;
              if (!active || !point) return null;
              return (
                <ChartTooltipCard
                  title={fmt.period(point.period)}
                  rows={[
                    {
                      label: t('dashboard.kpi.collectedMonth'),
                      value: fmt.money(point.amount),
                      color: colors.series1,
                    },
                    { label: t('dashboard.trend.payments', { count: point.count }), value: '' },
                  ]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke={colors.series1}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={{ r: 3, strokeWidth: 2, fill: colors.surface }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: colors.surface }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
