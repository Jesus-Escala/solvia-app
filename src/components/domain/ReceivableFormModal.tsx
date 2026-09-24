import { CalendarDays } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useSaveCustomer, useSaveReceivable } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import {
  Button,
  cx,
  Field,
  Modal,
  PhoneInput,
  useErrorText,
  useErrorToast,
  useFeedback,
} from '@/ui';
import type { Receivable } from '../../lib/types';
import { CustomerPicker, type PickedCustomer } from './CustomerPicker';
import { addDaysIso, todayIso } from './dueLabel';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Preselects (and locks) the customer, e.g. from the customer detail page. */
  customer?: PickedCustomer;
  receivable?: Receivable;
}

/** "When will they pay?" shortcuts, in days from the day of the sale. */
const DUE_SHORTCUTS = [7, 15, 30] as const;

export function ReceivableFormModal({ open, onClose, customer, receivable }: Props) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      title={receivable ? t('receivables.form.titleEdit') : t('receivables.form.titleNew')}
      description={receivable ? undefined : t('receivables.form.intro')}
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
  const { t, fmt } = useI18n();
  const errors = useErrorText();
  const { toast } = useFeedback();
  const save = useSaveReceivable(receivable?.id);
  const saveCustomer = useSaveCustomer();
  const editing = Boolean(receivable);
  const today = todayIso();
  const phoneId = useId();

  const [customer, setCustomer] = useState<PickedCustomer | null>(
    preset ??
      (receivable ? { id: receivable.customerId, name: receivable.customer?.name ?? '' } : null),
  );
  // A customer created from this form (name typed in the search box).
  const [newCustomer, setNewCustomer] = useState<{ name: string; phone: string } | null>(null);
  const [amount, setAmount] = useState(receivable ? String(receivable.totalAmount) : '');
  const [description, setDescription] = useState(receivable?.description ?? '');
  const [issueDate, setIssueDate] = useState(receivable?.issueDate ?? today);
  const [dueDate, setDueDate] = useState(receivable?.dueDate ?? addDaysIso(today, 7));
  const [customDue, setCustomDue] = useState(editing);
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
      setCustomer({ id: created.id, name: created.name });
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
    <form onSubmit={(event) => void submit(event).catch(() => undefined)} className="space-y-5">
      <Field label={t('receivables.form.customer')} error={errors.field(save.error, 'customerId')}>
        {(id) =>
          newCustomer ? (
            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary-soft/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-primary-ink">
                  {t('receivables.form.newCustomer')}
                </p>
                <button
                  type="button"
                  onClick={() => setNewCustomer(null)}
                  className="text-xs font-medium text-primary-ink hover:underline"
                >
                  {t('receivables.form.searchInstead')}
                </button>
              </div>
              <input
                id={id}
                className="input"
                required
                minLength={2}
                aria-label={t('customers.form.name')}
                value={newCustomer.name}
                onChange={(event) => setNewCustomer({ ...newCustomer, name: event.target.value })}
              />
              <div>
                <PhoneInput
                  id={phoneId}
                  required
                  invalid={Boolean(errors.field(saveCustomer.error, 'phone'))}
                  value={newCustomer.phone}
                  onChange={(phone) => setNewCustomer({ ...newCustomer, phone })}
                />
                <p className="mt-1 text-xs text-muted">{t('receivables.form.phoneWhy')}</p>
              </div>
            </div>
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
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-muted">
              S/
            </span>
            <input
              id={id}
              className="input pl-9 text-lg font-semibold tabular-nums"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              required
              autoFocus={Boolean(preset)}
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
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
          <div className="space-y-2">
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={t('receivables.form.dueDate')}
            >
              {DUE_SHORTCUTS.map((days) => {
                const date = addDaysIso(issueDate, days);
                const selected = !customDue && dueDate === date;
                return (
                  <button
                    key={days}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setCustomDue(false);
                      setDueDate(date);
                    }}
                    className={cx(
                      'rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
                      selected
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-line bg-surface hover:border-primary/50',
                    )}
                  >
                    {t(`receivables.form.in${days}`)}
                  </button>
                );
              })}
              <button
                type="button"
                aria-pressed={customDue}
                onClick={() => setCustomDue(true)}
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
                  customDue
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-line bg-surface hover:border-primary/50',
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                {t('receivables.form.otherDate')}
              </button>
            </div>
            {customDue && (
              <input
                id={id}
                className="input"
                type="date"
                required
                min={issueDate}
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            )}
            <p className="text-xs text-muted">
              {t('receivables.form.paysOn', { date: fmt.date(dueDate) })}
            </p>
          </div>
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
          <button
            type="button"
            onClick={() => setChangeIssue(true)}
            className="font-medium text-primary-ink hover:underline"
          >
            {t('receivables.form.changeDate')}
          </button>
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
