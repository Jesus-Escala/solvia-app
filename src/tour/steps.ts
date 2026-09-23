/**
 * Guided tour definition. Each step points at an element marked with `data-tour="<target>"`
 * on the given route; texts live under `tour.steps.<id>` in the i18n dictionaries.
 * To add a step: add the attribute to the element, add an entry here and its two strings.
 */
export const TOUR_STEPS = [
  { id: 'navigation', route: '/', target: 'nav' },
  { id: 'kpis', route: '/?view=summary', target: 'kpis' },
  { id: 'period', route: '/?view=collection', target: 'period' },
  { id: 'cashFlow', route: '/?view=projection', target: 'cash-flow' },
  { id: 'debtors', route: '/?view=portfolio', target: 'debtors' },
  { id: 'newCustomer', route: '/customers', target: 'new-customer' },
  { id: 'customersTable', route: '/customers', target: 'customers-table' },
  { id: 'statusFilter', route: '/receivables', target: 'status-filter' },
  { id: 'rowActions', route: '/receivables', target: 'receivables-table' },
  { id: 'reminderRules', route: '/settings', target: 'reminder-rules' },
  { id: 'preferences', route: null, target: 'preferences' },
  { id: 'help', route: null, target: 'help' },
] as const;

export type TourStep = (typeof TOUR_STEPS)[number];
