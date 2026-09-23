import { CircleHelp, LayoutDashboard, ReceiptText, Settings, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import type { TranslationKey } from '../../i18n/I18nProvider';

/** Main navigation, shared by the desktop sidebar and the mobile bottom bar. */
export const NAV_ITEMS: Array<{
  to: string;
  label: TranslationKey;
  icon: ReactNode;
  end?: boolean;
}> = [
  { to: '/', label: 'nav.dashboard', icon: <LayoutDashboard />, end: true },
  { to: '/customers', label: 'nav.customers', icon: <Users /> },
  { to: '/receivables', label: 'nav.receivables', icon: <ReceiptText /> },
  { to: '/settings', label: 'nav.settings', icon: <Settings /> },
  { to: '/help', label: 'nav.help', icon: <CircleHelp /> },
];
