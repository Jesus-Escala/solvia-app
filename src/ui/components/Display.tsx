import { useId, type ReactNode } from 'react';
import { cx } from './cx';
import { LoadingOverlay } from './LoadingOverlay';

// --- Badge ----------------------------------------------------------------------------

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

const BADGE_TONES: Record<BadgeTone, { box: string; dot: string }> = {
  neutral: { box: 'bg-surface-3 text-muted', dot: 'bg-subtle' },
  success: { box: 'bg-success-soft text-success-ink', dot: 'bg-success' },
  warning: { box: 'bg-warning-soft text-warning-ink', dot: 'bg-warning' },
  danger: { box: 'bg-danger-soft text-danger-ink', dot: 'bg-danger' },
  info: { box: 'bg-info-soft text-info-ink', dot: 'bg-info' },
  primary: { box: 'bg-primary-soft text-primary-ink', dot: 'bg-primary' },
};

/** Pill badge. Always carries a text label (and optionally an icon), never color alone. */
export function Badge({
  tone = 'neutral',
  icon,
  dot = false,
  title,
  children,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  dot?: boolean;
  title?: string;
  children: ReactNode;
}) {
  const style = BADGE_TONES[tone];
  return (
    <span
      title={title}
      className={cx(
        'inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        style.box,
      )}
    >
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', style.dot)} aria-hidden="true" />}
      {icon && <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}
      {children}
    </span>
  );
}

// --- Card -----------------------------------------------------------------------------

export function Card({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
  padded = true,
  loading = false,
  ...rest
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  padded?: boolean;
  /** Refreshing: dims the body and shows a spinner over it. */
  loading?: boolean;
} & Omit<React.HTMLAttributes<HTMLElement>, 'title'>) {
  return (
    <section
      className={cx(
        'flex min-w-0 flex-col rounded-xl border border-line bg-surface shadow-card',
        className,
      )}
      {...rest}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div
        className={cx(
          'relative min-h-0 flex-1',
          padded && 'px-5 pb-5',
          !title && !actions && padded && 'pt-5',
          bodyClassName,
        )}
      >
        {children}
        <LoadingOverlay active={loading} />
      </div>
    </section>
  );
}

// --- Avatar ---------------------------------------------------------------------------

const AVATAR_TINTS = [
  'bg-[#e7f0fb] text-[#1c5cab] dark:bg-[#132338] dark:text-[#9cc4f3]',
  'bg-[#fdebe3] text-[#a3431c] dark:bg-[#33190f] dark:text-[#f3a585]',
  'bg-[#e3f5ee] text-[#0f7552] dark:bg-[#0f2a20] dark:text-[#7fd6b3]',
  'bg-[#f1eefc] text-[#4a3aa7] dark:bg-[#1f1a36] dark:text-[#b6adf0]',
];

/** Initials avatar with a stable tint derived from the name. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const tint =
    AVATAR_TINTS[
      [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_TINTS.length
    ];
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        size === 'sm'
          ? 'h-7 w-7 text-[11px]'
          : size === 'lg'
            ? 'h-12 w-12 text-base'
            : 'h-9 w-9 text-xs',
        tint,
      )}
    >
      {initials}
    </span>
  );
}

// --- Progress bar ---------------------------------------------------------------------

export function ProgressBar({
  value,
  tone = 'primary',
  label,
}: {
  value: number;
  tone?: 'primary' | 'success' | 'danger';
  label?: string;
}) {
  const color = tone === 'success' ? 'bg-success' : tone === 'danger' ? 'bg-danger' : 'bg-primary';
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
    >
      <div
        className={cx('h-full rounded-full transition-[width]', color)}
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  );
}

// --- Description list -----------------------------------------------------------------

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <dt id={id} className="text-xs text-muted">
        {label}
      </dt>
      <dd aria-labelledby={id} className="mt-0.5 text-lg font-semibold tabular-nums">
        {value}
      </dd>
      {hint && <p className="text-xs text-subtle">{hint}</p>}
    </div>
  );
}
