import { createContext, useContext } from 'react';
import type { PickedCustomer } from '../domain/CustomerPicker';

export type QuickAction = 'sale' | 'receivable' | 'payment' | 'customer';

export interface QuickActionsValue {
  /** Opens one of the everyday forms from anywhere, optionally for a given customer. */
  open: (action: QuickAction, customer?: PickedCustomer) => void;
}

export const QuickActionsContext = createContext<QuickActionsValue | null>(null);

/** The global "note a sale on credit / record a payment / new customer" forms. */
export function useQuickActions() {
  const value = useContext(QuickActionsContext);
  if (!value) throw new Error('useQuickActions must be used inside <QuickActionsProvider>');
  return value;
}
