import { Package } from 'lucide-react';
import { EmptyState, Page } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { ModulesOffer } from './ModulesOffer';

/** Shown instead of a module's page when the business does not have that module. */
export function ModuleOff() {
  const { t } = useI18n();
  return (
    <Page>
      <EmptyState
        icon={<Package className="h-5 w-5" />}
        title={t('modules.off.title')}
        description={t('modules.off.description')}
      />
      <ModulesOffer className="mx-auto w-full max-w-3xl" />
    </Page>
  );
}
