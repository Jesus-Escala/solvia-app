import { ChevronRight, ShoppingBasket } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';

/**
 * Point-of-sale screen: the catalog on the left and the ticket on the right (lg and up). On
 * phones the catalog fills the screen with a bar at the bottom ("3 productos · S/ 25 → Ver
 * venta") that opens the ticket over it; `panelOpen` says which one is shown there.
 */
export function PosLayout({
  catalog,
  panel,
  panelOpen,
  onOpenPanel,
  count,
  total,
  barLabel,
}: {
  catalog: ReactNode;
  panel: ReactNode;
  /** Phones: the ticket is shown instead of the catalog. */
  panelOpen: boolean;
  onOpenPanel: () => void;
  count: number;
  total: number;
  /** Action of the phone bar ("Ver venta"). */
  barLabel: string;
}) {
  const { t, fmt } = useI18n();
  return (
    <div className="grid h-full min-h-0 lg:grid-cols-[minmax(0,1fr)_440px]">
      <section
        className={cx('flex min-h-0 flex-col bg-surface-2/60', panelOpen && 'max-lg:hidden')}
      >
        <div className="min-h-0 flex-1">{catalog}</div>
        {/* Phones: what is in the ticket, one tap away. */}
        <div className="shrink-0 border-t border-line bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
          <button
            type="button"
            onClick={onOpenPanel}
            disabled={count === 0}
            className="flex h-14 w-full items-center gap-3 rounded-2xl bg-primary px-4 text-on-primary shadow-pop transition active:scale-[0.99] disabled:bg-surface-3 disabled:text-muted disabled:shadow-none"
          >
            <ShoppingBasket className="h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-xs opacity-80">
                {t('sales.pos.items', { count: fmt.number(count) })}
              </span>
              <span className="block font-display text-lg leading-tight font-semibold tabular-nums">
                {fmt.money(total)}
              </span>
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold">
              {barLabel}
              <ChevronRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      </section>
      <aside
        className={cx(
          'flex min-h-0 flex-col border-line bg-surface lg:border-l lg:shadow-pop',
          !panelOpen && 'max-lg:hidden',
        )}
      >
        {panel}
      </aside>
    </div>
  );
}

/** Keyboard hint shown on large screens ("Alt S"). */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="hidden rounded border border-current/30 px-1.5 py-0.5 font-sans text-[10px] font-semibold opacity-80 lg:inline">
      {children}
    </kbd>
  );
}
