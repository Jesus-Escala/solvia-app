import {
  Building2,
  ChevronDown,
  KeyRound,
  LogOut,
  MonitorDown,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { useMe } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import {
  Avatar,
  cx,
  IconButton,
  Logo,
  MenuItems,
  Popover,
  PreferencesControls,
  pwaInstall,
  useCanOfferInstall,
} from '@/ui';
import { AssistantMenu } from './AssistantMenu';
import { TourButton } from '../../tour/TourButton';

export function Topbar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const canInstall = useCanOfferInstall();
  const { data: me } = useMe();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-line bg-surface/85 px-3 backdrop-blur-md sm:px-5">
      <NavLink to="/" aria-label="Solvia" className="lg:hidden">
        <Logo />
      </NavLink>
      {/* Wrapped: IconButton's own inline-flex would override a `hidden` class. */}
      <span className="hidden lg:block">
        <IconButton
          label={collapsed ? t('nav.expand') : t('nav.collapse')}
          onClick={onToggleCollapsed}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </IconButton>
      </span>

      {me?.tenant && (
        <span className="ml-1 hidden min-w-0 items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-medium text-muted sm:inline-flex">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{me.tenant.name}</span>
        </span>
      )}

      <div className="ml-auto flex items-center gap-1">
        <TourButton className="mr-1" />
        <AssistantMenu />

        <PreferencesControls />

        <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden="true" />

        <Popover
          width={260}
          trigger={({ toggle, ref, open }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-label={t('topbar.account')}
              className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 transition hover:bg-surface-3"
            >
              <Avatar name={user?.name ?? '?'} size="sm" />
              <span className="hidden text-left leading-tight md:block">
                <span className="block max-w-36 truncate text-sm font-medium text-ink">
                  {user?.name}
                </span>
                <span className="block text-[11px] text-muted">
                  {user ? t(`roles.${user.role}`) : ''}
                </span>
              </span>
              <ChevronDown
                className={cx(
                  'hidden h-4 w-4 text-subtle transition md:block',
                  open && 'rotate-180',
                )}
              />
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="flex items-center gap-3 border-b border-line px-2.5 pt-1.5 pb-3">
                <Avatar name={user?.name ?? '?'} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user?.name}</p>
                  <p className="truncate text-xs text-muted">{user?.email}</p>
                  <p className="truncate text-xs text-subtle">
                    {user ? t(`roles.${user.role}`) : ''} · {me?.tenant.name}
                  </p>
                </div>
              </div>
              <div className="pt-1.5">
                <MenuItems
                  close={close}
                  items={[
                    {
                      label: t('nav.settings'),
                      icon: <Settings />,
                      onSelect: () => navigate('/settings'),
                    },
                    {
                      label: t('topbar.changePassword'),
                      icon: <KeyRound />,
                      onSelect: () => navigate('/change-password'),
                    },
                    {
                      label: t('pwa.menu'),
                      icon: <MonitorDown />,
                      onSelect: pwaInstall.openGuide,
                      hidden: !canInstall,
                    },
                    { label: t('topbar.logout'), icon: <LogOut />, onSelect: logout, danger: true },
                  ]}
                />
              </div>
            </>
          )}
        </Popover>
      </div>
    </header>
  );
}
