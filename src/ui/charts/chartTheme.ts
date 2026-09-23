import { useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';

const TOKENS = {
  series1: '--chart-1',
  series2: '--chart-2',
  series3: '--chart-3',
  series4: '--chart-4',
  grid: '--chart-grid',
  axis: '--chart-axis',
  neutral: '--chart-neutral',
  surface: '--surface',
  ink: '--ink',
  muted: '--muted',
  success: '--success',
  warning: '--warning',
  danger: '--danger',
} as const;

export type ChartColors = Record<keyof typeof TOKENS, string>;

/**
 * Resolves theme tokens to concrete colors for SVG charts (Recharts needs real values).
 * Recomputes whenever the resolved light/dark theme changes.
 */
export function useChartColors(): ChartColors {
  const { resolved } = useTheme();
  return useMemo(() => {
    const styles = getComputedStyle(document.documentElement);
    return Object.fromEntries(
      Object.entries(TOKENS).map(([name, token]) => [name, styles.getPropertyValue(token).trim()]),
    ) as ChartColors;
    // `resolved` is the dependency that matters: tokens change when the theme changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);
}

export const AXIS_TICK = { fontSize: 11 };
export const CHART_HEIGHT = 260;
