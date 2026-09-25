import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { parseQuantity, roundQuantity } from './quantity';

/**
 * − / quantity / + for a line of a sale or a purchase. Going below one step asks to remove the
 * line (`onRemove`) instead of reaching zero. Any amount can be typed (0.3, 1,25, 2.375): the text
 * is kept while typing, so "0." or "1," are not lost, and the number goes out once it is valid.
 */
export function QuantityStepper({
  value,
  onChange,
  onRemove,
  step = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  onRemove: () => void;
  step?: number;
}) {
  const { t } = useI18n();
  // What is being typed; null shows the value (buttons and chips change it from outside).
  const [draft, setDraft] = useState<string | null>(null);
  const button = 'flex h-9 w-9 items-center justify-center text-muted hover:text-ink';
  const set = (next: number) => {
    setDraft(null);
    onChange(next);
  };
  return (
    <div className="flex items-center rounded-lg border border-line">
      <button
        type="button"
        aria-label={t('sales.form.less')}
        onClick={() => (value <= step ? onRemove() : set(roundQuantity(value - step)))}
        className={button}
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        aria-label={t('sales.form.quantity')}
        className="h-9 w-[4.5rem] border-x border-line bg-transparent text-center text-sm font-semibold tabular-nums outline-none"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={draft ?? String(value)}
        onChange={(event) => {
          const text = event.target.value;
          setDraft(text);
          const parsed = parseQuantity(text);
          if (parsed !== null) onChange(parsed);
        }}
        onBlur={() => setDraft(null)}
      />
      <button
        type="button"
        aria-label={t('sales.form.more')}
        onClick={() => set(roundQuantity(value + step))}
        className={button}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
