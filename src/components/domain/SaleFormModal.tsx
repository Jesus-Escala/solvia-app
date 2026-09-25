import {
  CheckCircle2,
  FileText,
  HandCoins,
  MessageSquareText,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  ShoppingBasket,
  Tag,
  X,
} from 'lucide-react';
import { useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  Button,
  cx,
  Field,
  IconButton,
  Modal,
  SegmentedControl,
  TextButton,
  useErrorText,
  useErrorToast,
  useFeedback,
  WhatsAppIcon,
} from '@/ui';
import { CustomerPicker, type PickedCustomer } from './CustomerPicker';
import { DueDateField } from './DueDateField';
import { addDaysIso, todayIso } from './dueLabel';
import { MoneyInput } from './MoneyInput';
import { NewCustomerFields, type NewCustomer } from './NewCustomerFields';
import { PaymentMethodPicker } from './PaymentMethods';
import { ProductPicker } from './ProductPicker';
import { isWeighed, roundQuantity, WEIGHED_PRESETS } from './quantity';
import { QuantityStepper } from './QuantityStepper';
import { type CashGiven, useSaleTicket } from './saleTicket';
import { useCreateSale, useSaveCustomer, type SaleInput } from '../../hooks/queries';
import { useModules } from '../../hooks/useModules';
import { useI18n } from '../../i18n/I18nProvider';
import type { PaymentMethod, ProductOption, ProductUnit, Sale, SaleDocType } from '../../lib/types';

/** A line of the sale: a catalog product, or a free line (a service, something not in the catalog). */
interface Line {
  key: string;
  product: ProductOption | null;
  description: string;
  quantity: number;
  /** Price charged for one; starts at the product's price and can be changed for this sale. */
  price: number;
}

const DOC_TYPES: SaleDocType[] = ['sale_note', 'receipt', 'invoice'];
/** Bills a customer usually pays with (PEN), for the change. */
const BILLS = [10, 20, 50, 100, 200];

const round2 = (value: number) => Math.round(value * 100) / 100;
const money = (text: string) => {
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? round2(value) : 0;
};

/**
 * Whole units step by 1; kilos and liters by a quarter, meters by a half. Any amount can still be
 * typed (0.3 kg = 300 g).
 */
const stepFor = (unit: ProductUnit) => (isWeighed(unit) ? 0.25 : unit === 'meter' ? 0.5 : 1);

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
  // A new key starts an empty sale ("Nueva venta" after saving one).
  const [round, setRound] = useState(0);
  return (
    <Modal
      open={open}
      size="lg"
      title={t('sales.form.title')}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {open && (
        <SaleForm
          key={round}
          onClose={onClose}
          onAnother={() => setRound((value) => value + 1)}
          preset={customer}
        />
      )}
    </Modal>
  );
}

/**
 * A sale like at the counter, for any kind of business: add products (search or scan) or a free
 * line (a service, something not in the catalog), adjust quantities and prices, an optional
 * discount, then "Al contado" (how they paid, with the change) or "Fiado" (who, when, and an
 * optional down payment). Receipt number and a note are optional. Stock never blocks a sale: it
 * only warns. Once saved: print the ticket, send it by WhatsApp or start another sale.
 */
