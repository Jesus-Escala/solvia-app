import { Banknote, Check, Landmark } from 'lucide-react';
import { cx } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { PaymentMethod } from '../../lib/types';

const METHODS: PaymentMethod[] = ['yape', 'plin', 'cash', 'bank_transfer'];

/**
 * Wallet apps use their official app icons (public/brands: Yape from Wikimedia Commons,
 * CC BY-SA 4.0 by BCP; Plin from plin.pe); cash and transfers a matching icon.
 */
const MARKS: Record<PaymentMethod, { className: string; content: React.ReactNode }> = {
  yape: { className: 'overflow-hidden', content: <img src="/brands/yape.png" alt="" /> },
  plin: { className: 'overflow-hidden', content: <img src="/brands/plin.png" alt="" /> },
  cash: { className: 'bg-success-soft text-success shadow-sm', content: <Banknote /> },
  bank_transfer: { className: 'bg-info-soft text-info shadow-sm', content: <Landmark /> },
};

/** Small square badge that identifies a payment method at a glance. */
export function PaymentMethodMark({
  method,
  size = 'md',
}: {
  method: PaymentMethod;
  size?: 'sm' | 'md';
}) {
  const mark = MARKS[method];
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex shrink-0 items-center justify-center leading-none [&>img]:h-full [&>img]:w-full [&>img]:object-cover',
        size === 'sm'
          ? 'h-5 w-5 rounded-md text-[11px] [&>svg]:h-3 [&>svg]:w-3'
          : 'h-9 w-9 rounded-xl text-lg [&>svg]:h-[18px] [&>svg]:w-[18px]',
        mark.className,
      )}
    >
      {mark.content}
    </span>
  );
}

/** Method name with its mark, for tables and lists. */
export function PaymentMethodLabel({ method }: { method: PaymentMethod }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1.5 font-medium">
      <PaymentMethodMark method={method} size="sm" />
      {t(`methods.${method}`)}
    </span>
  );
}

/** Tile picker for the payment method: each option shows its mark; the chosen one is tinted. */
export function PaymentMethodPicker({
  value,
  onChange,
  label,
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  label: string;
}) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {METHODS.map((method) => {
        const active = value === method;
        return (
          <button
            key={method}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(method)}
            className={cx(
              'relative flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition sm:flex-col sm:gap-2 sm:px-2 sm:py-3 sm:text-center',
              active
                ? 'border-primary bg-primary-soft text-primary-ink shadow-sm ring-2 ring-primary/25'
                : 'border-line bg-surface text-muted hover:border-line-strong hover:bg-surface-2 hover:text-ink',
            )}
          >
            <PaymentMethodMark method={method} />
            <span className="min-w-0 truncate">{t(`methods.${method}`)}</span>
            {active && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-on-primary">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
