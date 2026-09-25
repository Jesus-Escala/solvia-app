import { FileText, HandCoins, ReceiptText, ShoppingBasket, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  Button,
  cx,
  Field,
  Modal,
  useErrorText,
  useErrorToast,
  useFeedback,
  TextButton,
  IconButton,
} from '@/ui';
import { NewCustomerFields, type NewCustomer } from './NewCustomerFields';
import { isWeighed, roundQuantity, WEIGHED_PRESETS } from './quantity';
import { QuantityStepper } from './QuantityStepper';
import { useCreateSale, useSaveCustomer } from '../../hooks/queries';
import { useModules } from '../../hooks/useModules';
import { useI18n } from '../../i18n/I18nProvider';
import type { PaymentMethod, ProductOption, SaleDocType } from '../../lib/types';
import { CustomerPicker, type PickedCustomer } from './CustomerPicker';
import { DueDateField } from './DueDateField';
import { addDaysIso, todayIso } from './dueLabel';
import { PaymentMethodPicker } from './PaymentMethods';
import { ProductPicker } from './ProductPicker';

interface Line {
  product: ProductOption;
  quantity: number;
}

const DOC_TYPES: SaleDocType[] = ['sale_note', 'receipt', 'invoice'];

/**
 * Whole units step by 1; kilos and liters by a quarter, meters by a half. Any amount can still be
 * typed (0.3 kg = 300 g).
 */
const stepFor = (product: ProductOption) =>
  isWeighed(product.unit) ? 0.25 : product.unit === 'meter' ? 0.5 : 1;

export function SaleFormModal({
  open,
  onClose,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  customer?: PickedCustomer;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      size="lg"
      title={t('sales.form.title')}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {open && <SaleForm onClose={onClose} preset={customer} />}
    </Modal>
  );
}

/**
 * A sale like at the counter: add products (search or scan), adjust quantities with − / +,
 * see the total, then "Al contado" (how they paid) or "Fiado" (who and when). The receipt is
 * optional. Stock never blocks a sale: it only warns.
 */
