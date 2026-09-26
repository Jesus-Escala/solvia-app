import { SlidersHorizontal } from 'lucide-react';
import { useUiI18n } from '../i18n/context';
import { cx } from './cx';

/**
 * Phones: the "Filtros" button that folds a page's filters so its list keeps the room. It shows
 * how many filters are active (highlighted when there are some). Hidden from `md` up, where the
 * filters are always in sight.
 */
export function FilterFoldButton({
  open,
  onToggle,
  active = null,
  tour,
  className,
}: {
  open: boolean;
  onToggle: () => void;
  /** Filters in use (null: not counted). */
  active?: number | null;
  /** `data-tour` target of the guided tours. */
  tour?: string;
  className?: string;
}) {
  const { t } = useUiI18n();
  const highlighted = open || (active ?? 0) > 0;
  return (
    <button
      type="button"
      aria-expanded={open}
      data-tour={tour}
      aria-label={t('table.filters')}
      title={t('table.filters')}
      onClick={onToggle}
      className={cx(
        // Only the icon (and how many are active): the search next to it keeps its room.
        'relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition md:hidden [&>svg]:h-4.5 [&>svg]:w-4.5',
        highlighted
          ? 'border-primary/40 bg-primary-soft/60 text-primary-ink'
          : 'border-line bg-surface text-ink',
        className,
      )}
    >
      <SlidersHorizontal />
      {active !== null && active > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-on-primary tabular-nums">
          {active}
        </span>
      )}
    </button>
  );
}
