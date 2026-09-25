import {
  ArrowLeft,
  ChevronDown,
  FileText,
  HandCoins,
  MessageSquareText,
  ReceiptText,
  ShoppingBasket,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Button,
  cx,
  Field,
  IconButton,
  SegmentedControl,
  TextButton,
  useErrorText,
  useErrorToast,
  useFeedback,
} from '@/ui';
import { isSaveKey, isSearchKey, SAVE_KEY_LABEL } from './keys';
import { Kbd, PosLayout } from './PosLayout';
import { ProductCatalog } from './ProductCatalog';
import { CustomerPicker, type PickedCustomer } from '../domain/CustomerPicker';
import { DueDateField } from '../domain/DueDateField';
import { addDaysIso, todayIso } from '../domain/dueLabel';
import { MoneyInput } from '../domain/MoneyInput';
import { NewCustomerFields, type NewCustomer } from '../domain/NewCustomerFields';
import { PaymentMethodMark } from '../domain/PaymentMethods';
import { roundQuantity } from '../domain/quantity';
import type { CashGiven } from './saleTicket';
import { NewProductForm } from './NewProductForm';
import { ChangeCalculator, LineRow, SaleDone } from './SaleLines';
import { money, round2, stepFor, type Line } from './saleMath';
import { useCreateSale, useSaveCustomer, type SaleInput } from '../../hooks/queries';
import { useModules } from '../../hooks/useModules';
import { useI18n } from '../../i18n/I18nProvider';
import type { PaymentMethod, ProductOption, Sale, SaleDocType } from '../../lib/types';

const DOC_TYPES: SaleDocType[] = ['sale_note', 'receipt', 'invoice'];
/** How the customer pays: the four methods of a cash sale, or on credit ("Fiado"). */
type PayOption = PaymentMethod | 'credit';
const PAY_OPTIONS: PaymentMethod[] = ['cash', 'yape', 'plin', 'bank_transfer'];

/**
 * A point of sale for any kind of business. Left: the catalog (best sellers as big tiles, search
 * or scan). Right: the ticket — lines with − / + and prices that can be changed for this sale, a
 * free line for services or things not in the catalog, an optional discount and a big "Cobrar".
 * Charging asks how they pay in one row (cash with the change, Yape, Plin, transfer, or on
 * credit with an optional down payment), with the customer, receipt number and a note at hand.
 * Once saved: the change, the ticket (print or WhatsApp) and "Nueva venta". Keyboard: Alt+S (Option+S on a
 * Mac) charge / confirm, Alt+B search, Esc back. Stock never blocks a sale: it only warns.
 */
