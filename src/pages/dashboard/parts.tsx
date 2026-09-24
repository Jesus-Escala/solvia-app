import { Clock, RefreshCw } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useMe } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';

function useMinutesSince(iso: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  return iso ? Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000)) : 0;
}

function greetingKey() {
  const hour = new Date().getHours();
  if (hour < 12) return 'dashboard.greetingMorning' as const;
  if (hour < 19) return 'dashboard.greetingAfternoon' as const;
  return 'dashboard.greetingEvening' as const;
}

export function DashboardHeader({
  generatedAt,
  onRefresh,
  refreshing,
}: {
  generatedAt?: string;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: me } = useMe();
  const minutes = useMinutesSince(generatedAt);
  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[1.75rem] leading-tight font-semibold sm:text-[2.1rem]">
          {t(greetingKey(), { name: firstName })}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {t('dashboard.subtitle', { business: me?.tenant.name ?? '' })}
        </p>
      </div>
      <div className="inline-flex items-center gap-1 self-start rounded-full border border-line bg-surface py-1 pr-1 pl-3 text-xs text-muted shadow-card sm:self-auto">
        <Clock className="h-3.5 w-3.5" />
        <span className="tabular-nums">
          {minutes < 1 ? t('common.updatedJustNow') : t('common.updatedMinutesAgo', { minutes })}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="ml-1 rounded-full p-1.5 transition hover:bg-surface-3 hover:text-ink"
          aria-label={t('common.refresh')}
          title={t('common.refresh')}
        >
          <RefreshCw className={refreshing ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
        </button>
      </div>
    </div>
  );
}

/** Title row of each dashboard section, with optional controls on the right. */
export function Section({
  title,
  hint,
  actions,
  children,
  ...rest
}: {
  title: string;
  hint: string;
  actions?: ReactNode;
  children: ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className="space-y-3" {...rest}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted">{hint}</p>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
