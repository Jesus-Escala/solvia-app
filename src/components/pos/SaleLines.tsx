import { CheckCircle2, Pencil, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Button, cx, IconButton } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { Sale } from '../../lib/types';
import { MoneyInput } from '../domain/MoneyInput';
import { limitMoneyText, moneyText } from '../../lib/moneyText';
import { isWeighed, roundQuantity, WEIGHED_PRESETS } from '../domain/quantity';
import { money, onEnter, round2, stepFor, type Line } from './saleMath';
import { QuantityStepper } from '../domain/QuantityStepper';
import type { CashGiven } from './saleTicket';
import { TicketActions } from './TicketActions';

/** Bills a customer usually pays with (PEN), for the change. */
const BILLS = [10, 20, 50, 100, 200];

/**
 * One line of the ticket: name and subtotal, the price (tap it to charge another price this
 * time), − / quantity / +. Kilos and liters get ¼ · ½ · 1 buttons, grams under a kilo, and
 * "Por monto" to sell by an amount of money ("dame S/ 2 de arroz").
 */
export function LineRow({
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
    <li className="animate-page-in space-y-2 px-4 py-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug font-semibold">
            {line.description}
            {product === null && (
              <span className="ml-1.5 text-xs font-normal text-muted">
                {t('sales.form.freeBadge')}
              </span>
            )}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-xs text-muted">
            {priceText === null ? (
              <button
                type="button"
                onClick={() => setPriceText(moneyText(line.price))}
                title={t('sales.form.editPrice')}
                className="inline-flex items-center gap-1 rounded font-medium text-ink hover:text-primary-ink"
              >
                {fmt.money(line.price)}
                <Pencil className="h-3 w-3 text-subtle" />
              </button>
            ) : (
              <input
                aria-label={t('sales.form.editPrice')}
                className="input h-7 w-24 text-right text-xs tabular-nums"
                inputMode="decimal"
                autoFocus
                value={priceText}
                onChange={(event) => setPriceText(limitMoneyText(event.target.value))}
                onBlur={commitPrice}
                onKeyDown={onEnter(commitPrice)}
              />
            )}
            {product !== null && line.price !== product.price && (
              <span className="line-through">{fmt.money(product.price)}</span>
            )}
            {product !== null && <span>/ {t(`products.unitsShort.${unit}`)}</span>}
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
        <span className="pt-0.5 text-right font-semibold tabular-nums">
          {fmt.money(round2(line.quantity * line.price))}
        </span>
        <IconButton
          size="sm"
          label={t('sales.form.remove', { name: line.description })}
          onClick={onRemove}
          className="-mt-1 -mr-2 hover:text-danger-ink"
        >
          <X className="h-4 w-4" />
        </IconButton>
      </div>
      <div className="flex items-center gap-1.5">
        <QuantityStepper
          value={line.quantity}
          step={stepFor(unit)}
          onChange={(quantity) => onChange({ quantity: Math.max(0, roundQuantity(quantity)) })}
          onRemove={onRemove}
        />
      </div>
      {weighed && (
        <div className="flex flex-wrap items-center gap-1.5">
          {WEIGHED_PRESETS.map((amount) => (
            <button
              key={amount}
              type="button"
              aria-pressed={line.quantity === amount}
              onClick={() => onChange({ quantity: amount })}
              className={cx(
                'h-9 rounded-lg border px-2 text-xs font-semibold tabular-nums transition',
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
              className="h-9 rounded-lg border border-line px-2 text-xs font-semibold text-muted transition hover:bg-surface-2 hover:text-ink"
            >
              {t('sales.form.byAmount')}
            </button>
          ) : (
            <span className="flex items-center gap-1">
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

/** "¿Con cuánto paga?": quick bills and the change to give back, big. */
export function ChangeCalculator({
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
    <div className="rounded-2xl border border-line p-3">
      <p className="label">{t('sales.form.received')}</p>
      <div className="grid grid-cols-4 gap-1.5">
        {[total, ...bills].map((amount, index) => (
          <button
            key={amount}
            type="button"
            onClick={() => onChange(moneyText(amount))}
            className={cx(
              'h-11 rounded-xl border text-sm font-semibold tabular-nums transition active:scale-[0.97]',
              received === amount
                ? 'border-primary bg-primary-soft text-primary-ink'
                : 'border-line text-ink hover:bg-surface-2',
            )}
          >
            {index === 0 ? t('sales.form.exact') : fmt.money(amount).replace(/[.,]00$/, '')}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <MoneyInput className="w-36" value={text} onChange={onChange} placeholder="0.00" />
        {received > 0 && (
          <p
            className={cx(
              'min-w-0 flex-1 text-right font-display text-xl font-semibold tabular-nums',
              difference >= 0 ? 'text-success-ink' : 'text-danger-ink',
            )}
          >
            {difference >= 0
              ? t('sales.form.change', { amount: fmt.money(difference) })
              : t('sales.form.missing', { amount: fmt.money(-difference) })}
          </p>
        )}
      </div>
    </div>
  );
}

/** After saving: the amount, the change, and the ticket (print or WhatsApp). */
export function SaleDone({
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
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-6">
      <div className="animate-page-in w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="animate-pop-in flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
            <CheckCircle2 className="h-9 w-9 text-success" />
          </span>
          <p className="mt-2 text-lg font-semibold">
            {t('sales.done.title', { number: sale.number })}
          </p>
          <p className="font-display text-5xl font-semibold tabular-nums">
            {fmt.money(sale.total)}
          </p>
          {cash && cash.change > 0 && (
            <p className="mt-1 rounded-full bg-success-soft px-4 py-1.5 text-lg font-semibold text-success-ink">
              {t('sales.done.change', { amount: fmt.money(cash.change) })}
            </p>
          )}
          {sale.receivable && (
            <p className="text-sm text-muted">
              {t('sales.done.owes', { amount: fmt.money(sale.receivable.outstanding) })}
            </p>
          )}
        </div>
        <TicketActions sale={sale} cash={cash} className="sm:grid-cols-2" />
        <div className="grid gap-2">
          <Button
            className="h-12 text-base"
            icon={<Plus className="h-5 w-5" />}
            onClick={onAnother}
            data-autofocus
          >
            {t('sales.done.another')}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t('sales.done.close')}
          </Button>
        </div>
      </div>
    </div>
  );
}
