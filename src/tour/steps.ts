/**
 * Guided tours, one per section (the "Recorrido" button in the top bar). Each step points at an
 * element marked with `data-tour="<target>"`; a tour runs on the page you are on and shows only
 * the steps whose element is on screen (so a module or a phone layout without that element just
 * skips it). Texts under `tour.sections.<tour>.<id>`; the section's name is `tour.names.<tour>`.
 *
 * To add a step: mark the element, add an entry here and its two strings (es + en). Kit
 * elements carry generic targets: `page-title`, `page-actions`, `table-search`,
 * `table-filters`, `table-columns` and `table`.
 */
import type { ModuleRequirement } from '../hooks/useModules';

export interface TourStepDef {
  id: string;
  target: string;
  module?: ModuleRequirement;
  /** Only on phones (e.g. the "+" lives in the bottom bar there). */
  phoneOnly?: boolean;
}

export type SectionTourId =
  | 'home'
  | 'sales'
  | 'salePos'
  | 'purchases'
  | 'purchasePos'
  | 'customers'
  | 'customerDetail'
  | 'receivables'
  | 'products'
  | 'suppliers'
  | 'locations'
  | 'dashboard'
  | 'reports'
  | 'settings'
  | 'help';

const intro = { id: 'intro', target: 'page-title' };
const list = [
  { id: 'search', target: 'table-search' },
  { id: 'filters', target: 'table-filters' },
  { id: 'table', target: 'table' },
  { id: 'columns', target: 'table-columns' },
];

/** The steps of each section's tour, in order (missing elements are skipped). */
export const SECTION_TOURS: Record<SectionTourId, ReadonlyArray<TourStepDef>> = {
  home: [
    { id: 'actions', target: 'home-actions' },
    { id: 'quickAdd', target: 'quick-add', phoneOnly: true },
    { id: 'today', target: 'home-today' },
    { id: 'navigation', target: 'nav' },
  ],
  sales: [intro, { id: 'new', target: 'page-actions' }, ...list],
  salePos: [
    intro,
    { id: 'search', target: 'pos-search' },
    { id: 'scan', target: 'pos-scan' },
    { id: 'new', target: 'pos-new' },
    { id: 'categories', target: 'pos-categories' },
    { id: 'catalog', target: 'pos-catalog' },
    { id: 'ticket', target: 'pos-ticket' },
    { id: 'keys', target: 'pos-keys' },
  ],
  purchases: [intro, { id: 'new', target: 'page-actions' }, ...list],
  purchasePos: [
    intro,
    { id: 'search', target: 'pos-search' },
    { id: 'scan', target: 'pos-scan' },
    { id: 'new', target: 'pos-new' },
    { id: 'catalog', target: 'pos-catalog' },
    { id: 'ticket', target: 'pos-ticket' },
    { id: 'keys', target: 'pos-keys' },
  ],
  customers: [intro, { id: 'new', target: 'page-actions' }, ...list],
  customerDetail: [intro, { id: 'actions', target: 'page-actions' }],
  receivables: [intro, { id: 'new', target: 'page-actions' }, ...list],
  products: [intro, { id: 'actions', target: 'page-actions' }, ...list],
  suppliers: [intro, { id: 'new', target: 'page-actions' }, ...list],
  locations: [
    intro,
    { id: 'new', target: 'page-actions' },
    { id: 'panes', target: 'loc-panes' },
    { id: 'mark', target: 'loc-mark' },
    { id: 'view', target: 'loc-view' },
    { id: 'stage', target: 'loc-stage' },
    { id: 'panel', target: 'loc-panel' },
  ],
  dashboard: [
    intro,
    { id: 'views', target: 'dashboard-views' },
    { id: 'period', target: 'period' },
  ],
  reports: [
    intro,
    { id: 'chooser', target: 'report-chooser' },
    { id: 'toolbar', target: 'report-toolbar' },
    { id: 'search', target: 'table-search' },
    { id: 'table', target: 'table' },
  ],
  settings: [
    intro,
    { id: 'tabs', target: 'settings-tabs' },
    { id: 'reminders', target: 'reminder-rules' },
  ],
  help: [intro],
};

/** Where each section lives (to start its tour from the help center) and the module it needs. */
export const SECTION_ROUTES: Record<
  SectionTourId,
  { route: string; module?: ModuleRequirement } | null
> = {
  home: { route: '/' },
  sales: { route: '/sales', module: 'sales' },
  salePos: { route: '/sales/new', module: 'sales' },
  purchases: { route: '/purchases', module: 'inventory' },
  purchasePos: { route: '/purchases/new', module: 'inventory' },
  customers: { route: '/customers', module: 'customers' },
  customerDetail: null,
  receivables: { route: '/receivables', module: 'collections' },
  products: { route: '/products', module: 'catalog' },
  suppliers: { route: '/suppliers', module: 'inventory' },
  locations: { route: '/locations', module: 'inventory' },
  dashboard: { route: '/dashboard' },
  reports: { route: '/reports' },
  settings: { route: '/settings' },
  help: null,
};

/** The section tour of a page (by its path). */
export function tourForPath(pathname: string): SectionTourId {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return 'home';
  if (path === '/sales/new') return 'salePos';
  if (path === '/purchases/new') return 'purchasePos';
  if (path.startsWith('/customers/')) return 'customerDetail';
  const first = path.split('/')[1];
  const byPath: Record<string, SectionTourId> = {
    sales: 'sales',
    purchases: 'purchases',
    customers: 'customers',
    receivables: 'receivables',
    products: 'products',
    suppliers: 'suppliers',
    locations: 'locations',
    dashboard: 'dashboard',
    reports: 'reports',
    settings: 'settings',
    help: 'help',
  };
  return byPath[first ?? ''] ?? 'home';
}
