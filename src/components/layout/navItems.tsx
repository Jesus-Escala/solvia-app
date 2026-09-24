import {
  BarChart3,
  CircleHelp,
  FileSpreadsheet,
  Home,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { TranslationKey } from '../../i18n/I18nProvider';
import type { useModules } from '../../hooks/useModules';

type Modules = ReturnType<typeof useModules>;

export interface NavItem {
  to: string;
  label: TranslationKey;
  icon: ReactNode;
  end?: boolean;
  /** Only shown when the business has this module (see `useModules`). */
  module?: 'catalog' | 'sales' | 'inventory';
}

export interface NavSection {
  /** Heading shown above the group; null for the first (Inicio). */
  title: TranslationKey | null;
  items: NavItem[];
}

/**
 * The whole navigation, grouped by area of the business: Comercial (selling, customers),
 * Cuentas por cobrar (what is owed), Inventario (products, purchases, suppliers) and Resultados
 * (dashboard charts and tabular reports). Settings and help go at the bottom.
 * Items of a module the business does not have are left out (see `visibleSections`).
 */
export const NAV_SECTIONS: NavSection[] = [
  { title: null, items: [{ to: '/', label: 'nav.home', icon: <Home />, end: true }] },
  {
    title: 'nav.groups.commercial',
    items: [
      { to: '/sales', label: 'nav.sales', icon: <ShoppingCart />, module: 'sales' },
      { to: '/customers', label: 'nav.customers', icon: <Users /> },
    ],
  },
  {
    title: 'nav.groups.receivables',
    items: [{ to: '/receivables', label: 'nav.receivables', icon: <ReceiptText /> }],
  },
  {
    title: 'nav.groups.inventory',
    items: [
      { to: '/products', label: 'nav.products', icon: <Package />, module: 'catalog' },
      { to: '/purchases', label: 'nav.purchases', icon: <Warehouse />, module: 'inventory' },
      { to: '/suppliers', label: 'nav.suppliers', icon: <Truck />, module: 'inventory' },
    ],
  },
  {
    title: 'nav.groups.numbers',
    items: [
      { to: '/dashboard', label: 'nav.dashboard', icon: <BarChart3 /> },
      { to: '/reports', label: 'nav.reports', icon: <FileSpreadsheet /> },
    ],
  },
];

/** Settings and help, at the bottom of the sidebar and of the "Más" sheet. */
export const NAV_FOOTER: NavItem[] = [
  { to: '/settings', label: 'nav.settings', icon: <Settings /> },
  { to: '/help', label: 'nav.help', icon: <CircleHelp /> },
];

/** Sections with only the items of enabled modules (empty sections disappear). */
export function visibleSections(modules: Modules): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.module || modules[item.module]),
  })).filter((section) => section.items.length > 0);
}

/**
 * The four places of the phone bar (the "+" goes in the middle and "Más" holds the rest).
 * With the sales module, selling comes first; otherwise what is owed and the customers.
 */
export function mobileItems(modules: Modules): NavItem[] {
  const all = NAV_SECTIONS.flatMap((section) => section.items);
  const pick = (to: string) => all.find((item) => item.to === to)!;
  return modules.sales
    ? [pick('/'), pick('/sales'), pick('/receivables')]
    : [pick('/'), pick('/receivables'), pick('/customers')];
}
