import type { TenantModule } from '../lib/types';
import { useMe } from './queries';

/**
 * Which modules the business pays for (enabled from the backoffice): Cobranza, Ventas and
 * Inventario, any of them alone or together. Two shared capabilities come with them: the product
 * catalog (with Ventas or Inventario) and customers (with Cobranza or Ventas). While the profile
 * loads everything reads as disabled.
 */
export function useModules() {
  const { data: me, isLoading } = useMe();
  const modules: TenantModule[] = me?.tenant.modules ?? [];
  const collections = modules.includes('collections');
  const sales = modules.includes('sales');
  const inventory = modules.includes('inventory');
  return {
    loading: isLoading,
    collections,
    sales,
    inventory,
    catalog: sales || inventory,
    customers: collections || sales,
  };
}

export type Modules = ReturnType<typeof useModules>;
/** A module or a shared capability, as pages and menu items ask for them. */
export type ModuleRequirement = Exclude<keyof Modules, 'loading'>;
