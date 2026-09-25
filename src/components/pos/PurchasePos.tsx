import { ArrowLeft, ChevronDown, FileText, Trash2, Truck, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Checkbox,
  Field,
  IconButton,
  SegmentedControl,
  TextButton,
  cx,
  useErrorToast,
  useFeedback,
} from '@/ui';
import { isSaveKey, isSearchKey, SAVE_KEY_LABEL } from './keys';
import { Kbd, PosLayout } from './PosLayout';
import { NewProductForm } from './NewProductForm';
import { ProductCatalog } from './ProductCatalog';
import { roundQuantity } from '../domain/quantity';
import { QuantityStepper } from '../domain/QuantityStepper';
import { useCreatePurchase, useSaveSupplier } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { ProductOption, SaleDocType, SupplierOption } from '../../lib/types';
import { SupplierPicker } from '../domain/SupplierPicker';

interface Line {
  product: ProductOption;
  /** How many: sacks/boxes when `inPacks`, otherwise the product's own unit. */
  quantity: number;
  /** Text of the cost input (what was paid this time): per sack/box when `inPacks`. */
  unitCost: string;
  /** Entered in the sack/box the product is bought in (`product.packSize`). */
  inPacks: boolean;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** The line in the product's unit, as the API and the stock count it. */
function inUnits(line: Line) {
  const cost = Number(line.unitCost) || 0;
  const size = line.product.packSize;
  if (!line.inPacks || size === null) return { quantity: line.quantity, unitCost: cost };
  return { quantity: roundQuantity(line.quantity * size), unitCost: round2(cost / size) };
}

/** Switches a line between sacks/boxes and the product's unit, keeping what it amounts to. */
function switchPacks(line: Line, inPacks: boolean): Line {
  const size = line.product.packSize;
  if (size === null || inPacks === line.inPacks) return line;
  const cost = Number(line.unitCost) || 0;
  const units = inUnits(line);
  return inPacks
    ? {
        ...line,
        inPacks,
        quantity: Math.max(1, Math.round(units.quantity / size)),
        unitCost: line.unitCost === '' ? '' : String(round2(cost * size)),
      }
    : {
        ...line,
        inPacks,
        quantity: units.quantity,
        unitCost: line.unitCost === '' ? '' : String(units.unitCost),
      };
}

const DOC_TYPES: SaleDocType[] = ['receipt', 'invoice', 'sale_note'];

/**
 * Goods that arrived, like at a point of sale: tap or scan the products on the left (with their
 * last cost and stock), and on the right say how many and what each one cost — in sacks/boxes
 * when the product is bought that way. The stock goes up and the product costs are updated.
 * Supplier and invoice are optional. Keyboard: Alt+S (Option+S on a Mac) save, Alt+B search.
 */
export function PurchasePos({
  onClose,
  onDirty,
}: {
  onClose: () => void;
  onDirty: (dirty: boolean) => void;
}) {
  const { t, fmt } = useI18n();
  const { toast, confirm } = useFeedback();
  const create = useCreatePurchase();
  const saveSupplier = useSaveSupplier();
  const searchRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  // A product being created on the spot (its name so far), or null.
  const [newName, setNewName] = useState<string | null>(null);
  const [supplier, setSupplier] = useState<SupplierOption | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [docType, setDocType] = useState<SaleDocType>('invoice');
  const [docNumber, setDocNumber] = useState('');
  const [updateCosts, setUpdateCosts] = useState(true);

  const total = round2(
    lines.reduce((sum, line) => sum + line.quantity * (Number(line.unitCost) || 0), 0),
  );
  const count = lines.length;
  const inCart = new Map(lines.map((line) => [line.product.id, line.quantity] as const));

  useEffect(() => onDirty(lines.length > 0), [lines.length, onDirty]);

  const add = (product: ProductOption) =>
    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id) ?? null;
      if (existing !== null) {
        return current.map((line) =>
          line === existing ? { ...line, quantity: roundQuantity(line.quantity + 1) } : line,
        );
      }
      // Bought in sacks/boxes: the line starts with one of them, at the last cost of one.
      const inPacks = product.packSize !== null;
      const cost =
        product.cost === null
          ? ''
          : String(inPacks ? round2(product.cost * product.packSize!) : product.cost);
      return [...current, { product, quantity: 1, unitCost: cost, inPacks }];
    });
  const update = (id: string, changes: Partial<Line>) =>
    setLines((current) =>
      current.map((line) => (line.product.id === id ? { ...line, ...changes } : line)),
    );
  const remove = (id: string) =>
    setLines((current) => current.filter((line) => line.product.id !== id));
  const clear = async () => {
    const ok = await confirm({
      title: t('purchases.pos.clearTitle'),
      message: t('purchases.pos.clearMessage'),
      confirmLabel: t('sales.pos.clear'),
      cancelLabel: t('common.cancel'),
    });
    if (ok) {
      setLines([]);
      setPanelOpen(false);
    }
  };

  const createSupplier = async (name: string) => {
    try {
      const created = await saveSupplier.mutateAsync({ name });
      setSupplier({ id: created.id, name: created.name, phone: created.phone });
    } catch (error) {
      toast.apiError(error);
    }
  };

  // Keyboard: Alt+S (Option+S on a Mac) save, Alt+B search.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isSearchKey(event)) {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (isSaveKey(event)) {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const items = lines
      .filter((line) => line.quantity > 0)
      .map((line) => ({ productId: line.product.id, ...inUnits(line) }));
    if (items.length === 0) {
      toast.warning(t('sales.form.empty'));
      return;
    }
    const purchase = await create.mutateAsync({
      ...(supplier !== null && { supplierId: supplier.id }),
      ...(docNumber.trim() !== '' && { docType, docNumber: docNumber.trim() }),
      updateCosts,
      items,
    });
    toast.success(t('purchases.saved', { number: purchase.number }), t('purchases.savedHint'));
    onClose();
  };

  useErrorToast(create.error);

  const panel = (
    <form
      ref={formRef}
      onSubmit={(event) => void submit(event).catch(() => null)}
      className="flex h-full min-h-0 flex-col"
    >
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
          <h3 className="font-semibold">{t('purchases.pos.ticket')}</h3>
          {count > 0 && (
            <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-semibold text-muted tabular-nums">
              {fmt.number(count)}
            </span>
          )}
        </div>
        {count > 0 && (
          <TextButton size="sm" onClick={() => void clear()}>
            <Trash2 className="h-4 w-4" />
            {t('sales.pos.clear')}
          </TextButton>
        )}
      </div>

      <div className="shrink-0 border-b border-line px-4 py-3">
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {newName !== null && (
          <NewProductForm
            mode="purchase"
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
              <Truck className="h-7 w-7 text-subtle" />
            </span>
            {t('purchases.pos.emptyTicket')}
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {lines.map((line) => {
              const unit = t(`products.unitsShort.${line.product.unit}`);
              const units = inUnits(line);
              return (
                <li key={line.product.id} className="animate-page-in space-y-2 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug font-semibold">{line.product.name}</p>
                      {line.product.trackStock && (
                        <p className="text-xs text-muted">
                          {t('purchases.form.stockAfter', {
                            from: fmt.number(line.product.stock),
                            to: fmt.number(roundQuantity(line.product.stock + units.quantity)),
                          })}
                        </p>
                      )}
                    </div>
                    <span className="pt-0.5 font-semibold tabular-nums">
                      {fmt.money(line.quantity * (Number(line.unitCost) || 0))}
                    </span>
                    <IconButton
                      size="sm"
                      label={t('sales.form.remove', { name: line.product.name })}
                      onClick={() => remove(line.product.id)}
                      className="-mt-1 -mr-2 hover:text-danger-ink"
                    >
                      <X className="h-4 w-4" />
                    </IconButton>
                  </div>
                  {line.product.packSize !== null && (
                    <SegmentedControl
                      label={t('purchases.form.howCounted')}
                      value={line.inPacks ? 'packs' : 'units'}
                      onChange={(value) =>
                        setLines((current) =>
                          current.map((item) =>
                            item === line ? switchPacks(item, value === 'packs') : item,
                          ),
                        )
                      }
                      options={[
                        {
                          value: 'packs',
                          label: t('purchases.form.byPack', {
                            size: fmt.number(line.product.packSize),
                            unit,
                          }),
                        },
                        { value: 'units', label: t('purchases.form.byUnit', { unit }) },
                      ]}
                    />
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <QuantityStepper
                      value={line.quantity}
                      onChange={(quantity) => update(line.product.id, { quantity })}
                      onRemove={() => remove(line.product.id)}
                    />
                    <span className="text-xs text-muted">×</span>
                    <label className="relative w-32">
                      <span className="sr-only">
                        {line.inPacks ? t('purchases.form.packCost') : t('purchases.form.unitCost')}
                      </span>
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
                        placeholder={
                          line.inPacks ? t('purchases.form.packCost') : t('purchases.form.unitCost')
                        }
                        value={line.unitCost}
                        onChange={(event) =>
                          update(line.product.id, { unitCost: event.target.value })
                        }
                      />
                    </label>
                    <span className="text-xs text-muted">
                      {line.inPacks
                        ? t('purchases.pos.perPack')
                        : t('purchases.pos.perUnit', { unit })}
                    </span>
                  </div>
                  {line.inPacks && (
                    <p className="text-xs font-medium text-ink">
                      {t('purchases.form.packEquals', {
                        quantity: fmt.number(units.quantity),
                        unit,
                        cost: fmt.money(units.unitCost),
                      })}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 space-y-3 border-t border-line bg-surface-2/60 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="rounded-2xl border border-line bg-surface">
          <button
            type="button"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((value) => !value)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium"
          >
            <span className="flex items-center gap-2 text-muted">
              <FileText className="h-4 w-4" />
              {t('purchases.pos.more')}
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
                      placeholder="F001-000123"
                      value={docNumber}
                      onChange={(event) => setDocNumber(event.target.value)}
                    />
                  )}
                </Field>
              </div>
              <Checkbox
                checked={updateCosts}
                onChange={setUpdateCosts}
                label={t('purchases.form.updateCosts')}
                hint={t('purchases.form.updateCostsHint')}
              />
            </div>
          )}
        </div>
        <p className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-muted">{t('purchases.form.total')}</span>
          <span className="font-display text-4xl font-semibold tabular-nums">
            {fmt.money(total)}
          </span>
        </p>
        <button
          type="submit"
          disabled={lines.length === 0 || create.isPending}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-primary text-lg font-semibold text-on-primary shadow-pop transition hover:brightness-110 active:scale-[0.99] disabled:bg-surface-3 disabled:text-muted disabled:shadow-none"
        >
          <Truck className="h-5 w-5" />
          {t('purchases.form.submit', { amount: fmt.money(total) })}
          <Kbd>{SAVE_KEY_LABEL}</Kbd>
        </button>
      </div>
    </form>
  );

  return (
    <PosLayout
      panelOpen={panelOpen}
      onOpenPanel={() => setPanelOpen(true)}
      count={count}
      total={total}
      barLabel={t('purchases.pos.viewTicket')}
      catalog={
        <ProductCatalog
          onPick={add}
          amountOf={(product) => product.cost}
          amountLabel={t('purchases.pos.cost')}
          showStock
          purchase
          inCart={inCart}
          searchRef={searchRef}
          onCreate={(name) => {
            setNewName(name);
            setPanelOpen(true);
          }}
        />
      }
      panel={panel}
    />
  );
}
