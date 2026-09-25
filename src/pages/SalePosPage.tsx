import { SAVE_KEY_LABEL, SEARCH_KEY_LABEL } from '../components/pos/keys';
import { useLocation } from 'react-router';
import type { PickedCustomer } from '../components/domain/CustomerPicker';
import { PosScreen } from '../components/pos/PosScreen';
import { SalePos } from '../components/pos/SalePos';
import { useI18n } from '../i18n/I18nProvider';
import { useState } from 'react';

/** "Nueva venta": the point of sale as its own screen (`/sales/new`). */
export function SalePosPage() {
  const { t } = useI18n();
  const location = useLocation();
  // A customer can come with the link (e.g. "Vender" from a customer's page).
  const preset = (location.state as { customer?: PickedCustomer } | null)?.customer;
  // A new key starts an empty sale ("Nueva venta" after saving one).
  const [round, setRound] = useState(0);
  return (
    <PosScreen
      title={t('sales.form.title')}
      backTo="/sales"
      backLabel={t('nav.sales')}
      keys={t('sales.pos.keys', { save: SAVE_KEY_LABEL, search: SEARCH_KEY_LABEL })}
    >
      {({ onDirty, leave }) => (
        <SalePos
          key={round}
          onClose={leave}
          onDirty={onDirty}
          onAnother={() => setRound((value) => value + 1)}
          {...(preset && round === 0 && { preset })}
        />
      )}
    </PosScreen>
  );
}
