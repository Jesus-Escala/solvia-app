import { FileText, Minus, Plus, Truck, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button, Field, Modal, useErrorToast, useFeedback } from '@/ui';
import { useCreatePurchase, useSaveSupplier } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { ProductOption, SaleDocType, SupplierOption } from '../../lib/types';
import { ProductPicker } from './ProductPicker';
import { SupplierPicker } from './SupplierPicker';

interface Line {
  product: ProductOption;
  quantity: number;
  /** Text of the cost input (editable: what was paid this time). */
  unitCost: string;
}

const DOC_TYPES: SaleDocType[] = ['receipt', 'invoice', 'sale_note'];
const round3 = (value: number) => Math.round(value * 1000) / 1000;

export function PurchaseFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      size="lg"
      title={t('purchases.form.title')}
      description={t('purchases.form.intro')}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {open && <PurchaseForm onClose={onClose} />}
    </Modal>
  );
}

/**
 * Goods that arrived: add products (search or scan), how many and what each one cost; the
 * stock goes up and the product costs are updated. Supplier and invoice are optional.
 */
function PurchaseForm({ onClose }: { onClose: () => void }) {
  const { t, fmt } = useI18n();
  const { toast } = useFeedback();
  const create = useCreatePurchase();
  const saveSupplier = useSaveSupplier();
  const [lines, setLines] = useState<Line[]>([]);
  const [supplier, setSupplier] = useState<SupplierOption | null>(null);
  const [showDoc, setShowDoc] = useState(false);
  const [docType, setDocType] = useState<SaleDocType>('invoice');
  const [docNumber, setDocNumber] = useState('');
  const [updateCosts, setUpdateCosts] = useState(true);

  const total = lines.reduce((sum, line) => sum + line.quantity * (Number(line.unitCost) || 0), 0);

  const add = (product: ProductOption) =>
    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id) ?? null;
      if (existing !== null) {
        return current.map((line) =>
          line === existing ? { ...line, quantity: round3(line.quantity + 1) } : line,
        );
      }
      return [...current, { product, quantity: 1, unitCost: String(product.cost ?? '') }];
    });
  const update = (id: string, changes: Partial<Line>) =>
    setLines((current) =>
      current.map((line) => (line.product.id === id ? { ...line, ...changes } : line)),
    );
  const remove = (id: string) =>
    setLines((current) => current.filter((line) => line.product.id !== id));

  const createSupplier = async (name: string) => {
    try {
      const created = await saveSupplier.mutateAsync({ name });
      setSupplier({ id: created.id, name: created.name, phone: created.phone });
    } catch (error) {
      toast.apiError(error);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const items = lines
      .filter((line) => line.quantity > 0)
      .map((line) => ({
        productId: line.product.id,
        quantity: line.quantity,
        unitCost: Number(line.unitCost) || 0,
      }));
    if (items.length === 0) {
      toast.warning(t('sales.form.empty'));
      return;
    }
    const purchase = await create.mutateAsync({
      ...(supplier !== null && { supplierId: supplier.id }),
      ...(showDoc && { docType, docNumber: docNumber.trim() || null }),
      updateCosts,
      items,
    });
    toast.success(t('purchases.saved', { number: purchase.number }), t('purchases.savedHint'));
    onClose();
  };

  useErrorToast(create.error);

  return (
    <form onSubmit={(event) => void submit(event).catch(() => null)} className="space-y-5">
      <div className="space-y-3">
        <ProductPicker onPick={add} showStock autoFocus />
        {lines.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
            <Truck className="h-6 w-6 text-subtle" />
            {t('purchases.form.emptyCart')}
          </div>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {lines.map((line) => (
              <li
                key={line.product.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-sm font-semibold">{line.product.name}</p>
                  {line.product.trackStock && (
                    <p className="text-xs text-muted">
                      {t('purchases.form.stockAfter', {
                        from: fmt.number(line.product.stock),
                        to: fmt.number(round3(line.product.stock + line.quantity)),
                      })}
                    </p>
                  )}
                </div>
                <div className="flex items-center rounded-lg border border-line">
                  <button
                    type="button"
                    aria-label={t('sales.form.less')}
                    onClick={() =>
                      line.quantity <= 1
                        ? remove(line.product.id)
                        : update(line.product.id, { quantity: round3(line.quantity - 1) })
                    }
                    className="flex h-9 w-9 items-center justify-center text-muted hover:text-ink"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    aria-label={t('sales.form.quantity')}
                    className="h-9 w-14 border-x border-line bg-transparent text-center text-sm font-semibold tabular-nums outline-none"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={line.quantity}
                    onChange={(event) =>
                      update(line.product.id, {
                        quantity: Math.max(0, round3(Number(event.target.value) || 0)),
                      })
                    }
                  />
                  <button
                    type="button"
                    aria-label={t('sales.form.more')}
                    onClick={() => update(line.product.id, { quantity: round3(line.quantity + 1) })}
                    className="flex h-9 w-9 items-center justify-center text-muted hover:text-ink"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <label className="relative w-28">
                  <span className="sr-only">{t('purchases.form.unitCost')}</span>
                  <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-muted">
                    S/
                  </span>
                  <input
                    className="input h-9 pl-7 text-right tabular-nums"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    required
                    placeholder={t('purchases.form.unitCost')}
                    value={line.unitCost}
                    onChange={(event) => update(line.product.id, { unitCost: event.target.value })}
                  />
                </label>
                <span className="w-24 text-right font-semibold tabular-nums">
                  {fmt.money(line.quantity * (Number(line.unitCost) || 0))}
                </span>
                <button
                  type="button"
                  aria-label={t('sales.form.remove', { name: line.product.name })}
                  onClick={() => remove(line.product.id)}
                  className="rounded-md p-1 text-subtle hover:bg-surface-3 hover:text-danger-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-baseline justify-between rounded-xl bg-surface-2 px-4 py-3">
          <span className="text-sm text-muted">{t('purchases.form.total')}</span>
          <span className="font-display text-3xl font-semibold tabular-nums">
            {fmt.money(total)}
          </span>
        </div>
      </div>

      <Field label={t('purchases.form.supplier')} optionalLabel={t('common.optional')}>
        {(id) => (
          <SupplierPicker
            id={id}
            value={supplier}
            onChange={setSupplier}
            onCreate={(name) => void createSupplier(name)}
          />
        )}
      </Field>

      {showDoc ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr]">
          <Field label={t('sales.form.docType')}>
            {(id) => (
              <select
                id={id}
                className="input"
                value={docType}
                onChange={(event) => setDocType(event.target.value as SaleDocType)}
              >
                {DOC_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`sales.docTypes.${type}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t('sales.form.docNumber')} optionalLabel={t('common.optional')}>
            {(id) => (
              <input
                id={id}
                className="input"
                maxLength={40}
                placeholder="F001-000123"
                value={docNumber}
                onChange={(event) => setDocNumber(event.target.value)}
              />
            )}
          </Field>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowDoc(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-ink hover:underline"
        >
          <FileText className="h-4 w-4" />
          {t('purchases.form.addDoc')}
        </button>
      )}

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface-2 p-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
          checked={updateCosts}
          onChange={(event) => setUpdateCosts(event.target.checked)}
        />
        <span>
          <span className="block text-sm font-semibold">{t('purchases.form.updateCosts')}</span>
          <span className="block text-xs text-muted">{t('purchases.form.updateCostsHint')}</span>
        </span>
      </label>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={create.isPending} disabled={lines.length === 0}>
          {t('purchases.form.submit', { amount: fmt.money(total) })}
        </Button>
      </div>
    </form>
  );
}
