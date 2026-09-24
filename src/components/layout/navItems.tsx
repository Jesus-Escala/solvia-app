import { BarChart3, CircleHelp, Home, ReceiptText, Settings, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import type { TranslationKey } from '../../i18n/I18nProvider';

/**
 * Main navigation, shared by the desktop sidebar and the mobile bottom bar. The bottom bar only
 * shows the `mobile` items (plus the "+" button in the middle); settings and help are in the top
 * bar there (account menu and Bowl).
 */
export const NAV_ITEMS: Array<{
  to: string;
  label: TranslationKey;
  icon: ReactNode;
  end?: boolean;
  mobile?: boolean;
}> = [
  { to: '/', label: 'nav.home', icon: <Home />, end: true, mobile: true },
  { to: '/receivables', label: 'nav.receivables', icon: <ReceiptText />, mobile: true },
  { to: '/customers', label: 'nav.customers', icon: <Users />, mobile: true },
  { to: '/reports', label: 'nav.reports', icon: <BarChart3 />, mobile: true },
  { to: '/settings', label: 'nav.settings', icon: <Settings /> },
  { to: '/help', label: 'nav.help', icon: <CircleHelp /> },
];