export function SalePos({
  onClose,
  onDirty,
  onAnother,
  preset,
}: {
  onClose: () => void;
  onDirty: (dirty: boolean) => void;
  onAnother: () => void;
  preset?: PickedCustomer;
}) {
  const { t, fmt } = useI18n();
  const errors = useErrorText();
  const { toast, confirm } = useFeedback();
  const modules = useModules();
  const create = useCreateSale();
  const saveCustomer = useSaveCustomer();
  const today = todayIso();
  const searchRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [lines, setLines] = useState<Line[]>([]);
  // A product being created on the spot (its name so far), or null.
  const [newName, setNewName] = useState<string | null>(null);
  const [step, setStep] = useState<'ticket' | 'checkout'>('ticket');
  // Phones: the ticket is shown over the catalog.
  const [panelOpen, setPanelOpen] = useState(false);
  // Selling on credit creates a debt in Cobranza: without that module every sale is cash.
  const [pay, setPay] = useState<PayOption>(preset && modules.collections ? 'credit' : 'cash');
  const [customer, setCustomer] = useState<PickedCustomer | null>(preset ?? null);
  const [newCustomer, setNewCustomer] = useState<NewCustomer | null>(null);
  const [dueDate, setDueDate] = useState(addDaysIso(today, 7));
  const [docType, setDocType] = useState<SaleDocType>('sale_note');
  const [docNumber, setDocNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>('amount');
  const [discountText, setDiscountText] = useState('');
  const [receivedText, setReceivedText] = useState('');
  const [downText, setDownText] = useState('');
  const [downMethod, setDownMethod] = useState<PaymentMethod>('cash');
  const [done, setDone] = useState<{ sale: Sale; cash: CashGiven | null } | null>(null);

  const credit = pay === 'credit';
  const method: PaymentMethod = credit ? 'cash' : pay;
  // Money, as the API computes it: each line rounded, then the discount.
  const subtotal = round2(lines.reduce((sum, line) => sum + round2(line.quantity * line.price), 0));
  const discountValue = showDiscount ? money(discountText) : 0;
  const discount =
    discountMode === 'percent'
      ? round2((subtotal * Math.min(discountValue, 100)) / 100)
      : discountValue;
  const discountTooHigh = discount > subtotal;
  const total = Math.max(0, round2(subtotal - discount));
  const received = pay === 'cash' ? money(receivedText) : 0;
  const down = credit ? money(downText) : 0;
  const downTooHigh = down > 0 && down >= total;
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const inCart = new Map(
    lines.flatMap((line) => (line.product ? [[line.product.id, line.quantity] as const] : [])),
  );

  useEffect(() => onDirty(lines.length > 0 && done === null), [lines.length, done, onDirty]);

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
  const change = (key: string, changes: Partial<Line>) =>
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...changes } : line)),
    );
  const remove = (key: string) => setLines((current) => current.filter((line) => line.key !== key));
  const clear = async () => {
    const ok = await confirm({
      title: t('sales.pos.clearTitle'),
      message: t('sales.pos.clearMessage'),
      confirmLabel: t('sales.pos.clear'),
      cancelLabel: t('common.cancel'),
    });
    if (ok) {
      setLines([]);
      setStep('ticket');
      setPanelOpen(false);
    }
  };

  const goCheckout = () => {
    if (lines.length === 0) return;
    if (discountTooHigh) {
      toast.warning(t('sales.form.discountTooHigh'));
      return;
    }
    setStep('checkout');
    setPanelOpen(true);
  };
  const back = () => {
    setStep('ticket');
    window.setTimeout(() => searchRef.current?.focus(), 0);
  };

  // Keyboard, like a till: Alt+S charge (then confirm), Alt+B search, Esc back from charging.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (done) return;
      if (isSearchKey(event)) {
        event.preventDefault();
        setStep('ticket');
        searchRef.current?.focus();
      } else if (isSaveKey(event)) {
        event.preventDefault();
        if (step === 'ticket') goCheckout();
        else formRef.current?.requestSubmit();
      } else if (event.key === 'Escape' && step === 'checkout') {
        event.preventDefault();
        event.stopPropagation();
        back();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

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
    if (credit && customerId === null) {
      toast.warning(t('receivables.form.pickCustomer'));
      return;
    }
    const result = await create.mutateAsync({
      paymentType: credit ? 'credit' : 'cash',
      ...(customerId !== null && { customerId }),
      ...(credit ? { dueDate } : { method }),
      ...(down > 0 && { downPayment: down, downPaymentMethod: downMethod }),
      ...(discount > 0 && { discount }),
      ...(docNumber.trim() !== '' && { docType, docNumber: docNumber.trim() }),
      ...(notes.trim() !== '' && { notes: notes.trim() }),
      items,
    });
    if (modules.inventory && result.lowStock.length > 0) {
      // One line per product, the ones already without stock first.
      toast.warning(
        t('sales.lowStock'),
        t('sales.lowStockHint'),
        [...result.lowStock]
          .sort((a, b) => a.stock - b.stock)
          .map((product) =>
            product.stock <= 0
              ? t('sales.lowStockOut', { name: product.name })
              : t('sales.lowStockLeft', { name: product.name, count: fmt.number(product.stock) }),
          ),
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

  const ticket = (
    <>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <IconButton
            size="sm"
            label={t('sales.pos.backToCatalog')}
            onClick={() => setPanelOpen(false)}
            className="lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </IconButton>
          <h3 className="font-semibold">{t('sales.pos.ticket')}</h3>
          {lines.length > 0 && (
            <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-semibold text-muted tabular-nums">
              {fmt.number(count)}
            </span>
          )}
        </div>
        {lines.length > 0 && (
          <TextButton size="sm" onClick={() => void clear()}>
            <Trash2 className="h-4 w-4" />
            {t('sales.pos.clear')}
          </TextButton>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {newName !== null && (
          <NewProductForm
            mode="sale"
            initialName={newName}
            onCreated={(product) => {
              add(product);
              setNewName(null);
              searchRef.current?.focus();
            }}
            onCancel={() => setNewName(null)}
          />
        )}
        {lines.length === 0 && newName === null ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center text-sm text-muted">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2">
              <ShoppingBasket className="h-7 w-7 text-subtle" />
            </span>
            {t('sales.pos.emptyTicket')}
          </div>
        ) : (
          <ul className="divide-y divide-line">
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
      </div>
      <div className="shrink-0 space-y-2 border-t border-line bg-surface-2/60 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {showDiscount ? (
          <div className="space-y-1.5">
            <p className="flex justify-between text-sm text-muted">
              <span>{t('sales.form.subtotal')}</span>
              <span className="tabular-nums">{fmt.money(subtotal)}</span>
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 shrink-0 text-primary" />
              <SegmentedControl
                label={t('sales.form.discount')}
                value={discountMode}
                onChange={setDiscountMode}
                options={[
                  { value: 'amount', label: 'S/' },
                  { value: 'percent', label: '%' },
                ]}
              />
              <input
                aria-label={t('sales.form.discount')}
                className={cx(
                  'input h-9 w-20 text-right tabular-nums',
                  discountTooHigh && 'border-danger',
                )}
                inputMode="decimal"
                autoFocus
                placeholder={discountMode === 'percent' ? '10' : '0.00'}
                value={discountText}
                onChange={(event) => setDiscountText(event.target.value)}
              />
              <span className="min-w-0 flex-1 text-right font-medium text-success-ink tabular-nums">
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
            </div>
            {discountTooHigh && (
              <p className="text-right text-xs text-danger-ink">
                {t('sales.form.discountTooHigh')}
              </p>
            )}
          </div>
        ) : (
          lines.length > 0 && (
            <TextButton size="sm" onClick={() => setShowDiscount(true)}>
              <Tag className="h-4 w-4" />
              {t('sales.form.addDiscount')}
            </TextButton>
          )
        )}
        <p className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-muted">{t('sales.columns.total')}</span>
          <span className="font-display text-4xl font-semibold tabular-nums">
            {fmt.money(total)}
          </span>
        </p>
        <button
          type="button"
          onClick={goCheckout}
          disabled={lines.length === 0 || discountTooHigh}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-primary text-lg font-semibold text-on-primary shadow-pop transition hover:brightness-110 active:scale-[0.99] disabled:bg-surface-3 disabled:text-muted disabled:shadow-none"
        >
          <HandCoins className="h-5 w-5" />
          {t('sales.pos.charge', { amount: fmt.money(total) })}
          <Kbd>{SAVE_KEY_LABEL}</Kbd>
        </button>
      </div>
    </>
  );

  const payOptions: PayOption[] = modules.collections ? [...PAY_OPTIONS, 'credit'] : PAY_OPTIONS;
  const checkout = (
    <form
      ref={formRef}
      onSubmit={(event) => void submit(event).catch(() => null)}
      className="flex h-full min-h-0 flex-col"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
        <IconButton size="sm" label={t('sales.pos.back')} onClick={back}>
          <ArrowLeft className="h-4 w-4" />
        </IconButton>
        <h3 className="font-semibold">{t('sales.pos.checkout')}</h3>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="rounded-2xl bg-surface-2 px-4 py-3 text-center">
          <p className="text-sm text-muted">
            {t('sales.form.total', { count: fmt.number(count) })}
          </p>
          <p className="font-display text-4xl font-semibold tabular-nums">{fmt.money(total)}</p>
        </div>

        <Field
          label={t(credit ? 'receivables.form.customer' : 'sales.form.customer')}
          {...(!credit && { optionalLabel: t('common.optional') })}
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

        <div>
          <p className="label">{t('sales.form.howPays')}</p>
          <div
            role="radiogroup"
            aria-label={t('sales.form.howPays')}
            className="grid grid-cols-3 gap-2"
          >
            {payOptions.map((option) => {
              const active = pay === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPay(option)}
                  className={cx(
                    'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-semibold transition active:scale-[0.97]',
                    active
                      ? 'border-primary bg-primary-soft text-primary-ink ring-2 ring-primary/25'
                      : 'border-line text-muted hover:bg-surface-2 hover:text-ink',
                  )}
                >
                  {option === 'credit' ? (
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning-soft text-warning-ink">
                      <ReceiptText className="h-[18px] w-[18px]" />
                    </span>
                  ) : (
                    <PaymentMethodMark method={option} />
                  )}
                  {option === 'credit' ? t('sales.types.credit') : t(`methods.${option}`)}
                </button>
              );
            })}
          </div>
        </div>

        {pay === 'cash' && total > 0 && (
          <ChangeCalculator
            total={total}
            text={receivedText}
            onChange={setReceivedText}
            received={received}
          />
        )}

        {credit && (
          <div className="space-y-3 rounded-2xl border border-line p-3">
            <Field
              label={t('receivables.form.dueDate')}
              error={errors.field(create.error, 'dueDate')}
            >
              {(id) => <DueDateField id={id} from={today} value={dueDate} onChange={setDueDate} />}
            </Field>
            <div className="flex items-end gap-3">
              <div className="w-36">
                <Field label={t('sales.form.downPayment')} optionalLabel={t('common.optional')}>
                  {(id) => <MoneyInput id={id} value={downText} onChange={setDownText} />}
                </Field>
              </div>
              <p
                className={cx(
                  'min-w-0 flex-1 pb-2.5 text-right text-sm font-semibold tabular-nums',
                  downTooHigh ? 'text-danger-ink' : 'text-ink',
                )}
              >
                {downTooHigh
                  ? t('sales.form.downTooHigh')
                  : t('sales.form.owes', { amount: fmt.money(Math.max(0, total - down)) })}
              </p>
            </div>
            {down > 0 && (
              <div>
                <p className="label">{t('sales.form.downPaymentMethod')}</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {PAY_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={downMethod === option}
                      onClick={() => setDownMethod(option)}
                      className={cx(
                        'flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[11px] font-semibold transition',
                        downMethod === option
                          ? 'border-primary bg-primary-soft text-primary-ink'
                          : 'border-line text-muted hover:bg-surface-2',
                      )}
                    >
                      <PaymentMethodMark method={option} size="sm" />
                      {t(`methods.${option}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-line">
          <button
            type="button"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((value) => !value)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium"
          >
            <span className="flex items-center gap-2 text-muted">
              <FileText className="h-4 w-4" />
              <MessageSquareText className="h-4 w-4" />
              {t('sales.pos.more')}
            </span>
            <ChevronDown
              className={cx('h-4 w-4 text-subtle transition', moreOpen && 'rotate-180')}
            />
          </button>
          {moreOpen && (
            <div className="space-y-3 border-t border-line px-3 py-3">
              <div className="grid grid-cols-[1fr_1.2fr] gap-2">
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
              <Field label={t('sales.form.notes')} optionalLabel={t('common.optional')}>
                {(id) => (
                  <textarea
                    id={id}
                    className="input min-h-16"
                    maxLength={500}
                    placeholder={t('sales.form.notesPlaceholder')}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                )}
              </Field>
            </div>
          )}
        </div>
      </div>
      <div className="shrink-0 border-t border-line bg-surface-2/60 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          type="submit"
          className="h-14 w-full text-lg"
          loading={create.isPending || saveCustomer.isPending}
          disabled={downTooHigh}
        >
          {t(credit ? 'sales.pos.confirmCredit' : 'sales.pos.confirm', {
            amount: fmt.money(credit ? total - down : total),
          })}
          <Kbd>{SAVE_KEY_LABEL}</Kbd>
        </Button>
      </div>
    </form>
  );

  return (
    <PosLayout
      panelOpen={panelOpen}
      onOpenPanel={() => setPanelOpen(true)}
      count={count}
      total={total}
      barLabel={t('sales.pos.viewTicket')}
      catalog={
        <ProductCatalog
          onPick={add}
          amountOf={(product) => product.price}
          showStock={modules.inventory}
          inCart={inCart}
          searchRef={searchRef}
          onCreate={(name) => {
            setNewName(name);
            setStep('ticket');
            setPanelOpen(true);
          }}
        />
      }
      panel={step === 'ticket' ? ticket : checkout}
    />
  );
}
