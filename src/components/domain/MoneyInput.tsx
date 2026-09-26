import { cx } from '@/ui';
import { limitMoneyText, padMoneyText } from '../../lib/moneyText';

/**
 * Money input with the "S/" prefix, the amount on the right: at most 2 decimals while typing and
 * always 2 once left ("5" → "5.00"). `size="lg"` for the main amount of a form.
 */
export function MoneyInput({
  id,
  value,
  onChange,
  required = false,
  describedBy,
  autoFocus = false,
  placeholder = '0.00',
  className,
  inputClassName,
  size = 'md',
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  describedBy?: string;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  /** Extra classes of the box itself (e.g. its height). */
  inputClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div className={cx('relative', className)}>
      <span
        className={cx(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 font-semibold text-muted',
          size === 'sm' ? 'left-2.5 text-xs' : 'left-3 text-sm',
        )}
      >
        S/
      </span>
      <input
        id={id}
        aria-describedby={describedBy}
        className={cx(
          'input text-right tabular-nums',
          size === 'sm' ? 'h-9 pl-7' : 'pl-9',
          size === 'lg' && 'text-lg font-semibold',
          inputClassName,
        )}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        required={required}
        placeholder={placeholder}
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => onChange(limitMoneyText(event.target.value))}
        onBlur={() => {
          const padded = padMoneyText(value);
          if (padded !== value) onChange(padded);
        }}
      />
    </div>
  );
}
