import { useMinimumLoading } from '../hooks/useMinimumLoading';
import { useUiI18n } from '../i18n/context';
import { cx } from './cx';
import { Spinner } from './Feedback';

/** Small "Cargando…" pill with a spinner (used over cards, charts and tables while they refresh). */
export function LoadingPill({ className }: { className?: string }) {
  const { t } = useUiI18n();
  return (
    <span
      role="status"
      className={cx(
        'inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted shadow-pop',
        className,
      )}
    >
      <Spinner className="h-3.5 w-3.5 text-primary" />
      {t('activity.loading')}
    </span>
  );
}

/**
 * Dims the content of its (relatively positioned) parent and shows a centered spinner while
 * `active`. Kept visible for a moment so fast refreshes are still noticeable.
 */
export function LoadingOverlay({ active, className }: { active: boolean; className?: string }) {
  const visible = useMinimumLoading(active, 500);
  return (
    <div
      aria-hidden={!visible}
      className={cx(
        'pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-surface/60 backdrop-blur-[1px] transition-opacity duration-200',
        visible ? 'opacity-100' : 'opacity-0',
        className,
      )}
    >
      {visible && <LoadingPill />}
    </div>
  );
}
