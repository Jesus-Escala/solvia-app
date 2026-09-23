import type { ReactNode } from 'react';

/** Tooltip card shared by every chart. Values use text colors; a swatch carries identity. */
export function ChartTooltipCard({
  title,
  rows,
}: {
  title: ReactNode;
  rows: Array<{ label: ReactNode; value: ReactNode; color?: string }>;
}) {
  return (
    <div className="min-w-40 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink shadow-pop">
      <p className="mb-1 font-semibold">{title}</p>
      {rows.map((row, index) => (
        <p key={index} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted">
            {row.color && (
              <span
                className="h-2 w-2 rounded-sm"
                style={{ background: row.color }}
                aria-hidden="true"
              />
            )}
            {row.label}
          </span>
          <span className="font-semibold tabular-nums">{row.value}</span>
        </p>
      ))}
    </div>
  );
}
