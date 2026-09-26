import { FileCheck2, Paperclip, X } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { useRegisterPayment } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import {
  useErrorText,
  Button,
  Field,
  Modal,
  ProgressBar,
  useFeedback,
  useErrorToast,
  TextButton,
} from '@/ui';
import type { PaymentMethod, Receivable } from '../../lib/types';
import { todayIso } from './dueLabel';
import { PaymentMethodPicker } from './PaymentMethods';
import { SplitPayments } from './SplitPayments';
import { partsComplete, partsPayload, startParts, type PartDraft } from './splitParts';

const MAX_PROOF_MB = 5;

export function PaymentFormModal({
  open,
  onClose,
  receivable,
}: {
  open: boolean;
  onClose: () => void;
  receivable: Receivable | null;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open && receivable !== null}
      title={t('payment.title')}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {open && receivable && <PaymentForm receivable={receivable} onClose={onClose} />}
    </Modal>
  );
}

/** Records a payment of one receivable. Also used by the quick "Registrar pago" flow. */
export function PaymentForm({
  receivable,
  onClose,
}: {
  receivable: Receivable;
  onClose: () => void;
}) {
  const { t, fmt } = useI18n();
  const errors = useErrorText();
  const { toast } = useFeedback();
  const register = useRegisterPayment();
  const fileInput = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState(String(receivable.outstandingAmount));
  const [method, setMethod] = useState<PaymentMethod>('yape');
  // Paid with several methods at once (part in cash, part with Yape…): null with one.
  const [parts, setParts] = useState<PartDraft[] | null>(null);
  const [date, setDate] = useState(todayIso());
  const [changeDate, setChangeDate] = useState(false);
  const [proof, setProof] = useState<File | null>(null);
  const [proofError, setProofError] = useState<string>();

  const onProofChange = (file: File | null) => {
    setProofError(undefined);
    if (file && file.size > MAX_PROOF_MB * 1024 * 1024) {
      setProofError(t('payment.proofTooLarge'));
      setProof(null);
      return;
    }
    setProof(file);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (parts !== null && !partsComplete(parts, value)) {
      toast.warning(t('split.notComplete', { amount: fmt.money(value) }));
      return;
    }
    await register.mutateAsync({
      receivableId: receivable.id,
      parts: parts === null ? [{ method, amount: value }] : partsPayload(parts),
      date,
      proof,
    });
    toast.success(t('payment.success', { amount: fmt.money(value) }));
    onClose();
  };

  const numericAmount = Number(amount) || 0;
  const isFull = numericAmount >= receivable.outstandingAmount;
  const paidShare = receivable.totalAmount > 0 ? receivable.paidAmount / receivable.totalAmount : 0;

  useErrorToast(register.error);

  return (
    <form onSubmit={(event) => void submit(event).catch(() => undefined)} className="space-y-4">
      <div className="rounded-xl border border-line bg-surface-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{receivable.description}</p>
            <p className="mt-0.5 text-xs text-muted">
              {receivable.customer?.name} ·{' '}
              {t('payment.due', { date: fmt.date(receivable.dueDate) })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted">{t('payment.outstanding')}</p>
            <p className="text-lg font-semibold tabular-nums">
              {fmt.money(receivable.outstandingAmount)}
            </p>
            <p className="text-[11px] text-subtle">
              {t('payment.ofTotal', { total: fmt.money(receivable.totalAmount) })}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar
            value={paidShare}
            tone="success"
            label={t('receivables.paidPercent', { percent: fmt.percent(paidShare) })}
          />
        </div>
      </div>

      <Field
        label={t('payment.amount')}
        hint={isFull ? t('payment.full') : t('payment.partial')}
        error={errors.field(register.error, 'amount')}
      >
        {(id, describedBy) => (
          <div className="space-y-2">
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-muted">
                S/
              </span>
              <input
                id={id}
                aria-describedby={describedBy}
                className="input pl-9 text-lg font-semibold tabular-nums"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                max={receivable.outstandingAmount}
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {!isFull && (
              <TextButton size="xs" onClick={() => setAmount(String(receivable.outstandingAmount))}>
                {t('payment.payAll', { amount: fmt.money(receivable.outstandingAmount) })}
              </TextButton>
            )}
          </div>
        )}
      </Field>

      <div>
        <p className="label">{t('payment.method')}</p>
        {parts === null ? (
          <PaymentMethodPicker label={t('payment.method')} value={method} onChange={setMethod} />
        ) : (
          <div className="space-y-2 rounded-xl border border-line p-3">
            <p className="text-xs text-muted">{t('split.hint')}</p>
            <SplitPayments parts={parts} onChange={setParts} target={numericAmount} />
          </div>
        )}
        <TextButton
          size="xs"
          className="mt-2"
          onClick={() => setParts(parts === null ? startParts(numericAmount, 'cash') : null)}
        >
          {parts === null ? t('split.toggle') : t('split.single')}
        </TextButton>
      </div>

      <div>
        <p className="label">
          {t('payment.proof')}{' '}
          <span className="font-normal text-subtle">({t('common.optional')})</span>
        </p>
        <input
          ref={fileInput}
          type="file"
          className="sr-only"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => onProofChange(e.target.files?.[0] ?? null)}
        />
        {proof ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <FileCheck2 className="h-4 w-4 shrink-0 text-success" />
              <span className="truncate">{proof.name}</span>
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
              onClick={() => {
                setProof(null);
                if (fileInput.current) fileInput.current.value = '';
              }}
            >
              <X className="h-3.5 w-3.5" /> {t('payment.proofRemove')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong px-3 py-3 text-sm text-muted transition hover:border-primary hover:text-primary-ink"
          >
            <Paperclip className="h-4 w-4" /> {t('payment.proofSelect')}
          </button>
        )}
        <p className={proofError ? 'mt-1.5 text-xs text-danger-ink' : 'mt-1.5 text-xs text-subtle'}>
          {proofError ?? t('payment.proofHint')}
        </p>
      </div>

      {changeDate ? (
        <Field label={t('payment.date')} error={errors.field(register.error, 'date')}>
          {(id) => (
            <input
              id={id}
              className="input"
              type="date"
              required
              max={todayIso()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
        </Field>
      ) : (
        <p className="text-xs text-muted">
          {t('payment.paidToday')}{' '}
          <TextButton onClick={() => setChangeDate(true)}>
            {t('receivables.form.changeDate')}
          </TextButton>
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={register.isPending} disabled={Boolean(proofError)}>
          {t('payment.submit')}
        </Button>
      </div>
    </form>
  );
}
