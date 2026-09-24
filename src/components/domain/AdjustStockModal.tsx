import { ClipboardCheck, PackageMinus, PackageX, SlidersHorizontal } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button, cx, Field, Modal, useErrorToast, useFeedback } from '@/ui';
import { useAdjustStock } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { AdjustmentReason, Product } from '../../lib/types';

const REASONS: Array<{ value: AdjustmentReason; icon: React.ReactNode }> = [
  { value: 'count', icon: <ClipboardCheck /> },
  { value: 'loss', icon: <PackageMinus /> },
  { value: 'damage', icon: <PackageX /> },
  { value: 'correction', icon: <SlidersHorizontal /> },
];

export function AdjustStockModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={product !== null}
      title={product !== null ? t('adjust.title', { name: product.name }) : ''}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {product !== null && <AdjustForm product={product} onClose={onClose} />}
    </Modal>
  );
}

/**
 * Four plain choices: "Conté" (type what there is; the difference is computed), "Se perdió",
 * "Se dañó" and "Corregir". Shows the stock before and after, and always leaves a trace.
 */
function AdjustForm({ product, onClose }: { product: Product; onClose: () => void }) {
  const { t, fmt } = useI18n();
  const { toast } = useFeedback();
  const adjust = useAdjustStock();
  const [reason, setReason] = useState<AdjustmentReason>('count');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');

  const value = Number(quantity);
  const typed = quantity.trim() !== '' && Number.isFinite(value);
  const after = !typed
    ? null
    : reason === 'count'
      ? value
      : reason === 'correction'
        ? product.stock + value
        : product.stock - Math.abs(value);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const updated = await adjust.mutateAsync({
      productId: product.id,
      reason,
      quantity: value,
      note: note.trim() || null,
    });
    toast.success(t('adjust.saved', { count: fmt.number(updated.stock) }));
    onClose();
  };
  useErrorToast(adjust.error);

  return (
    <form onSubmit={(event) => void submit(event).catch(() => null)} className="space-y-4">
      <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm">
        {t('adjust.now')}{' '}
        <strong className="font-display text-lg tabular-nums">{fmt.number(product.stock)}</strong>
      </p>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('adjust.what')}>
        {REASONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={reason === option.value}
            onClick={() => {
              setReason(option.value);
              setQuantity('');
            }}
            className={cx(
              'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0',
              reason === option.value
                ? 'border-primary bg-primary-soft text-primary-ink ring-2 ring-primary/25'
                : 'border-line bg-surface hover:bg-surface-2',
            )}
          >
            {option.icon}
            {t(`adjust.reasons.${option.value}`)}
          </button>
        ))}
      </div>
      <Field label={t(`adjust.quantity.${reason}`)} hint={t(`adjust.hints.${reason}`)}>
        {(id, describedBy) => (
          <input
            id={id}
            aria-describedby={describedBy}
            className="input text-lg font-semibold tabular-nums"
            type="number"
            inputMode="decimal"
            step="any"
            required
            {...(reason !== 'correction' && { min: reason === 'count' ? '0' : '0.001' })}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        )}
      </Field>
      {after !== null && (
        <p className="text-sm text-muted">
          {t('adjust.after', {
            from: fmt.number(product.stock),
            to: fmt.number(Math.round(after * 1000) / 1000),
          })}
        </p>
      )}
      <Field label={t('adjust.note')} optionalLabel={t('common.optional')}>
        {(id) => (
          <input
            id={id}
            className="input"
            maxLength={255}
            placeholder={t('adjust.notePlaceholder')}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        )}
      </Field>
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={adjust.isPending}>
          {t('adjust.submit')}
        </Button>
      </div>
    </form>
  );
}