function SaleForm({
  onClose,
  onAnother,
  preset,
}: {
  onClose: () => void;
  onAnother: () => void;
  preset?: PickedCustomer;
}) {
  const { t, fmt } = useI18n();
  const errors = useErrorText();
  const { toast } = useFeedback();
  const modules = useModules();
  const create = useCreateSale();
  const saveCustomer = useSaveCustomer();
  const today = todayIso();

  const [lines, setLines] = useState<Line[]>([]);
  const [freeCount, setFreeCount] = useState(0);
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
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>('amount');
  const [discountText, setDiscountText] = useState('');
  const [receivedText, setReceivedText] = useState('');
  const [showDown, setShowDown] = useState(false);
  const [downText, setDownText] = useState('');
  const [downMethod, setDownMethod] = useState<PaymentMethod>('cash');
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState<{ sale: Sale; cash: CashGiven | null } | null>(null);

  // Money, as the API computes it: each line rounded, then the discount.
  const subtotal = round2(lines.reduce((sum, line) => sum + round2(line.quantity * line.price), 0));
  const discountValue = showDiscount ? money(discountText) : 0;
  const discount =
    discountMode === 'percent'
      ? round2((subtotal * Math.min(discountValue, 100)) / 100)
      : discountValue;
  const discountTooHigh = discount > subtotal;
  const total = Math.max(0, round2(subtotal - discount));
  const received = paymentType === 'cash' && method === 'cash' ? money(receivedText) : 0;
  const down = paymentType === 'credit' && showDown ? money(downText) : 0;
  const downTooHigh = down > 0 && down >= total;
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);

  const add = (product: ProductOption) =>
    setLines((current) => {
      const existing = current.find((line) => line.product?.id === product.id);
      if (existing) {
        return current.map((line) =>
          line === existing
            ? { ...line, quantity: roundQuantity(line.quantity + stepFor(product.unit)) }
            : line,
        );
      }
      return [
        ...current,
        { key: product.id, product, description: product.name, quantity: 1, price: product.price },
      ];
    });
  const addFree = (description: string, price: number) => {
    setLines((current) => [
      ...current,
      { key: `free-${freeCount}`, product: null, description, quantity: 1, price },
    ]);
    setFreeCount((value) => value + 1);
  };
  const change = (key: string, changes: Partial<Line>) =>
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...changes } : line)),
    );
  const remove = (key: string) => setLines((current) => current.filter((line) => line.key !== key));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const items: SaleInput['items'] = lines
      .filter((line) => line.quantity > 0)
      .map((line) =>
        line.product
          ? { productId: line.product.id, quantity: line.quantity, unitPrice: line.price }
          : { description: line.description, quantity: line.quantity, unitPrice: line.price },
      );
    if (items.length === 0) {
      toast.warning(t('sales.form.empty'));
      return;
    }
    if (discountTooHigh) {
      toast.warning(t('sales.form.discountTooHigh'));
      return;
    }
    if (downTooHigh) {
      toast.warning(t('sales.form.downTooHigh'));
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
      ...(down > 0 && { downPayment: down, downPaymentMethod: downMethod }),
      ...(discount > 0 && { discount }),
      ...(showDoc && { docType, docNumber: docNumber.trim() || null }),
      ...(showNotes && notes.trim() !== '' && { notes: notes.trim() }),
      items,
    });
    if (modules.inventory && result.lowStock.length > 0) {
      toast.warning(
        t('sales.lowStock'),
        result.lowStock
          .map((product) => `${product.name}: ${fmt.number(product.stock)}`)
          .join(' · '),
      );
    }
    setDone({
      sale: result.sale,
      cash:
        received > 0 && received >= result.sale.total
          ? { received, change: round2(received - result.sale.total) }
          : null,
    });
  };

  useErrorToast(create.error);

  if (done) {
    return <SaleDone sale={done.sale} cash={done.cash} onAnother={onAnother} onClose={onClose} />;
  }

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
            {lines.map((line) => (
              <LineRow
                key={line.key}
                line={line}
                showStock={modules.inventory}
                onChange={(changes) => change(line.key, changes)}
                onRemove={() => remove(line.key)}
              />
            ))}
          </ul>
        )}
        <FreeLineForm onAdd={addFree} />

        <div className="space-y-1.5 rounded-xl bg-surface-2 px-4 py-3">
          {showDiscount && (
            <>
              <p className="flex items-baseline justify-between text-sm text-muted">
                <span>{t('sales.form.subtotal')}</span>
                <span className="tabular-nums">{fmt.money(subtotal)}</span>
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  {t('sales.form.discount')}
                  <SegmentedControl
                    label={t('sales.form.discount')}
                    value={discountMode}
                    onChange={setDiscountMode}
                    options={[
                      { value: 'amount', label: 'S/' },
                      { value: 'percent', label: '%' },
                    ]}
                  />
                </span>
                <span className="flex items-center gap-1.5">
                  <input
                    aria-label={t('sales.form.discount')}
                    className={cx(
                      'input h-9 w-24 text-right tabular-nums',
                      discountTooHigh && 'border-danger',
                    )}
                    inputMode="decimal"
                    autoFocus
                    placeholder={discountMode === 'percent' ? '10' : '0.00'}
                    value={discountText}
                    onChange={(event) => setDiscountText(event.target.value)}
                  />
                  <span className="w-24 text-right font-medium text-success-ink tabular-nums">
                    −{fmt.money(discount)}
                  </span>
                  <IconButton
                    size="sm"
                    label={t('sales.form.removeDiscount')}
                    onClick={() => {
                      setShowDiscount(false);
                      setDiscountText('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </IconButton>
                </span>
              </div>
              {discountTooHigh && (
                <p className="text-right text-xs text-danger-ink">
                  {t('sales.form.discountTooHigh')}
                </p>
              )}
            </>
          )}
          <p className="flex items-baseline justify-between">
            <span className="text-sm text-muted">
              {t('sales.form.total', { count: fmt.number(count) })}
            </span>
            <span className="font-display text-3xl font-semibold tabular-nums">
              {fmt.money(total)}
            </span>
          </p>
          {!showDiscount && lines.length > 0 && (
            <TextButton size="sm" onClick={() => setShowDiscount(true)}>
              <Tag className="h-4 w-4" />
              {t('sales.form.addDiscount')}
            </TextButton>
          )}
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
        <div className="space-y-3">
          <div>
            <p className="label">{t('payment.method')}</p>
            <PaymentMethodPicker label={t('payment.method')} value={method} onChange={setMethod} />
          </div>
          {method === 'cash' && total > 0 && (
            <ChangeCalculator
              total={total}
              text={receivedText}
              onChange={setReceivedText}
              received={received}
            />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Field
            label={t('receivables.form.dueDate')}
            error={errors.field(create.error, 'dueDate')}
          >
            {(id) => <DueDateField id={id} from={today} value={dueDate} onChange={setDueDate} />}
          </Field>
          {showDown ? (
            <div className="space-y-3 rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-40">
                  <Field label={t('sales.form.downPayment')}>
                    {(id) => (
                      <MoneyInput id={id} autoFocus value={downText} onChange={setDownText} />
                    )}
                  </Field>
                </div>
                <p
                  className={cx(
                    'pb-2.5 text-sm font-medium tabular-nums',
                    downTooHigh ? 'text-danger-ink' : 'text-ink',
                  )}
                >
                  {downTooHigh
                    ? t('sales.form.downTooHigh')
                    : t('sales.form.owes', { amount: fmt.money(Math.max(0, total - down)) })}
                </p>
              </div>
              <div>
                <p className="label">{t('sales.form.downPaymentMethod')}</p>
                <PaymentMethodPicker
                  label={t('sales.form.downPaymentMethod')}
                  value={downMethod}
                  onChange={setDownMethod}
                />
              </div>
            </div>
          ) : (
            <TextButton size="sm" onClick={() => setShowDown(true)}>
              <HandCoins className="h-4 w-4" />
              {t('sales.form.addDownPayment')}
            </TextButton>
          )}
        </div>
      )}

      {(showDoc || showNotes) && (
        <div className="space-y-3">
          {showDoc && (
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
          )}
          {showNotes && (
            <Field label={t('sales.form.notes')} optionalLabel={t('common.optional')}>
              {(id) => (
                <textarea
                  id={id}
                  className="input min-h-20"
                  maxLength={500}
                  autoFocus
                  placeholder={t('sales.form.notesPlaceholder')}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              )}
            </Field>
          )}
        </div>
      )}
      {(!showDoc || !showNotes) && (
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {!showDoc && (
            <TextButton size="sm" onClick={() => setShowDoc(true)}>
              <FileText className="h-4 w-4" />
              {t('sales.form.addDoc')}
            </TextButton>
          )}
          {!showNotes && (
            <TextButton size="sm" onClick={() => setShowNotes(true)}>
              <MessageSquareText className="h-4 w-4" />
              {t('sales.form.addNotes')}
            </TextButton>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          loading={create.isPending || saveCustomer.isPending}
          disabled={lines.length === 0 || discountTooHigh || downTooHigh}
        >
          {t(paymentType === 'cash' ? 'sales.form.submitCash' : 'sales.form.submitCredit', {
            amount: fmt.money(total),
          })}
        </Button>
      </div>
    </form>
  );
}

/** Enter commits a small inline field instead of submitting the whole sale. */
const onEnter = (action: () => void) => (event: KeyboardEvent) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  action();
};

/**
 * One line: name, price (tap it to charge another price this time), quantity and subtotal.
 * Kilos and liters get ¼ · ½ · 1 buttons, grams under a kilo, and "Por monto" to sell by amount
 * of money ("dame S/ 2 de arroz").
 */
function LineRow({
  line,
  showStock,
  onChange,
  onRemove,
}: {
  line: Line;
  showStock: boolean;
  onChange: (changes: Partial<Line>) => void;
  onRemove: () => void;
}) {
  const { t, fmt } = useI18n();
  const [priceText, setPriceText] = useState<string | null>(null);
  const [amountText, setAmountText] = useState<string | null>(null);
  const product = line.product;
  const unit = product?.unit ?? 'unit';
  const weighed = isWeighed(unit);
  const short =
    showStock && product !== null && product.trackStock && line.quantity > product.stock;
  /** Less than a kilo or liter in grams or milliliters: 0.3 kg → "300 g". */
  const small = (quantity: number) =>
    t(unit === 'liter' ? 'sales.form.milliliters' : 'sales.form.grams', {
      count: fmt.number(Math.round(quantity * 1000)),
    });
  const commitPrice = () => {
    if (priceText !== null) {
      const value = Number(priceText.replace(',', '.'));
      if (Number.isFinite(value) && value >= 0) onChange({ price: round2(value) });
    }
    setPriceText(null);
  };

  return (
    <li className="space-y-2 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate text-sm font-semibold">
            {line.description}
            {product === null && (
              <span className="ml-1.5 text-xs font-normal text-muted">
                {t('sales.form.freeBadge')}
              </span>
            )}
          </p>
          <p className="flex flex-wrap items-center gap-x-1 text-xs text-muted">
            {priceText === null ? (
              <button
                type="button"
                onClick={() => setPriceText(String(line.price))}
                title={t('sales.form.editPrice')}
                className="inline-flex items-center gap-1 rounded font-medium text-ink hover:text-primary-ink"
              >
                {fmt.money(line.price)}
                <Pencil className="h-3 w-3 text-subtle" />
              </button>
            ) : (
              <input
                aria-label={t('sales.form.editPrice')}
                className="input h-7 w-24 text-xs tabular-nums"
                inputMode="decimal"
                autoFocus
                value={priceText}
                onChange={(event) => setPriceText(event.target.value)}
                onBlur={commitPrice}
                onKeyDown={onEnter(commitPrice)}
              />
            )}
            {product !== null && line.price !== product.price && (
              <span className="line-through">{fmt.money(product.price)}</span>
            )}
            {product !== null && <span>· {t(`products.units.${unit}`)}</span>}
            {weighed && line.quantity > 0 && line.quantity < 1 && (
              <span className="font-medium text-ink">· {small(line.quantity)}</span>
            )}
            {short && (
              <span className="font-medium text-warning-ink">
                {product.stock > 0
                  ? t('sales.form.onlyLeft', { count: fmt.number(product.stock) })
                  : t('sales.form.noStock')}
              </span>
            )}
          </p>
        </div>
        <QuantityStepper
          value={line.quantity}
          step={stepFor(unit)}
          onChange={(quantity) => onChange({ quantity: Math.max(0, roundQuantity(quantity)) })}
          onRemove={onRemove}
        />
        <span className="w-24 text-right font-semibold tabular-nums">
          {fmt.money(round2(line.quantity * line.price))}
        </span>
        <IconButton
          size="sm"
          label={t('sales.form.remove', { name: line.description })}
          onClick={onRemove}
          className="hover:text-danger-ink"
        >
          <X className="h-4 w-4" />
        </IconButton>
      </div>
      {weighed && (
        // Quick amounts: ¼, ½ and 1 kilo (or liter), or sell by an amount of money.
        <div className="flex flex-wrap items-center gap-1">
          {WEIGHED_PRESETS.map((amount) => (
            <button
              key={amount}
              type="button"
              aria-pressed={line.quantity === amount}
              onClick={() => onChange({ quantity: amount })}
              className={cx(
                'h-8 rounded-lg border px-2.5 text-xs font-semibold tabular-nums transition',
                line.quantity === amount
                  ? 'border-primary bg-primary-soft text-primary-ink'
                  : 'border-line text-muted hover:bg-surface-2 hover:text-ink',
              )}
            >
              {amount < 1 ? small(amount) : `1 ${t(`products.unitsShort.${unit}`)}`}
            </button>
          ))}
          {amountText === null ? (
            <button
              type="button"
              onClick={() => setAmountText('')}
              className="h-8 rounded-lg border border-line px-2.5 text-xs font-semibold text-muted transition hover:bg-surface-2 hover:text-ink"
            >
              {t('sales.form.byAmount')}
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <MoneyInput
                className="w-28"
                autoFocus
                placeholder={t('sales.form.byAmountPlaceholder')}
                value={amountText}
                onChange={(text) => {
                  setAmountText(text);
                  const amount = money(text);
                  if (amount > 0 && line.price > 0) {
                    onChange({ quantity: roundQuantity(amount / line.price) });
                  }
                }}
              />
              <IconButton size="sm" label={t('common.close')} onClick={() => setAmountText(null)}>
                <X className="h-4 w-4" />
              </IconButton>
            </span>
          )}
        </div>
      )}
    </li>
  );
}

/** "Otro producto o servicio": something not in the catalog, with its name and price. */
function FreeLineForm({ onAdd }: { onAdd: (description: string, price: number) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const add = () => {
    const value = money(price);
    if (name.trim() === '' || value <= 0) return;
    onAdd(name.trim(), value);
    setName('');
    setPrice('');
    setOpen(false);
  };
  if (!open) {
    return (
      <TextButton size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {t('sales.form.addFree')}
      </TextButton>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-line-strong p-3">
      <div className="min-w-44 flex-1">
        <Field label={t('sales.form.freeName')}>
          {(id) => (
            <input
              id={id}
              className="input"
              maxLength={120}
              autoFocus
              placeholder={t('sales.form.freeNamePlaceholder')}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={onEnter(add)}
            />
          )}
        </Field>
      </div>
      <div className="w-32" onKeyDown={onEnter(add)}>
        <Field label={t('sales.form.freePrice')}>
          {(id) => <MoneyInput id={id} value={price} onChange={setPrice} />}
        </Field>
      </div>
      <Button onClick={add} disabled={name.trim() === '' || money(price) <= 0}>
        {t('sales.form.freeAdd')}
      </Button>
      <IconButton label={t('common.cancel')} onClick={() => setOpen(false)}>
        <X className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

/** "¿Con cuánto paga?": quick bills and the change to give back. */
function ChangeCalculator({
  total,
  text,
  onChange,
  received,
}: {
  total: number;
  text: string;
  onChange: (text: string) => void;
  received: number;
}) {
  const { t, fmt } = useI18n();
  const bills = BILLS.filter((bill) => bill > total).slice(0, 3);
  const difference = round2(received - total);
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="label">{t('sales.form.received')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <MoneyInput className="w-32" value={text} onChange={onChange} />
        {[total, ...bills].map((amount, index) => (
          <button
            key={amount}
            type="button"
            onClick={() => onChange(String(amount))}
            className={cx(
              'h-9 rounded-lg border px-3 text-sm font-semibold tabular-nums transition',
              received === amount
                ? 'border-primary bg-primary-soft text-primary-ink'
                : 'border-line text-muted hover:bg-surface-2 hover:text-ink',
            )}
          >
            {index === 0 ? t('sales.form.exact') : fmt.money(amount).replace(/[.,]00$/, '')}
          </button>
        ))}
      </div>
      {received > 0 && (
        <p
          className={cx(
            'mt-2 text-sm font-semibold tabular-nums',
            difference >= 0 ? 'text-success-ink' : 'text-danger-ink',
          )}
        >
          {difference >= 0
            ? t('sales.form.change', { amount: fmt.money(difference) })
            : t('sales.form.missing', { amount: fmt.money(-difference) })}
        </p>
      )}
    </div>
  );
}

/** After saving: the amount, the change, and the ticket (print or WhatsApp). */
function SaleDone({
  sale,
  cash,
  onAnother,
  onClose,
}: {
  sale: Sale;
  cash: CashGiven | null;
  onAnother: () => void;
  onClose: () => void;
}) {
  const { t, fmt } = useI18n();
  const ticket = useSaleTicket();
  const whatsapp = ticket.whatsappUrl(sale);
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-1 text-center">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <p className="text-lg font-semibold">{t('sales.done.title', { number: sale.number })}</p>
        <p className="font-display text-4xl font-semibold tabular-nums">{fmt.money(sale.total)}</p>
        {cash && cash.change > 0 && (
          <p className="text-base font-semibold text-success-ink">
            {t('sales.done.change', { amount: fmt.money(cash.change) })}
          </p>
        )}
        {sale.receivable && (
          <p className="text-sm text-muted">
            {t('sales.done.owes', { amount: fmt.money(sale.receivable.outstanding) })}
          </p>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          variant="secondary"
          icon={<Printer className="h-4 w-4" />}
          onClick={() => ticket.print(sale, cash)}
        >
          {t('sales.done.print')}
        </Button>
        {whatsapp !== null && (
          <Button
            variant="secondary"
            icon={<WhatsAppIcon className="h-4 w-4" />}
            onClick={() => window.open(whatsapp, '_blank', 'noopener')}
          >
            {t('sales.done.whatsapp')}
          </Button>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          {t('sales.done.close')}
        </Button>
        <Button icon={<Plus className="h-4 w-4" />} onClick={onAnother}>
          {t('sales.done.another')}
        </Button>
      </div>
    </div>
  );
}
