import { cx } from '@/ui';

/** Money input with the "S/" prefix. */
export function MoneyInput({
  id,
  value,
  onChange,
  required = false,
  describedBy,
  autoFocus = false,
  placeholder = '0.00',
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  describedBy?: string;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cx('relative', className)}>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-muted">
        S/
      </span>
      <input
        id={id}
        aria-describedby={describedBy}
        className="input pl-9 tabular-nums"
        type="number"
        inputMode="decimal"
        min={required ? '0.01' : '0'}
        step="0.01"
        required={required}
        placeholder={placeholder}
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
