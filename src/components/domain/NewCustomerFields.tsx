import { useId } from 'react';
import { PhoneInput, TextButton } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';

export interface NewCustomer {
  name: string;
  phone: string;
}

/**
 * Name + WhatsApp of a customer created on the spot from a form (the picker's "create" option),
 * with a link to go back to searching. `id` goes on the name input (the field's label).
 */
export function NewCustomerFields({
  id,
  value,
  onChange,
  onCancel,
  phoneInvalid = false,
}: {
  id: string;
  value: NewCustomer;
  onChange: (value: NewCustomer) => void;
  onCancel: () => void;
  phoneInvalid?: boolean;
}) {
  const { t } = useI18n();
  const phoneId = useId();
  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary-soft/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-primary-ink">
          {t('receivables.form.newCustomer')}
        </p>
        <TextButton size="xs" onClick={onCancel}>
          {t('receivables.form.searchInstead')}
        </TextButton>
      </div>
      <input
        id={id}
        className="input"
        required
        minLength={2}
        aria-label={t('customers.form.name')}
        value={value.name}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
      />
      <div>
        <PhoneInput
          id={phoneId}
          required
          invalid={phoneInvalid}
          value={value.phone}
          onChange={(phone) => onChange({ ...value, phone })}
        />
        <p className="mt-1 text-xs text-muted">{t('receivables.form.phoneWhy')}</p>
      </div>
    </div>
  );
}
