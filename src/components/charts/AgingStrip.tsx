export interface AgingSegment {
  key: string;
  label: string;
  amount: number;
  count: number;
  /** CSS color (use the --aging-* tokens: a validated single-hue ordinal ramp). */
  color: string;
}

/** 100% stacked strip with a labelled legend (amount, share and count per bucket). */
export function AgingStrip({
  segments,
  formatValue,
  formatCount,
}: {
  segments: AgingSegment[];
  formatValue: (value: number) => string;
  formatCount: (count: number) => string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.amount, 0);
  const share = (amount: number) => (total > 0 ? amount / total : 0);

  return (
    <div>
      <div
        className="flex h-3.5 w-full gap-[2px] overflow-hidden rounded-full bg-surface-3"
        role="img"
        aria-label={segments.map((s) => `${s.label}: ${formatValue(s.amount)}`).join(', ')}
      >
        {segments
          .filter((segment) => segment.amount > 0)
          .map((segment) => (
            <div
              key={segment.key}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${share(segment.amount) * 100}%`, background: segment.color }}
              title={`${segment.label}: ${formatValue(segment.amount)}`}
            />
          ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-5">
        {segments.map((segment) => (
          <li key={segment.key} className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: segment.color }}
                aria-hidden="true"
              />
              <span className="truncate">{segment.label}</span>
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">
              {formatValue(segment.amount)}
            </p>
            <p className="text-[11px] text-subtle tabular-nums">
              {Math.round(share(segment.amount) * 100)}% · {formatCount(segment.count)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
