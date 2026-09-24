import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { cx } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { addDaysIso } from './dueLabel';

/** "When will they pay?" shortcuts, in days from the day of the sale. */
const DUE_SHORTCUTS = [7, 15, 30] as const;

/**
 * Due date as three shortcuts (1 week / 15 days / 1 month) plus "Otra fecha", with the chosen
 * date spelled out underneath. Used by the credit sale and the plain "Anotar fiado" forms.
 */
export function DueDateField({
  id,
  from,
  value,
  onChange,
  initialCustom = false,
}: {
  id: string;
  /** The day of the sale: shortcuts count from it and earlier dates are not allowed. */
  from: string;
  value: string;
  onChange: (date: string) => void;
  initialCustom?: boolean;
}) {
  const { t, fmt } = useI18n();
  const [custom, setCustom] = useState(initialCustom);
  const pill = (active: boolean) =>
    cx(
      'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
      active
        ? 'border-primary bg-primary text-on-primary'
        : 'border-line bg-surface hover:border-primary/50',
    );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('receivables.form.dueDate')}>
        {DUE_SHORTCUTS.map((days) => {
          const date = addDaysIso(from, days);
          const selected = !custom && value === date;
          return (
            <button
              key={days}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setCustom(false);
                onChange(date);
              }}
              className={pill(selected)}
            >
              {t(`receivables.form.in${days}`)}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={custom}
          onClick={() => setCustom(true)}
          className={pill(custom)}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          {t('receivables.form.otherDate')}
        </button>
      </div>
      {custom && (
        <input
          id={id}
          className="input"
          type="date"
          required
          min={from}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <p className="text-xs text-muted">
        {t('receivables.form.paysOn', { date: fmt.date(value) })}
      </p>
    </div>
  );
}
