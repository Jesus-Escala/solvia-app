import type { TenantModule } from '../lib/types';
import { useMe } from './queries';

/**
 * Which optional modules the business has (enabled from the backoffice). The product catalog is
 * available with any of them. While the profile loads everything reads as disabled.
 */
export function useModules() {
  const { data: me, isLoading } = useMe();
  const modules: TenantModule[] = me?.tenant.modules ?? [];
  return {
    loading: isLoading,
    sales: modules.includes('sales'),
    inventory: modules.includes('inventory'),
    catalog: modules.length > 0,
  };
}
