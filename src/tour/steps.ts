/**
 * Guided tour definition. Each step points at an element marked with `data-tour="<target>"`
 * on the given route; texts live under `tour.steps.<id>` in the i18n dictionaries.
 * To add a step: add the attribute to the element, add an entry here and its two strings.
 * Steps with `module` are skipped when the business does not have it.
 */
import type { ModuleRequirement } from '../hooks/useModules';

type StepId =
  | 'homeActions'
  | 'quickAdd'
  | 'homeToday'
  | 'navigation'
  | 'rowActions'
  | 'customersTable'
  | 'kpis'
  | 'reminderRules'
  | 'help';

export const TOUR_STEPS: ReadonlyArray<{
  id: StepId;
  route: string | null;
  target: string;
  module?: ModuleRequirement;
  /** Only on phones (the "+" lives in the bottom bar there). */
  phoneOnly?: boolean;
}> = [
  { id: 'homeActions', route: '/', target: 'home-actions' },
  { id: 'quickAdd', route: '/', target: 'quick-add', phoneOnly: true },
  { id: 'homeToday', route: '/', target: 'home-today', module: 'collections' },
  { id: 'navigation', route: '/', target: 'nav' },
  { id: 'rowActions', route: '/receivables', target: 'receivables-table', module: 'collections' },
  { id: 'customersTable', route: '/customers', target: 'customers-table', module: 'customers' },
  { id: 'kpis', route: '/dashboard?view=collection', target: 'period', module: 'collections' },
  { id: 'reminderRules', route: '/settings', target: 'reminder-rules', module: 'collections' },
  { id: 'help', route: null, target: 'help' },
];

export type TourStep = (typeof TOUR_STEPS)[number];
