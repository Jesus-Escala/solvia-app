import { LayoutGrid } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { cx, Modal } from '@/ui';
import { useModules } from '../../hooks/useModules';
import { useI18n } from '../../i18n/I18nProvider';
import { QuickAddMenu } from '../quick/QuickActions';
import { mobileItems, NAV_FOOTER, visibleSections, type NavItem } from './navItems';

const tabClass = (active: boolean) =>
  cx(
    'flex w-full flex-col items-center gap-1 py-2 text-[11px] font-medium transition',
    active ? 'text-primary-ink' : 'text-muted active:text-ink',
  );

function TabIcon({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cx(
        'flex h-7 w-12 items-center justify-center rounded-full transition [&>svg]:h-5 [&>svg]:w-5',
        active && 'bg-primary-soft',
      )}
    >
      {children}
    </span>
  );
}

/** Everything else, grouped like the desktop sidebar, as big tappable tiles. */
function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const modules = useModules();
  const tile = (item: NavItem) => (
    <li key={item.to}>
      <NavLink
        to={item.to}
        end={item.end}
        onClick={onClose}
        className={({ isActive }) =>
          cx(
            'flex h-full flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center text-xs font-medium transition',
            isActive
              ? 'border-primary bg-primary-soft text-primary-ink'
              : 'border-line bg-surface text-ink active:bg-surface-2',
          )
        }
      >
        <span className="text-primary-ink [&>svg]:h-6 [&>svg]:w-6">{item.icon}</span>
        {t(item.label)}
      </NavLink>
    </li>
  );
  return (
    <Modal open={open} title={t('nav.more')} onClose={onClose} closeLabel={t('common.close')}>
      <div className="space-y-4">
        {visibleSections(modules).map((section, index) => (
          <section key={section.title ?? index}>
            {section.title !== null && (
              <h3 className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                {t(section.title)}
              </h3>
            )}
            <ul className="grid grid-cols-3 gap-2">{section.items.map(tile)}</ul>
          </section>
        ))}
        <section className="border-t border-line pt-4">
          <ul className="grid grid-cols-3 gap-2">{NAV_FOOTER.map(tile)}</ul>
        </section>
      </div>
    </Modal>
  );
}

/**
 * Mobile tab bar (below lg): three main places, the "+ Anotar" button in the middle and "Más"
 * with everything else. It is a flex sibling of <main> (not position: fixed), so the content
 * area height stays exact and full-height tables keep their internal scroll.
 */
export function BottomNav() {
  const { t } = useI18n();
  const modules = useModules();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = mobileItems(modules);
  // "Más" lights up when the current page is not one of the bar's own tabs.
  const inMore = !items.some((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  );

  const link = (item: NavItem) => (
    <li key={item.to} className="flex-1">
      <NavLink to={item.to} end={item.end} className={({ isActive }) => tabClass(isActive)}>
        {({ isActive }) => (
          <>
            <TabIcon active={isActive}>{item.icon}</TabIcon>
            {t(item.label)}
          </>
        )}
      </NavLink>
    </li>
  );

  return (
    <nav
      aria-label={t('nav.section')}
      className="shrink-0 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-end justify-around px-1" data-tour="nav">
        {items.slice(0, 2).map(link)}
        <li className="-mt-4 flex flex-1 justify-center">
          <QuickAddMenu variant="fab" />
        </li>
        {items.slice(2).map(link)}
        <li className="flex-1">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setMoreOpen(true)}
            className={tabClass(inMore)}
          >
            <TabIcon active={inMore}>
              <LayoutGrid />
            </TabIcon>
            {t('nav.more')}
          </button>
        </li>
      </ul>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </nav>
  );
}
