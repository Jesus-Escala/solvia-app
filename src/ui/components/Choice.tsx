import type { ReactNode } from 'react';
import { cx } from './cx';

interface ChoiceProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  /** Second line under the label. */
  hint?: ReactNode;
  disabled?: boolean;
  /** Framed box (for an option that stands on its own in a form). */
  card?: boolean;
  className?: string;
}

/** A checkbox with its label (and optional hint): the whole row is clickable. */
export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
  card = false,
  className,
}: ChoiceProps) {
  return (
    <label
      className={cx(
        'flex items-start gap-3',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        card && 'rounded-xl border border-line bg-surface-2 p-3',
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="min-w-0">
        <span className={cx('block text-sm', Boolean(hint) && 'font-semibold')}>{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** An on/off switch with its label on the left (settings that turn a feature on or off). */
export function Switch({
  checked,
  onChange,
  label,
  hint,
  icon,
  disabled = false,
  card = false,
  className,
}: ChoiceProps & { icon?: ReactNode }) {
  return (
    <label
      className={cx(
        'flex items-center justify-between gap-4',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        card && 'rounded-xl border border-line bg-surface-2 px-4 py-3',
        className,
      )}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-3 text-sm font-medium [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:text-primary">
          {icon}
          {label}
        </span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full bg-line-strong transition peer-checked:bg-primary peer-focus-visible:ring-3 peer-focus-visible:ring-primary/30 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
      />
    </label>
  );
}
