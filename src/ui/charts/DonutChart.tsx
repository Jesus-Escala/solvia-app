import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { cx } from '../components/cx';
import { ChartTooltipCard } from './ChartTooltip';
import { useChartColors } from './chartTheme';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * Donut with the total in the center and a labelled legend (identity never relies on color).
 * Slices are separated by a 2px surface-colored gap.
 *
 * With `onSelect`, slices and legend rows are clickable (e.g. to filter a dashboard): the
 * `selectedKey` slice keeps its color and the others fade.
 */
export function DonutChart({
  slices,
  centerLabel,
  formatValue = (value) => String(value),
  selectedKey = null,
  onSelect,
}: {
  slices: DonutSlice[];
  centerLabel: string;
  formatValue?: (value: number) => string;
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
}) {
  const faded = (key: string) => selectedKey !== null && key !== selectedKey;
  const colors = useChartColors();
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const visible = slices.filter((slice) => slice.value > 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
      <div className="relative h-[180px] w-[180px] shrink-0" role="img" aria-label={centerLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visible}
              dataKey="value"
              nameKey="label"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={visible.length > 1 ? 2 : 0}
              stroke={colors.surface}
              strokeWidth={2}
              isAnimationActive={false}
              onClick={onSelect ? (_, index) => onSelect(visible[index]!.key) : undefined}
              className={onSelect ? 'cursor-pointer' : undefined}
            >
              {visible.map((slice) => (
                <Cell
                  key={slice.key}
                  fill={slice.color}
                  fillOpacity={faded(slice.key) ? 0.25 : 1}
                  className="transition-[fill-opacity] duration-200"
                />
              ))}
            </Pie>
            <Tooltip
              isAnimationActive={false}
              content={({ active, payload }) => {
                const slice = payload?.[0]?.payload as DonutSlice | undefined;
                if (!active || !slice) return null;
                return (
                  <ChartTooltipCard
                    title={slice.label}
                    rows={[
                      {
                        label: centerLabel,
                        value: `${formatValue(slice.value)} · ${total ? Math.round((slice.value / total) * 100) : 0}%`,
                        color: slice.color,
                      },
                    ]}
                  />
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{formatValue(total)}</span>
          <span className="text-[11px] text-muted">{centerLabel}</span>
        </div>
      </div>
      <ul className={cx('w-full min-w-0 text-sm', onSelect ? 'space-y-0.5' : 'space-y-2')}>
        {slices.map((slice) => {
          const content = (
            <>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: slice.color }}
                  aria-hidden="true"
                />
                <span className="truncate text-ink">{slice.label}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                <span className="font-semibold">{formatValue(slice.value)}</span>
                <span className="ml-1.5 text-xs text-muted">
                  {total ? Math.round((slice.value / total) * 100) : 0}%
                </span>
              </span>
            </>
          );
          return (
            <li key={slice.key}>
              {onSelect ? (
                <button
                  type="button"
                  aria-pressed={slice.key === selectedKey}
                  onClick={() => onSelect(slice.key)}
                  className={cx(
                    'flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1 text-left transition',
                    slice.key === selectedKey
                      ? 'bg-primary-soft ring-1 ring-primary/40'
                      : 'hover:bg-surface-3',
                    faded(slice.key) && 'opacity-55',
                  )}
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-center justify-between gap-3">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
