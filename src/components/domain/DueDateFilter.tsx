import { CalendarRange, Check, ChevronDown, X } from 'lucide-react';
import { useState } from 'react';
import { Button, cx, Popover } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { isValidRange, toIso, type PeriodRange } from '../dashboard/period';

type DuePreset = 'today' | 'next7' | 'next30' | 'thisMonth' | 'lastMonth' | 'past30';
const PRESETS: DuePreset[] = ['today', 'next7', 'next30', 'thisMonth', 'lastMonth', 'past30'];

/** Due-date ranges that matter when collecting: what falls due soon and what fell due lately. */
function presetRange(preset: DuePreset, today = new Date()): PeriodRange {
  const day = (offset: number) =>
    toIso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset));
  const month = (offset: number) => ({
    from: toIso(new Date(today.getFullYear(), today.getMonth() + offset, 1)),
    to: toIso(new Date(today.getFullYear(), today.getMonth() + offset + 1, 0)),
  });
  switch (preset) {
    case 'today':
      return { from: day(0), to: day(0) };
    case 'next7':
      return { from: day(0), to: day(7) };
    case 'next30':
      return { from: day(0), to: day(30) };
    case 'thisMonth':
      return month(0);
    case 'lastMonth':
      return month(-1);
    case 'past30':
      return { from: day(-30), to: day(0) };
  }
}

function matchPreset(range: PeriodRange): DuePreset | 'custom' {
  return (
    PRESETS.find((preset) => {
      const candidate = presetRange(preset);
      return candidate.from === range.from && candidate.to === range.to;
    }) ?? 'custom'
  );
}

/**
 * Filter of the receivables list by due date: quick ranges (due soon, due lately, a month) or a
 * custom range. An empty range means "any date".
 */
export function DueDateFilter({
  range,
  onChange,
}: {
  range: PeriodRange | null;
  onChange: (range: PeriodRange | null) => void;
}) {
  const { t, fmt } = useI18n();
  const today = toIso(new Date());
  const [draft, setDraft] = useState<PeriodRange>(range ?? { from: today, to: today });
  const active = range !== null;
  const preset = range ? matchPreset(range) : null;
  const label = !range
    ? t('receivables.dueFilter.all')
    : preset !== 'custom' && preset
      ? t(`receivables.dueFilter.presets.${preset}`)
      : range.from === range.to
        ? fmt.date(range.from)
        : `${fmt.shortDate(range.from)} – ${fmt.shortDate(range.to)}`;
  const valid = isValidRange(draft);

  return (
    <div className="flex items-center">
      <Popover
        align="start"
        width={300}
        trigger={({ toggle, ref, open }) => (
          <button
            ref={ref}
            type="button"
            onClick={() => {
              if (!open) setDraft(range ?? { from: today, to: today });
              toggle();
            }}
            aria-expanded={open}
            aria-haspopup="dialog"
            className={cx(
              'flex h-9 items-center gap-2 border px-3 text-left text-xs font-semibold whitespace-nowrap transition',
              active
                ? 'rounded-l-full border-primary bg-primary text-on-primary shadow-sm shadow-primary/30'
                : 'rounded-full border-line bg-surface-2 text-muted hover:text-ink',
            )}
          >
            <CalendarRange className="h-3.5 w-3.5 shrink-0" />
            <span className={cx(!active && 'hidden sm:inline')}>
              {t('receivables.dueFilter.label')}:
            </span>
            <span>{label}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
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
                    onChange(presetRange(option));
                    close();
                  }}
                  className={cx(
                    'flex items-center justify-between gap-1 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface-3',
                    preset === option && 'bg-primary-soft/70 font-medium text-primary-ink',
                  )}
                >
                  {t(`receivables.dueFilter.presets.${option}`)}
                  {preset === option && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              ))}
            </div>
            <div className="border-t border-line px-2.5 pt-3 pb-1">
              <p className="mb-2 text-xs font-semibold text-muted">
                {t('receivables.dueFilter.custom')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-subtle">
                  {t('receivables.dueFilter.from')}
                  <input
                    type="date"
                    className="input mt-1 h-9 px-2"
                    value={draft.from}
                    onChange={(event) => setDraft({ ...draft, from: event.target.value })}
                  />
                </label>
                <label className="text-[11px] text-subtle">
                  {t('receivables.dueFilter.to')}
                  <input
                    type="date"
                    className="input mt-1 h-9 px-2"
                    value={draft.to}
                    min={draft.from}
                    onChange={(event) => setDraft({ ...draft, to: event.target.value })}
                  />
                </label>
              </div>
              {!valid && (
                <p className="mt-1.5 text-[11px] text-danger-ink">
                  {t('receivables.dueFilter.invalid')}
                </p>
              )}
              <div className="mt-2.5 flex gap-2">
                {active && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onChange(null);
                      close();
                    }}
                  >
                    {t('receivables.dueFilter.clear')}
                  </Button>
                )}
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!valid}
                  onClick={() => {
                    onChange(draft);
                    close();
                  }}
                >
                  {t('receivables.dueFilter.apply')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Popover>
      {active && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={t('receivables.dueFilter.clear')}
          className="flex h-9 items-center rounded-r-full border border-l-0 border-primary bg-primary px-2 text-on-primary transition hover:bg-primary/85"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
