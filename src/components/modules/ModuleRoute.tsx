import { Outlet } from 'react-router';
import { type ModuleRequirement, useModules } from '../../hooks/useModules';
import { ModuleOff } from '../../pages/ProductsPage';

/** Routes of a module: shown only when the business has it, `ModuleOff` otherwise. */
export function ModuleRoute({ need }: { need: ModuleRequirement }) {
  const modules = useModules();
  if (!modules.loading && !modules[need]) return <ModuleOff />;
  return <Outlet />;
}
