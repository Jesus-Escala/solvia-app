import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { useCompanyLanguage } from '../../hooks/useCompanyLanguage';
import { useMe } from '../../hooks/queries';
import { ApiError } from '../../lib/api';
import { QuickActionsProvider } from '../quick/QuickActions';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { PageFrame } from './PageErrorBoundary';

const COLLAPSED_KEY = 'solvia.sidebar.collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Authenticated app frame. The shell is exactly the viewport height; only <main> scrolls, which
 * lets pages built with <Page fill> give their table the remaining height without page scroll.
 */
export function AppShell() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const { logout } = useAuth();
  const me = useMe();
  // The app speaks the company's language (applied at sign-in and when an admin changes it).
  useCompanyLanguage();

  // A token can outlive its user or tenant (e.g. after a data reset): end that session.
  useEffect(() => {
    if (me.error instanceof ApiError && (me.error.status === 401 || me.error.status === 404)) {
      logout();
    }
  }, [me.error, logout]);

  const toggleCollapsed = () =>
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, value ? '0' : '1');
      } catch {
        // Not persisted.
      }
      return !value;
    });

  return (
    <QuickActionsProvider>
      <div className="flex h-dvh overflow-hidden">
        <Sidebar collapsed={collapsed} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            <PageFrame>
              <Outlet />
            </PageFrame>
          </main>
          <BottomNav />
        </div>
      </div>
    </QuickActionsProvider>
  );
}
