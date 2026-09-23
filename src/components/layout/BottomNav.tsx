import { NavLink } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import { cx } from '@/ui';
import { NAV_ITEMS } from './navItems';

/**
 * Mobile tab bar (below lg). It is a flex sibling of <main> (not position: fixed), so the
 * content area height stays exact and full-height tables keep their internal scroll.
 */
export function BottomNav() {
  const { t } = useI18n();
  return (
    <nav
      aria-label={t('nav.section')}
      className="shrink-0 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1" data-tour="nav">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition',
                  isActive ? 'text-primary-ink' : 'text-muted active:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cx(
                      'flex h-7 w-12 items-center justify-center rounded-full transition [&>svg]:h-[18px] [&>svg]:w-[18px]',
                      isActive && 'bg-primary-soft',
                    )}
                  >
                    {item.icon}
                  </span>
                  {t(item.label)}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
