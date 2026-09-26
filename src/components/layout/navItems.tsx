import {
  BarChart3,
  CircleHelp,
  FileSpreadsheet,
  Home,
  Map,
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
import type { ModuleRequirement, Modules } from '../../hooks/useModules';

export interface NavItem {
  to: string;
  label: TranslationKey;
  icon: ReactNode;
  end?: boolean;
  /** Only shown when the business has this module (see `useModules`). */
  module?: ModuleRequirement;
  /** An extra condition on the modules (e.g. where a shared page goes). */
  when?: (modules: Modules) => boolean;
}

export interface NavSection {
  /** Heading shown above the group; null for the first (Inicio). */
  title: TranslationKey | null;
  items: NavItem[];
}

/**
 * The whole navigation, grouped by area of the business: Comercial (selling, customers),
 * Cobranza (what is owed), Inventario (products, purchases, suppliers) and Resultados
 * (dashboard charts, with Cobranza, and tabular reports). Settings and help go at the bottom.
 * Items of a module the business does not have are left out (see `visibleSections`).
 */
export const NAV_SECTIONS: NavSection[] = [
  { title: null, items: [{ to: '/', label: 'nav.home', icon: <Home />, end: true }] },
  {
    title: 'nav.groups.commercial',
    items: [
      { to: '/sales', label: 'nav.sales', icon: <ShoppingCart />, module: 'sales' },
      // Products serve selling and buying: next to sales when the business only sells…
      {
        to: '/products',
        label: 'nav.products',
        icon: <Package />,
        module: 'sales',
        when: (modules) => !modules.inventory,
      },
      { to: '/customers', label: 'nav.customers', icon: <Users />, module: 'customers' },
    ],
  },
  {
    title: 'nav.groups.receivables',
    items: [
      {
        to: '/receivables',
        label: 'nav.receivables',
        icon: <ReceiptText />,
        module: 'collections',
      },
    ],
  },
  {
    title: 'nav.groups.inventory',
    items: [
      // …and in Inventario (with its stock) when the business has it.
      { to: '/products', label: 'nav.products', icon: <Package />, module: 'inventory' },
      { to: '/purchases', label: 'nav.purchases', icon: <Warehouse />, module: 'inventory' },
      { to: '/suppliers', label: 'nav.suppliers', icon: <Truck />, module: 'inventory' },
    ],
  },
  {
    // Tools of every business, whatever its modules.
    title: 'nav.groups.tools',
    items: [{ to: '/locations', label: 'nav.locations', icon: <Map /> }],
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
    items: section.items.filter(
      (item) => (!item.module || modules[item.module]) && (!item.when || item.when(modules)),
    ),
  })).filter((section) => section.items.length > 0);
}

/**
 * The three places of the phone bar (the "+" goes in the middle and "Más" holds the rest): home
 * and the two most used pages of the modules the business has.
 */
export function mobileItems(modules: Modules): NavItem[] {
  const all = NAV_SECTIONS.flatMap((section) => section.items);
  const pick = (to: string) => all.find((item) => item.to === to)!;
  const main = [
    modules.sales && '/sales',
    modules.collections && '/receivables',
    modules.inventory && !modules.sales && '/products',
    modules.inventory && !modules.sales && '/purchases',
    '/customers',
  ].filter((to): to is string => Boolean(to) && (to !== '/customers' || modules.customers));
  return [pick('/'), ...main.slice(0, 2).map(pick)];
}
