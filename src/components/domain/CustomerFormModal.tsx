import { useState, type FormEvent } from 'react';
import { useSaveCustomer } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import { useErrorText, Button, Field, Modal, PhoneInput, useFeedback, useErrorToast } from '@/ui';
import type { Customer } from '../../lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  customer?: Customer;
  onSaved?: (customer: Customer) => void;
}

export function CustomerFormModal({ open, onClose, customer, onSaved }: Props) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      title={customer ? t('customers.form.titleEdit') : t('customers.form.titleNew')}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {open && <CustomerForm customer={customer} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

function CustomerForm({ customer, onClose, onSaved }: Omit<Props, 'open'>) {
  const { t } = useI18n();
  const errors = useErrorText();
  const { toast } = useFeedback();
  const save = useSaveCustomer(customer?.id);
  const [form, setForm] = useState({
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    documentId: customer?.documentId ?? '',
    notes: customer?.notes ?? '',
  });
  const update = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const saved = await save.mutateAsync({
      name: form.name,
      phone: form.phone,
      documentId: form.documentId || null,
      notes: form.notes || null,
    });
    toast.success(customer ? t('customers.updated') : t('customers.created'));
    onSaved?.(saved);
    onClose();
  };

  useErrorToast(save.error);

  return (
    <form onSubmit={(event) => void submit(event).catch(() => undefined)} className="space-y-4">
      <Field label={t('customers.form.name')} error={errors.field(save.error, 'name')}>
        {(id, describedBy) => (
          <input
            id={id}
            aria-describedby={describedBy}
            className="input"
            required
            minLength={2}
            autoFocus
            value={form.name}
            onChange={(e) => update('name')(e.target.value)}
          />
        )}
      </Field>
      <Field
        label={t('customers.form.phone')}
        hint={t('customers.form.phoneHint')}
        error={errors.field(save.error, 'phone')}
      >
        {(id, describedBy) => (
          <PhoneInput
            id={id}
            describedBy={describedBy}
            required
            invalid={Boolean(errors.field(save.error, 'phone'))}
            value={form.phone}
            onChange={update('phone')}
          />
        )}
      </Field>
      <Field
        label={t('customers.form.documentId')}
        optionalLabel={t('common.optional')}
        hint={t('customers.form.documentHint')}
        error={errors.field(save.error, 'documentId')}
      >
        {(id, describedBy) => (
          <input
            id={id}
            aria-describedby={describedBy}
            className="input"
            value={form.documentId}
            onChange={(e) => update('documentId')(e.target.value)}
          />
        )}
      </Field>
      <Field
        label={t('customers.form.notes')}
        optionalLabel={t('common.optional')}
        error={errors.field(save.error, 'notes')}
      >
        {(id) => (
          <textarea
            id={id}
            className="input"
            rows={3}
            value={form.notes}
            onChange={(e) => update('notes')(e.target.value)}
          />
        )}
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={save.isPending}>
          {customer ? t('customers.form.save') : t('customers.form.create')}
        </Button>
      </div>
    </form>
  );
}
