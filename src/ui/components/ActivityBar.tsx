import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { useMinimumLoading } from '../hooks/useMinimumLoading';
import { useUiI18n } from '../i18n/context';

/**
 * Thin progress bar at the top of the window while any API request is in flight (lists loading,
 * saves, deletes, menu actions…). Stays visible at least a moment so fast requests are noticed.
 * Mount it once inside the QueryClientProvider.
 */
export function ActivityBar() {
  const { t } = useUiI18n();
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const busy = useMinimumLoading(fetching + mutating > 0, 500);

  return (
    <div
      role="progressbar"
      aria-label={t('activity.loading')}
      aria-hidden={!busy}
      className={`pointer-events-none fixed inset-x-0 top-0 z-[80] h-[3px] overflow-hidden transition-opacity duration-300 ${busy ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="absolute inset-0 bg-primary/15" />
      <div className="activity-bar absolute inset-y-0 w-2/5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
    </div>
  );
}