function SaleForm({ onClose, preset }: { onClose: () => void; preset?: PickedCustomer }) {
  const { t, fmt } = useI18n();
  const errors = useErrorText();
  const { toast } = useFeedback();
  const modules = useModules();
  const create = useCreateSale();
  const saveCustomer = useSaveCustomer();
  const today = todayIso();
  /** Less than a kilo or liter in grams or milliliters: 0.3 kg → "300 g". */
  const small = (quantity: number, unit: ProductOption['unit']) =>
    t(unit === 'liter' ? 'sales.form.milliliters' : 'sales.form.grams', {
      count: fmt.number(Math.round(quantity * 1000)),
    });

  const [lines, setLines] = useState<Line[]>([]);
  // Selling on credit creates a debt in Cobranza: without that module every sale is cash.
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>(
    preset && modules.collections ? 'credit' : 'cash',
  );
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [customer, setCustomer] = useState<PickedCustomer | null>(preset ?? null);
  const [newCustomer, setNewCustomer] = useState<NewCustomer | null>(null);
  const [dueDate, setDueDate] = useState(addDaysIso(today, 7));
  const [showDoc, setShowDoc] = useState(false);
  const [docType, setDocType] = useState<SaleDocType>('sale_note');
  const [docNumber, setDocNumber] = useState('');

  const total = lines.reduce((sum, line) => sum + line.quantity * line.product.price, 0);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);

  const add = (product: ProductOption) =>
    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line === existing
            ? { ...line, quantity: roundQuantity(line.quantity + stepFor(product)) }
            : line,
        );
      }
      return [...current, { product, quantity: 1 }];
    });
  const setQuantity = (id: string, quantity: number) =>
    setLines((current) =>
      current.map((line) =>
        line.product.id === id ? { ...line, quantity: Math.max(0, roundQuantity(quantity)) } : line,
      ),
    );
  const remove = (id: string) =>
    setLines((current) => current.filter((line) => line.product.id !== id));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const items = lines
      .filter((line) => line.quantity > 0)
      .map((line) => ({ productId: line.product.id, quantity: line.quantity }));
    if (items.length === 0) {
      toast.warning(t('sales.form.empty'));
      return;
    }
    let customerId = customer?.id ?? null;
    if (customerId === null && newCustomer) {
      const created = await saveCustomer.mutateAsync(newCustomer);
      customerId = created.id;
      setCustomer({ id: created.id, name: created.name, phone: created.phone, outstanding: 0 });
      setNewCustomer(null);
    }
    if (paymentType === 'credit' && customerId === null) {
      toast.warning(t('receivables.form.pickCustomer'));
      return;
    }
    const result = await create.mutateAsync({
      paymentType,
      ...(customerId !== null && { customerId }),
      ...(paymentType === 'cash' ? { method } : { dueDate }),
      ...(showDoc && { docType, docNumber: docNumber.trim() || null }),
      items,
    });
    if (paymentType === 'credit') {
      toast.success(t('sales.saved', { number: result.sale.number }), t('sales.savedCredit'));
    } else {
      toast.success(t('sales.saved', { number: result.sale.number }));
    }
    if (modules.inventory && result.lowStock.length > 0) {
      toast.warning(
        t('sales.lowStock'),
        result.lowStock
          .map((product) => `${product.name}: ${fmt.number(product.stock)}`)
          .join(' · '),
      );
    }
    onClose();
  };

  useErrorToast(create.error ?? saveCustomer.error);

  return (
    <form onSubmit={(event) => void submit(event).catch(() => null)} className="space-y-5">
      <div className="space-y-3">
        <ProductPicker onPick={add} showStock={modules.inventory} autoFocus />
        {lines.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
            <ShoppingBasket className="h-6 w-6 text-subtle" />
            {t('sales.form.emptyCart')}
          </div>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {lines.map((line) => {
              const step = stepFor(line.product);
              const short =
                modules.inventory && line.product.trackStock && line.quantity > line.product.stock;
              return (
                <li
                  key={line.product.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate text-sm font-semibold">{line.product.name}</p>
                    <p className="text-xs text-muted">
                      {fmt.money(line.product.price)} · {t(`products.units.${line.product.unit}`)}
                      {isWeighed(line.product.unit) && line.quantity > 0 && line.quantity < 1 && (
                        <span className="ml-1 font-medium text-ink">
                          · {small(line.quantity, line.product.unit)}
                        </span>
                      )}
                      {short && (
                        <span className="ml-1 font-medium text-warning-ink">
                          {line.product.stock > 0
                            ? t('sales.form.onlyLeft', { count: fmt.number(line.product.stock) })
                            : t('sales.form.noStock')}
                        </span>
                      )}
                    </p>
                  </div>
                  {isWeighed(line.product.unit) && (
                    // Quick amounts: ¼, ½ and 1 kilo (or liter); anything else can be typed.
                    <span className="flex gap-1">
                      {WEIGHED_PRESETS.map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          aria-pressed={line.quantity === amount}
                          onClick={() => setQuantity(line.product.id, amount)}
                          className={cx(
                            'h-9 rounded-lg border px-2 text-xs font-semibold tabular-nums transition',
                            line.quantity === amount
                              ? 'border-primary bg-primary-soft text-primary-ink'
                              : 'border-line text-muted hover:bg-surface-2 hover:text-ink',
                          )}
                        >
                          {amount < 1
                            ? small(amount, line.product.unit)
                            : `1 ${t(`products.unitsShort.${line.product.unit}`)}`}
                        </button>
                      ))}
                    </span>
                  )}
                  <QuantityStepper
                    value={line.quantity}
                    step={step}
                    onChange={(quantity) => setQuantity(line.product.id, quantity)}
                    onRemove={() => remove(line.product.id)}
                  />
                  <span className="w-24 text-right font-semibold tabular-nums">
                    {fmt.money(line.quantity * line.product.price)}
                  </span>
                  <IconButton
                    size="sm"
                    label={t('sales.form.remove', { name: line.product.name })}
                    onClick={() => remove(line.product.id)}
                    className="hover:text-danger-ink"
                  >
                    <X className="h-4 w-4" />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex items-baseline justify-between rounded-xl bg-surface-2 px-4 py-3">
          <span className="text-sm text-muted">
            {t('sales.form.total', { count: fmt.number(count) })}
          </span>
          <span className="font-display text-3xl font-semibold tabular-nums">
            {fmt.money(total)}
          </span>
        </div>
      </div>

      <div className={cx(!modules.collections && 'hidden')}>
        <p className="label">{t('sales.form.howPays')}</p>
        <div
          className="grid grid-cols-2 gap-2"
          role="radiogroup"
          aria-label={t('sales.form.howPays')}
        >
          {(['cash', 'credit'] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={paymentType === type}
              onClick={() => setPaymentType(type)}
              className={cx(
                'flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition',
                paymentType === type
                  ? 'border-primary bg-primary-soft ring-2 ring-primary/25'
                  : 'border-line bg-surface hover:bg-surface-2',
              )}
            >
              <span
                className={cx(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&>svg]:h-5 [&>svg]:w-5',
                  paymentType === type ? 'bg-primary text-on-primary' : 'bg-surface-3 text-muted',
                )}
              >
                {type === 'cash' ? <HandCoins /> : <ReceiptText />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{t(`sales.types.${type}`)}</span>
                <span className="block text-xs text-muted">{t(`sales.types.${type}Hint`)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Always there: optional for a cash sale (who bought, for the history), required on credit. */}
      <Field
        label={t(paymentType === 'cash' ? 'sales.form.customer' : 'receivables.form.customer')}
        {...(paymentType === 'cash' && { optionalLabel: t('common.optional') })}
        error={errors.field(create.error, 'customerId')}
      >
        {(id) =>
          newCustomer ? (
            <NewCustomerFields
              id={id}
              value={newCustomer}
              onChange={setNewCustomer}
              onCancel={() => setNewCustomer(null)}
            />
          ) : (
            <CustomerPicker
              id={id}
              value={customer}
              disabled={Boolean(preset)}
              onChange={setCustomer}
              onCreate={(name) => setNewCustomer({ name, phone: '' })}
            />
          )
        }
      </Field>

      {paymentType === 'cash' ? (
        <div>
          <p className="label">{t('payment.method')}</p>
          <PaymentMethodPicker label={t('payment.method')} value={method} onChange={setMethod} />
        </div>
      ) : (
        <Field label={t('receivables.form.dueDate')} error={errors.field(create.error, 'dueDate')}>
          {(id) => <DueDateField id={id} from={today} value={dueDate} onChange={setDueDate} />}
        </Field>
      )}

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
                placeholder="B001-000123"
                value={docNumber}
                onChange={(event) => setDocNumber(event.target.value)}
              />
            )}
          </Field>
        </div>
      ) : (
        <TextButton size="sm" onClick={() => setShowDoc(true)}>
          <FileText className="h-4 w-4" />
          {t('sales.form.addDoc')}
        </TextButton>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          loading={create.isPending || saveCustomer.isPending}
          disabled={lines.length === 0}
        >
          {t(paymentType === 'cash' ? 'sales.form.submitCash' : 'sales.form.submitCredit', {
            amount: fmt.money(total),
          })}
        </Button>
      </div>
    </form>
  );
}
