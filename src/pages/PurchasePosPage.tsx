import { SAVE_KEY_LABEL, SEARCH_KEY_LABEL } from '../components/pos/keys';
import { PosScreen } from '../components/pos/PosScreen';
import { PurchasePos } from '../components/pos/PurchasePos';
import { useI18n } from '../i18n/I18nProvider';

/** "Nueva compra": the goods that arrived, as a point-of-sale screen (`/purchases/new`). */
export function PurchasePosPage() {
  const { t } = useI18n();
  return (
    <PosScreen
      title={t('purchases.form.title')}
      backTo="/purchases"
      backLabel={t('nav.purchases')}
      keys={t('purchases.pos.keys', { save: SAVE_KEY_LABEL, search: SEARCH_KEY_LABEL })}
    >
      {({ onDirty, leave }) => <PurchasePos onClose={leave} onDirty={onDirty} />}
    </PosScreen>
  );
}
