import { Eye, EyeOff, Search, X } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { cx } from './cx';

/** Label + control + error/hint. The render prop receives the generated id for the control. */
export function Field({
  label,
  error,
  hint,
  optionalLabel,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  /** Text appended to the label for optional fields, e.g. "opcional". */
  optionalLabel?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}) {
  const id = useId();
  const messageId = `${id}-message`;
  const hasMessage = Boolean(error || hint);
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {optionalLabel && <span className="ml-1 font-normal text-subtle">({optionalLabel})</span>}
      </label>
      {children(id, hasMessage ? messageId : undefined)}
      {error ? (
        <p id={messageId} className="mt-1.5 text-xs text-danger-ink">
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="mt-1.5 text-xs text-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  count?: number;
}

/** Pill-shaped segmented control (single choice). */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'sm',
  ...rest
}: {
  value: T;
  options: Array<SegmentOption<T>>;
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex max-w-full shrink-0 flex-nowrap gap-0.5 overflow-x-auto rounded-full border border-line bg-surface-2 p-[3px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      {...rest}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition',
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
              active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
            )}
          >
            {option.icon && <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{option.icon}</span>}
            {option.label}
            {option.count !== undefined && (
              <span
                className={cx(
                  'rounded-full px-1.5 text-[10px] tabular-nums',
                  active ? 'bg-surface-3' : 'bg-surface-3/60',
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  count?: number;
}

/** Underlined tabs for switching sections of a page. */
export function Tabs<T extends string>({
  value,
  items,
  onChange,
  label,
  ...rest
}: {
  value: T;
  items: Array<TabItem<T>>;
  onChange: (value: T) => void;
  label: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 overflow-x-auto border-b border-line"
      {...rest}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cx(
              '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition',
              active
                ? 'border-primary text-ink'
                : 'border-transparent text-muted hover:border-line-strong hover:text-ink',
            )}
          >
            {item.icon && <span className="[&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
            {item.label}
            {item.count !== undefined && (
              <span className="rounded-full bg-surface-3 px-1.5 text-[11px] text-muted tabular-nums">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Search box that reports its value after the user stops typing (debounced). */
export function SearchInput({
  value,
  onChange,
  placeholder,
  delay = 300,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  delay?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);

  // Follow external changes (e.g. cleared filters) without an effect.
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }

  useEffect(() => {
    if (draft === value) return;
    const timeout = window.setTimeout(() => onChange(draft.trim()), delay);
    return () => window.clearTimeout(timeout);
  }, [draft, value, delay, onChange]);

  return (
    <div className={cx('relative w-full sm:w-72', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" />
      <input
        type="search"
        value={draft}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        className="input h-9 pr-8 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {draft && (
        <button
          type="button"
          onClick={() => {
            setDraft('');
            onChange('');
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-subtle hover:text-ink"
          aria-label="Clear"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/**
 * Password field with a show/hide toggle. Reports focus and visibility so callers can react
 * (e.g. the mascot covering its eyes on the login page).
 */
export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  minLength,
  showLabel,
  hideLabel,
  onFocusChange,
  onVisibilityChange,
  describedBy,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  minLength?: number;
  showLabel: string;
  hideLabel: string;
  onFocusChange?: (focused: boolean) => void;
  onVisibilityChange?: (visible: boolean) => void;
  describedBy?: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const toggle = () => {
    const next = !visible;
    setVisible(next);
    onVisibilityChange?.(next);
  };
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        className={cx('input pr-11', className)}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        value={value}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
      />
      <button
        type="button"
        onClick={toggle}
        // Keep focus in the input so the caller's focus state does not flicker.
        onMouseDown={(event) => event.preventDefault()}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        title={visible ? hideLabel : showLabel}
        className="absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-subtle transition hover:bg-surface-3 hover:text-ink"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
