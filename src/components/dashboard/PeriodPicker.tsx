import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { Button, cx, IconButton, Popover, SegmentedControl } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';
import {
  allowedGranularities,
  daysBetween,
  fromIso,
  isValidRange,
  matchPreset,
  PRESETS,
  presetRange,
  toIso,
  type Granularity,
  type PeriodRange,
} from './period';

const GRANULARITY_ICONS: Record<Granularity, React.ReactNode> = {
  day: <CalendarDays />,
  week: <CalendarRange />,
  month: <Calendar />,
};

/** Moves a range one step back/forward: by calendar months when it spans whole months. */
function shiftRange(range: PeriodRange, direction: -1 | 1): PeriodRange {
  const from = fromIso(range.from);
  const to = fromIso(range.to);
  const today = new Date();
  const monthStart = from.getDate() === 1;
  const lastDay = new Date(to.getFullYear(), to.getMonth() + 1, 0).getDate();
  const monthEnd = to.getDate() === lastDay || toIso(to) === toIso(today);
  if (monthStart && monthEnd) {
    const months =
      (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth() + 1;
    const start = new Date(from.getFullYear(), from.getMonth() + direction * months, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + months, 0);
    return { from: toIso(start), to: toIso(end > today ? today : end) };
  }
  const days = daysBetween(range);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate() + direction * days);
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate() + direction * days);
  return { from: toIso(start), to: toIso(end > today ? today : end) };
}

function CustomRange({
  range,
  onApply,
}: {
  range: PeriodRange;
  onApply: (range: PeriodRange) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(range);
  const valid = isValidRange(draft) && draft.to <= toIso(new Date());
  return (
    <div className="border-t border-line px-2.5 pt-3 pb-1">
      <p className="mb-2 text-xs font-semibold text-muted">{t('dashboard.period.custom')}</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-subtle">
          {t('dashboard.period.from')}
          <input
            type="date"
            className="input mt-1 h-9 px-2"
            value={draft.from}
            max={draft.to}
            onChange={(event) => setDraft({ ...draft, from: event.target.value })}
          />
        </label>
        <label className="text-[11px] text-subtle">
          {t('dashboard.period.to')}
          <input
            type="date"
            className="input mt-1 h-9 px-2"
            value={draft.to}
            min={draft.from}
            max={toIso(new Date())}
            onChange={(event) => setDraft({ ...draft, to: event.target.value })}
          />
        </label>
      </div>
      {!valid && (
        <p className="mt-1.5 text-[11px] text-danger-ink">{t('dashboard.period.invalid')}</p>
      )}
      <Button size="sm" className="mt-2.5 w-full" disabled={!valid} onClick={() => onApply(draft)}>
        {t('dashboard.period.apply')}
      </Button>
    </div>
  );
}

/**
 * Period toolbar of the dashboard: preset/custom range picker, previous/next period arrows and
 * the chart granularity (day / week / month).
 */
export function PeriodPicker({
  range,
  granularity,
  onRangeChange,
  onGranularityChange,
  previous,
}: {
  range: PeriodRange;
  granularity: Granularity;
  onRangeChange: (range: PeriodRange) => void;
  onGranularityChange: (granularity: Granularity) => void;
  /** Comparison period returned by the API, shown as "vs …". */
  previous?: PeriodRange;
}) {
  const { t, fmt } = useI18n();
  const preset = matchPreset(range);
  const canGoForward = range.to < toIso(new Date());
  const rangeLabel = (value: PeriodRange) =>
    value.from === value.to
      ? fmt.date(value.from)
      : `${fmt.shortDate(value.from)} – ${fmt.date(value.to)}`;
  const granularities = allowedGranularities(range);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex min-w-0 items-center gap-1">
        <IconButton
          label={t('dashboard.period.previous')}
          variant="secondary"
          className="h-10 w-10 shrink-0"
          onClick={() => onRangeChange(shiftRange(range, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </IconButton>
        <Popover
          align="start"
          width={300}
          trigger={({ toggle, ref, open }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-haspopup="dialog"
              className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-left text-sm shadow-xs transition hover:border-line-strong sm:flex-none"
            >
              <CalendarRange className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 truncate">
                <span className="font-semibold">{t(`dashboard.period.presets.${preset}`)}</span>
                <span className="ml-1.5 text-muted tabular-nums">{rangeLabel(range)}</span>
              </span>
              <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-subtle" />
            </button>
          )}
        >
          {(close) => (
            <div>
              <div className="grid grid-cols-2 gap-1 pb-2">
                {PRESETS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onRangeChange(presetRange(option));
                      close();
                    }}
                    className={cx(
                      'flex items-center justify-between gap-1 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface-3',
                      preset === option && 'bg-primary-soft/70 font-medium text-primary-ink',
                    )}
                  >
                    {t(`dashboard.period.presets.${option}`)}
                    {preset === option && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
              <CustomRange
                range={range}
                onApply={(value) => {
                  onRangeChange(value);
                  close();
                }}
              />
            </div>
          )}
        </Popover>
        <IconButton
          label={t('dashboard.period.next')}
          variant="secondary"
          className="h-10 w-10 shrink-0"
          disabled={!canGoForward}
          onClick={() => onRangeChange(shiftRange(range, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="flex items-center justify-between gap-3 sm:contents">
        {granularities.length > 1 && (
          <SegmentedControl
            label={t('dashboard.period.granularity')}
            value={granularities.includes(granularity) ? granularity : granularities[0]!}
            onChange={onGranularityChange}
            options={granularities.map((value) => ({
              value,
              label: t(`dashboard.period.granularities.${value}`),
              icon: GRANULARITY_ICONS[value],
            }))}
          />
        )}
        {previous && (
          <span className="truncate text-xs text-subtle sm:ml-1">
            {t('dashboard.period.vs', { range: rangeLabel(previous) })}
          </span>
        )}
      </div>
    </div>
  );
}
