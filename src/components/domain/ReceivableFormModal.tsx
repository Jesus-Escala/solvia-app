import { useState, type FormEvent } from 'react';
import { useSaveCustomer, useSaveReceivable } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import { Button, Field, Modal, useErrorText, useErrorToast, useFeedback, TextButton } from '@/ui';
import { NewCustomerFields, type NewCustomer } from './NewCustomerFields';
import type { Receivable } from '../../lib/types';
import { CustomerPicker, type PickedCustomer } from './CustomerPicker';
import { DueDateField } from './DueDateField';
import { addDaysIso, todayIso } from './dueLabel';
import { MoneyInput } from './MoneyInput';
import { moneyText } from '../../lib/moneyText';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Preselects (and locks) the customer, e.g. from the customer detail page. */
  customer?: PickedCustomer;
  receivable?: Receivable;
}

export function ReceivableFormModal({ open, onClose, customer, receivable }: Props) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      title={receivable ? t('receivables.form.titleEdit') : t('receivables.form.titleNew')}
      {...(!receivable && { description: t('receivables.form.intro') })}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {open && <ReceivableForm onClose={onClose} customer={customer} receivable={receivable} />}
    </Modal>
  );
}

/**
 * Note a sale on credit in as few steps as possible: who (search or create on the spot), how much,
 * what they took (optional) and when they pay (shortcuts). The sale date defaults to today.
 */
function ReceivableForm({ onClose, customer: preset, receivable }: Omit<Props, 'open'>) {
  const { t } = useI18n();
  const errors = useErrorText();
  const { toast } = useFeedback();
  const save = useSaveReceivable(receivable?.id);
  const saveCustomer = useSaveCustomer();
  const editing = Boolean(receivable);
  const today = todayIso();

  const [customer, setCustomer] = useState<PickedCustomer | null>(
    preset ??
      (receivable
        ? {
            id: receivable.customerId,
            name: receivable.customer?.name ?? '',
            phone: receivable.customer?.phone ?? null,
            outstanding: null,
          }
        : null),
  );
  // A customer created from this form (name typed in the search box).
  const [newCustomer, setNewCustomer] = useState<NewCustomer | null>(null);
  const [amount, setAmount] = useState(receivable ? moneyText(receivable.totalAmount) : '');
  const [description, setDescription] = useState(receivable?.description ?? '');
  const [issueDate, setIssueDate] = useState(receivable?.issueDate ?? today);
  const [dueDate, setDueDate] = useState(receivable?.dueDate ?? addDaysIso(today, 7));
  const [changeIssue, setChangeIssue] = useState(editing);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    let customerId = customer?.id;
    if (!customerId && newCustomer) {
      const created = await saveCustomer.mutateAsync({
        name: newCustomer.name,
        phone: newCustomer.phone,
      });
      customerId = created.id;
      setCustomer({ id: created.id, name: created.name, phone: created.phone, outstanding: 0 });
      setNewCustomer(null);
    }
    if (!customerId) {
      toast.warning(t('receivables.form.pickCustomer'));
      return;
    }
    await save.mutateAsync({
      customerId,
      description: description.trim() || t('receivables.form.defaultDescription'),
      totalAmount: Number(amount),
      issueDate,
      dueDate,
    });
    toast.success(receivable ? t('receivables.updated') : t('receivables.created'));
    onClose();
  };

  useErrorToast(save.error ?? saveCustomer.error);

  return (
    <form onSubmit={(event) => void submit(event).catch(() => null)} className="space-y-5">
      <Field label={t('receivables.form.customer')} error={errors.field(save.error, 'customerId')}>
        {(id) =>
          newCustomer ? (
            <NewCustomerFields
              id={id}
              value={newCustomer}
              onChange={setNewCustomer}
              onCancel={() => setNewCustomer(null)}
              phoneInvalid={Boolean(errors.field(saveCustomer.error, 'phone'))}
            />
          ) : (
            <CustomerPicker
              id={id}
              value={customer}
              disabled={Boolean(preset) || editing}
              autoFocus={!preset && !editing}
              onChange={setCustomer}
              onCreate={(name) => setNewCustomer({ name, phone: '' })}
            />
          )
        }
      </Field>

      <Field
        label={t('receivables.form.totalAmount')}
        error={errors.field(save.error, 'totalAmount')}
      >
        {(id) => (
          <MoneyInput
            id={id}
            size="lg"
            required
            autoFocus={Boolean(preset)}
            value={amount}
            onChange={setAmount}
          />
        )}
      </Field>

      <Field
        label={t('receivables.form.description')}
        optionalLabel={t('common.optional')}
        error={errors.field(save.error, 'description')}
      >
        {(id) => (
          <input
            id={id}
            className="input"
            maxLength={255}
            placeholder={t('receivables.form.descriptionPlaceholder')}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        )}
      </Field>

      <Field label={t('receivables.form.dueDate')} error={errors.field(save.error, 'dueDate')}>
        {(id) => (
          <DueDateField
            id={id}
            from={issueDate}
            value={dueDate}
            onChange={setDueDate}
            initialCustom={editing}
          />
        )}
      </Field>

      {changeIssue ? (
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
              max={today}
              value={issueDate}
              onChange={(event) => setIssueDate(event.target.value)}
            />
          )}
        </Field>
      ) : (
        <p className="text-xs text-muted">
          {t('receivables.form.soldToday')}{' '}
          <TextButton onClick={() => setChangeIssue(true)}>
            {t('receivables.form.changeDate')}
          </TextButton>
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={save.isPending || saveCustomer.isPending}>
          {receivable ? t('receivables.form.save') : t('receivables.form.create')}
        </Button>
      </div>
    </form>
  );
}
