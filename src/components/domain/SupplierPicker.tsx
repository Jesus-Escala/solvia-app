import { Truck } from 'lucide-react';
import { useSupplierLookup } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { SupplierOption } from '../../lib/types';
import { PickedChip, SearchPicker } from './SearchPicker';

/**
 * Supplier search box: pick one from the light lookup, or "Nuevo proveedor «…»" to create it
 * with just its name (RUC and WhatsApp can be added later from Proveedores).
 */
export function SupplierPicker({
  id,
  value,
  onChange,
  onCreate,
}: {
  id: string;
  value: SupplierOption | null;
  onChange: (supplier: SupplierOption | null) => void;
  onCreate: (name: string) => void;
}) {
  const { t } = useI18n();

  if (value !== null) {
    return (
      <PickedChip
        icon={<Truck className="h-4 w-4 shrink-0 text-primary-ink" />}
        title={value.name}
        onClear={() => onChange(null)}
      />
    );
  }

  return (
    <SearchPicker
      id={id}
      placeholder={t('purchases.form.supplierPlaceholder')}
      useLookup={useSupplierLookup}
      onPick={onChange}
      renderOption={(supplier) => (
        <>
          <Truck className="h-4 w-4 shrink-0 text-subtle" />
          <span className="min-w-0 flex-1 truncate font-medium">{supplier.name}</span>
        </>
      )}
      create={{ label: (name) => t('purchases.form.newSupplier', { name }), onCreate }}
      emptyText={() => t('purchases.form.noSuppliers')}
    />
  );
}
