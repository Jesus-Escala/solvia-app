import { NavLink } from 'react-router';
import { cx, Logo } from '@/ui';
import { useMe } from '../../hooks/queries';
import { useModules } from '../../hooks/useModules';
import { useI18n } from '../../i18n/I18nProvider';
import { NAV_FOOTER, visibleSections, type NavItem } from './navItems';

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { t } = useI18n();
  return (
    <NavLink
      to={item.to}
      end={item.end}
      {...(collapsed && { title: t(item.label) })}
      className={({ isActive }) =>
        cx(
          'group relative flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-all duration-200',
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
          <span className={cx('[&>svg]:h-[18px] [&>svg]:w-[18px]', isActive && 'text-primary')}>
            {item.icon}
          </span>
          {!collapsed && t(item.label)}
        </>
      )}
    </NavLink>
  );
}

/**
 * Desktop sidebar (paper tone, collapsible to icons), grouped in sections: selling and
 * collecting, inventory and numbers, with settings and help at the bottom. Phones use
 * <BottomNav> and its "Más" sheet instead.
 */
export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const { t } = useI18n();
  const modules = useModules();
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

        <nav
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-2"
          aria-label={t('nav.section')}
          data-tour="nav"
        >
          {visibleSections(modules).map((section, index) => (
            <div key={section.title ?? index}>
              {section.title !== null &&
                (collapsed ? (
                  <div className="mx-3 mb-2 border-t border-line" aria-hidden="true" />
                ) : (
                  <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-[0.14em] text-sidebar-muted uppercase">
                    {t(section.title)}
                  </p>
                ))}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <SidebarLink item={item} collapsed={collapsed} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 space-y-0.5 border-t border-line px-3 py-2">
          {NAV_FOOTER.map((item) => (
            <SidebarLink key={item.to} item={item} collapsed={collapsed} />
          ))}
        </div>
        <div
          className={cx(
            'shrink-0 border-t border-line py-3 text-xs text-sidebar-muted',
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
