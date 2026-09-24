import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AXIS_TICK, ChartTooltipCard, CHART_HEIGHT, useChartColors } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { DebtConcentration } from '../../lib/types';

const TICKS = [0, 0.2, 0.4, 0.6, 0.8, 1];

/**
 * Concentration (Lorenz) curve: share of the debtors, largest first (x), against the share of
 * the balance they owe (y). Both axes are the same unit (%), so it is one axis. The diagonal is
 * the "everyone owes the same" reference; dashed verticals split classes A, B and C.
 */
export function ConcentrationChart({ data }: { data: DebtConcentration }) {
  const colors = useChartColors();
  const { t, fmt } = useI18n();
  const points = data.curve.map((point) => ({ ...point, equal: point.debtorShare }));

  const offsets = data.classes.map((_, index) =>
    data.classes.slice(0, index).reduce((sum, item) => sum + item.debtorShare, 0),
  );
  const bands = data.classes
    .map((item, index) => ({
      key: item.key,
      x1: offsets[index]!,
      x2: Math.min(1, offsets[index]! + item.debtorShare),
    }))
    .filter((band) => band.x2 > band.x1);

  return (
    <div
      className="h-[260px] w-full min-w-0"
      role="img"
      aria-label={t('dashboard.concentration.title')}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ComposedChart data={points} margin={{ top: 18, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={colors.grid} />
          {bands.map((band) => (
            <ReferenceArea
              key={band.key}
              x1={band.x1}
              x2={band.x2}
              fill="none"
              stroke="none"
              ifOverflow="hidden"
              label={{
                value: band.key,
                position: 'insideTop',
                offset: -14,
                fill: colors.muted,
                fontSize: 11,
                fontWeight: 700,
              }}
            />
          ))}
          {bands
            .filter((band) => band.x2 < 1)
            .map((band) => (
              <ReferenceLine
                key={band.key}
                x={band.x2}
                stroke={colors.axis}
                strokeDasharray="3 3"
                strokeOpacity={0.6}
              />
            ))}
          <XAxis
            type="number"
            dataKey="debtorShare"
            domain={[0, 1]}
            ticks={TICKS}
            tickLine={false}
            axisLine={{ stroke: colors.grid }}
            tick={{ ...AXIS_TICK, fill: colors.axis }}
            tickFormatter={(value: number) => fmt.percent(value)}
          />
          <YAxis
            type="number"
            domain={[0, 1]}
            ticks={TICKS}
            tickLine={false}
            axisLine={false}
            width={44}
            tick={{ ...AXIS_TICK, fill: colors.axis }}
            tickFormatter={(value: number) => fmt.percent(value)}
          />
          <Tooltip
            isAnimationActive={false}
            cursor={{ stroke: colors.axis, strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as (typeof points)[number] | undefined;
              if (!active || !point) return null;
              const count = Math.round(point.debtorShare * data.totals.debtors);
              return (
                <ChartTooltipCard
                  title={t('dashboard.concentration.tooltipTitle', {
                    share: fmt.percent(point.debtorShare),
                  })}
                  rows={[
                    {
                      label: t('dashboard.concentration.tooltipDebtors'),
                      value: fmt.number(count),
                    },
                    {
                      label: t('dashboard.concentration.tooltipDebt'),
                      value: `${fmt.percent(point.debtShare)} · ${fmt.money(
                        point.debtShare * data.totals.outstanding,
                      )}`,
                      color: colors.series1,
                    },
                  ]}
                />
              );
            }}
          />
          <Line
            type="linear"
            dataKey="equal"
            stroke={colors.neutral}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Area
            type="linear"
            dataKey="debtShare"
            stroke={colors.series1}
            strokeWidth={2}
            fill={colors.series1}
            fillOpacity={0.12}
            activeDot={{ r: 5, stroke: colors.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
