import { Minus, Plus } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { roundQuantity } from './quantity';

/**
 * − / quantity / + for a line of a sale or a purchase. Going below one step asks to remove the
 * line (`onRemove`) instead of reaching zero.
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
  const button = 'flex h-9 w-9 items-center justify-center text-muted hover:text-ink';
  return (
    <div className="flex items-center rounded-lg border border-line">
      <button
        type="button"
        aria-label={t('sales.form.less')}
        onClick={() => (value <= step ? onRemove() : onChange(roundQuantity(value - step)))}
        className={button}
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        aria-label={t('sales.form.quantity')}
        className="h-9 w-14 border-x border-line bg-transparent text-center text-sm font-semibold tabular-nums outline-none"
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        value={value}
        onChange={(event) => onChange(Math.max(0, roundQuantity(Number(event.target.value) || 0)))}
      />
      <button
        type="button"
        aria-label={t('sales.form.more')}
        onClick={() => onChange(roundQuantity(value + step))}
        className={button}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
