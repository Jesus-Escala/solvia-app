import { Check, UserPlus } from 'lucide-react';
import { useCustomerLookup } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import { PickedChip, SearchPicker } from './SearchPicker';

export interface PickedCustomer {
  id: string;
  name: string;
  phone: string | null;
  /** What the customer owes; null when not known (e.g. a customer created on the spot). */
  outstanding: number | null;
}

const initial = (name: string) => name.charAt(0).toUpperCase();

/**
 * Customer search box for forms: type a few letters, pick from the matches (with what they owe)
 * or, with `onCreate`, choose "Nuevo cliente «…»" to create one on the spot. It asks the light
 * `/customers/lookup` (balance computed in SQL, cached, previous request cancelled); without a
 * search the API lists the ones who owe the most first, usually who you look for.
 */
export function CustomerPicker({
  id,
  value,
  onChange,
  onCreate,
  autoFocus = false,
  disabled = false,
}: {
  id?: string;
  value: PickedCustomer | null;
  onChange: (customer: PickedCustomer | null) => void;
  /** Offered as the last option with the typed text as the new customer's name. */
  onCreate?: (name: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const { t, fmt } = useI18n();

  if (value) {
    return (
      <PickedChip
        icon={
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">
            {initial(value.name)}
          </span>
        }
        title={value.name}
        subtitle={
          value.outstanding !== null && value.outstanding > 0
            ? t('picker.owes', { amount: fmt.money(value.outstanding) })
            : null
        }
        disabled={disabled}
        onClear={() => onChange(null)}
      />
    );
  }

  return (
    <SearchPicker
      {...(id && { id })}
      autoFocus={autoFocus}
      disabled={disabled}
      placeholder={t('picker.placeholder')}
      useLookup={useCustomerLookup}
      onPick={(customer) =>
        onChange({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          outstanding: customer.outstanding,
        })
      }
      renderOption={(customer) => (
        <>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold text-muted">
            {initial(customer.name)}
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">{customer.name}</span>
          {customer.outstanding > 0 ? (
            <span className="shrink-0 text-xs text-muted tabular-nums">
              {t('picker.owes', { amount: fmt.money(customer.outstanding) })}
            </span>
          ) : (
            <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
          )}
        </>
      )}
      create={
        onCreate
          ? {
              label: (name) => t('picker.create', { name }),
              onCreate,
              icon: (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                  <UserPlus className="h-3.5 w-3.5" />
                </span>
              ),
            }
          : null
      }
      emptyText={(text) => (text ? t('picker.noResults') : t('picker.typeToSearch'))}
    />
  );
}
