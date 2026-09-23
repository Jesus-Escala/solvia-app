import { useState, type FormEvent } from 'react';
import { useCustomers, useSaveReceivable } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import { useErrorText, Alert, Button, Field, Modal, useFeedback } from '@/ui';
import type { Receivable } from '../../lib/types';
import { addDaysIso, todayIso } from './dueLabel';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Preselects (and locks) the customer, e.g. from the customer detail page. */
  customerId?: string;
  receivable?: Receivable;
}

export function ReceivableFormModal({ open, onClose, customerId, receivable }: Props) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      title={receivable ? t('receivables.form.titleEdit') : t('receivables.form.titleNew')}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {open && <ReceivableForm onClose={onClose} customerId={customerId} receivable={receivable} />}
    </Modal>
  );
}

function ReceivableForm({ onClose, customerId, receivable }: Omit<Props, 'open'>) {
  const { t } = useI18n();
  const errors = useErrorText();
  const { toast } = useFeedback();
  const save = useSaveReceivable(receivable?.id);
  const locked = Boolean(customerId || receivable);
  const customers = useCustomers({ page: 1, pageSize: 100 });
  const today = todayIso();
  const [form, setForm] = useState({
    customerId: receivable?.customerId ?? customerId ?? '',
    description: receivable?.description ?? '',
    totalAmount: receivable ? String(receivable.totalAmount) : '',
    issueDate: receivable?.issueDate ?? today,
    dueDate: receivable?.dueDate ?? addDaysIso(today, 30),
  });
  const update = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await save.mutateAsync({ ...form, totalAmount: Number(form.totalAmount) });
    toast.success(receivable ? t('receivables.updated') : t('receivables.created'));
    onClose();
  };

  return (
    <form onSubmit={(event) => void submit(event).catch(() => undefined)} className="space-y-4">
      {save.error && !errors.hasFieldErrors(save.error) && (
        <Alert tone="danger">{errors.message(save.error)}</Alert>
      )}
      <Field label={t('receivables.form.customer')} error={errors.field(save.error, 'customerId')}>
        {(id) => (
          <select
            id={id}
            className="input"
            required
            disabled={locked}
            value={form.customerId}
            onChange={(e) => update('customerId')(e.target.value)}
          >
            <option value="">
              {customers.isLoading
                ? t('receivables.form.loadingCustomers')
                : t('receivables.form.selectCustomer')}
            </option>
            {customers.data?.data.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
            {receivable?.customer &&
              !customers.data?.data.some((c) => c.id === receivable.customerId) && (
                <option value={receivable.customerId}>{receivable.customer.name}</option>
              )}
          </select>
        )}
      </Field>
      <Field
        label={t('receivables.form.description')}
        error={errors.field(save.error, 'description')}
      >
        {(id) => (
          <input
            id={id}
            className="input"
            required
            minLength={2}
            placeholder={t('receivables.form.descriptionPlaceholder')}
            value={form.description}
            onChange={(e) => update('description')(e.target.value)}
          />
        )}
      </Field>
      <Field
        label={t('receivables.form.totalAmount')}
        error={errors.field(save.error, 'totalAmount')}
      >
        {(id) => (
          <input
            id={id}
            className="input tabular-nums"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            required
            value={form.totalAmount}
            onChange={(e) => update('totalAmount')(e.target.value)}
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('receivables.form.issueDate')}
          error={errors.field(save.error, 'issueDate')}
        >
          {(id) => (
            <input
              id={id}
              className="input"
              type="date"
              required
              value={form.issueDate}
              onChange={(e) => update('issueDate')(e.target.value)}
            />
          )}
        </Field>
        <Field label={t('receivables.form.dueDate')} error={errors.field(save.error, 'dueDate')}>
          {(id) => (
            <input
              id={id}
              className="input"
              type="date"
              required
              min={form.issueDate}
              value={form.dueDate}
              onChange={(e) => update('dueDate')(e.target.value)}
            />
          )}
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={save.isPending}>
          {receivable ? t('receivables.form.save') : t('receivables.form.create')}
        </Button>
      </div>
    </form>
  );
}
