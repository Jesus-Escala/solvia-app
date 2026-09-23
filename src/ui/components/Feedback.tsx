import { AlertCircle, CheckCircle2, Info, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from './cx';

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={cx('animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted" role="status">
      <Spinner /> <span className="text-sm">{label}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cx('animate-pulse rounded-md bg-surface-3', className)} aria-hidden="true" />
  );
}

type AlertTone = 'danger' | 'success' | 'info' | 'warning';

const ALERT_STYLES: Record<AlertTone, { box: string; icon: ReactNode }> = {
  danger: {
    box: 'border-danger/25 bg-danger-soft text-danger-ink',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  success: {
    box: 'border-success/25 bg-success-soft text-success-ink',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  info: { box: 'border-info/25 bg-info-soft text-info-ink', icon: <Info className="h-4 w-4" /> },
  warning: {
    box: 'border-warning/30 bg-warning-soft text-warning-ink',
    icon: <AlertCircle className="h-4 w-4" />,
  },
};

export function Alert({
  tone = 'info',
  children,
  className,
}: {
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
}) {
  const style = ALERT_STYLES[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx(
        'flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm',
        style.box,
        className,
      )}
    >
      <span className="mt-0.5 shrink-0">{style.icon}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  compact = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center gap-2 px-6 text-center',
        compact ? 'py-8' : 'py-14',
      )}
    >
      <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-surface-3 text-subtle">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
