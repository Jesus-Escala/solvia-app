import { NavLink } from 'react-router';
import { useMe } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import { cx, Logo } from '@/ui';
import { NAV_ITEMS } from './navItems';

/** Desktop sidebar (paper tone, collapsible to icons). Phones use <BottomNav> instead. */
export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const { t } = useI18n();
  const { data: me } = useMe();

  return (
    <aside
      className={cx(
        'hidden shrink-0 transition-[width] duration-200 lg:block',
        collapsed ? 'w-[76px]' : 'w-64',
        'border-r border-line bg-sidebar',
      )}
    >
      <div className="flex h-full flex-col">
        <div
          className={cx('flex h-16 shrink-0 items-center', collapsed ? 'justify-center' : 'px-5')}
        >
          <NavLink to="/" aria-label="Solvia">
            <Logo collapsed={collapsed} />
          </NavLink>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-2" aria-label={t('nav.section')}>
          {!collapsed && (
            <p className="px-3 pt-2 pb-2 text-[10px] font-semibold tracking-[0.14em] text-sidebar-muted uppercase">
              {t('nav.section')}
            </p>
          )}
          <ul className="space-y-1" data-tour="nav">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  title={collapsed ? t(item.label) : undefined}
                  className={({ isActive }) =>
                    cx(
                      'group relative flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all duration-200',
                      collapsed ? 'justify-center px-0' : 'px-3',
                      isActive
                        ? 'bg-sidebar-active text-sidebar-ink shadow-card ring-1 ring-line'
                        : 'text-sidebar-muted hover:translate-x-0.5 hover:bg-sidebar-active/60 hover:text-sidebar-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-primary"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={cx(
                          '[&>svg]:h-[18px] [&>svg]:w-[18px]',
                          isActive && 'text-primary',
                        )}
                      >
                        {item.icon}
                      </span>
                      {!collapsed && t(item.label)}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div
          className={cx(
            'shrink-0 border-t border-line py-4 text-xs text-sidebar-muted',
            collapsed ? 'px-2 text-center' : 'px-5',
          )}
        >
          {!collapsed && me?.tenant && (
            <p className="mb-1 truncate font-display text-sm font-medium text-sidebar-ink">
              {me.tenant.name}
            </p>
          )}
          <p>{collapsed ? '©' : t('nav.footer', { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </aside>
  );
}
