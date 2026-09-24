/**
 * Guided tour definition. Each step points at an element marked with `data-tour="<target>"`
 * on the given route; texts live under `tour.steps.<id>` in the i18n dictionaries.
 * To add a step: add the attribute to the element, add an entry here and its two strings.
 */
export const TOUR_STEPS = [
  { id: 'homeActions', route: '/', target: 'home-actions' },
  { id: 'quickAdd', route: '/', target: 'quick-add' },
  { id: 'homeToday', route: '/', target: 'home-today' },
  { id: 'navigation', route: '/', target: 'nav' },
  { id: 'rowActions', route: '/receivables', target: 'receivables-table' },
  { id: 'customersTable', route: '/customers', target: 'customers-table' },
  { id: 'kpis', route: '/dashboard?view=collection', target: 'period' },
  { id: 'reminderRules', route: '/settings', target: 'reminder-rules' },
  { id: 'help', route: null, target: 'help' },
] as const;

export type TourStep = (typeof TOUR_STEPS)[number];
