import { CheckCircle2, Plus, Split, X } from 'lucide-react';
import { cx, IconButton, TextButton } from '@/ui';
import { MoneyInput } from './MoneyInput';
import { PaymentMethodMark } from './PaymentMethods';
import { useI18n } from '../../i18n/I18nProvider';
import type { PaymentMethod, PaymentPart } from '../../lib/types';
import {
  asText,
  MAX_PARTS,
  METHODS,
  newPartKey,
  partsSum,
  round2,
  type MethodChoice,
  type PartDraft,
} from './splitParts';

/**
 * A payment made with several methods (part in cash, part with Yape…): one row per method with
 * its amount. With a `target`, the last row keeps the rest while the others are typed, and a
 * line says what is missing or over; without one (a down payment), the rows are the amount.
 */
export function SplitPayments({
  parts,
  onChange,
  target,
}: {
  parts: PartDraft[];
  onChange: (parts: PartDraft[]) => void;
  target: number | null;
}) {
  const { t, fmt } = useI18n();
  const sum = partsSum(parts);
  const left = target === null ? 0 : round2(target - sum);

  const edit = (index: number, changes: Partial<PartDraft>) => {
    const next = parts.map((part, i) => (i === index ? { ...part, ...changes } : part));
    // Typing an amount in any row but the last: the last one takes what is left.
    if (target !== null && changes.text !== undefined && index < next.length - 1) {
      const others = partsSum(next.slice(0, -1));
      next[next.length - 1] = {
        ...next[next.length - 1]!,
        text: asText(Math.max(0, target - others)),
      };
    }
    onChange(next);
  };

  const add = () => {
    const used = new Set(parts.map((part) => part.method));
    const method = METHODS.find((option) => !used.has(option)) ?? 'cash';
    onChange([...parts, { key: newPartKey(), method, text: asText(Math.max(0, left)) }]);
  };

  const remove = (index: number) => onChange(parts.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {parts.map((part, index) => (
          <li key={part.key} className="flex items-center gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">{t('split.method')}</span>
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2">
                <PaymentMethodMark method={part.method} size="sm" />
              </span>
              <select
                className="input pl-9"
                value={part.method}
                onChange={(event) => edit(index, { method: event.target.value as PaymentMethod })}
              >
                {METHODS.map((method) => (
                  <option key={method} value={method}>
                    {t(`methods.${method}`)}
                  </option>
                ))}
              </select>
            </label>
            <MoneyInput
              className="w-32 shrink-0"
              value={part.text}
              onChange={(text) => edit(index, { text })}
              {...(index === 0 && part.text === '' && { autoFocus: true })}
            />
            {parts.length > 2 ? (
              <IconButton size="sm" label={t('split.remove')} onClick={() => remove(index)}>
                <X className="h-4 w-4" />
              </IconButton>
            ) : (
              <span className="w-8 shrink-0" aria-hidden="true" />
            )}
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-2">
        {parts.length < MAX_PARTS ? (
          <TextButton size="sm" onClick={add}>
            <Plus className="h-4 w-4" />
            {t('split.add')}
          </TextButton>
        ) : (
          <span />
        )}
        {target === null ? (
          <span className="text-sm font-semibold tabular-nums">
            {t('split.sum', { amount: fmt.money(sum) })}
          </span>
        ) : (
          <span
            className={cx(
              'inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums',
              Math.abs(left) < 0.005
                ? 'text-success-ink'
                : left > 0
                  ? 'text-warning-ink'
                  : 'text-danger-ink',
            )}
          >
            {Math.abs(left) < 0.005 ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {t('split.complete')}
              </>
            ) : left > 0 ? (
              t('split.missing', { amount: fmt.money(left) })
            ) : (
              t('split.over', { amount: fmt.money(-left) })
            )}
          </span>
        )}
      </div>
    </div>
  );
}

/** "Efectivo S/ 4.00 + Yape S/ 3.00" (or just "Yape" when there is one), for lists and details. */
export function PaymentPartsLabel({
  parts,
  amounts = true,
}: {
  parts: PaymentPart[];
  amounts?: boolean;
}) {
  const { t, fmt } = useI18n();
  if (parts.length === 1) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <PaymentMethodMark method={parts[0]!.method} size="sm" />
        {t(`methods.${parts[0]!.method}`)}
      </span>
    );
  }
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      {parts.map((part, index) => (
        <span key={part.method} className="inline-flex items-center gap-1.5">
          {index > 0 && <span className="text-subtle">+</span>}
          <PaymentMethodMark method={part.method} size="sm" />
          {amounts ? (
            <span className="tabular-nums">{fmt.money(part.amount)}</span>
          ) : (
            t(`methods.${part.method}`)
          )}
        </span>
      ))}
    </span>
  );
}

/**
 * Compact row to choose how something was paid: the four methods and, at the end, "Varios"
 * (several methods), used for down payments and purchases.
 */
export function MethodRow({
  value,
  onChange,
  label,
}: {
  value: MethodChoice;
  onChange: (value: MethodChoice) => void;
  label: string;
}) {
  const { t } = useI18n();
  const options: MethodChoice[] = [...METHODS, 'split'];
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5">
      {options.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            title={option === 'split' ? t('split.option') : t(`methods.${option}`)}
            onClick={() => onChange(option)}
            className={cx(
              'flex min-w-0 flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-xs font-semibold transition active:scale-[0.97]',
              active
                ? 'border-primary bg-primary-soft text-primary-ink ring-2 ring-primary/25'
                : 'border-line text-muted hover:bg-surface-2 hover:text-ink',
            )}
          >
            {option === 'split' ? <SplitMark /> : <PaymentMethodMark method={option} />}
            <span className="max-w-full truncate">
              {option === 'split' ? t('split.option') : t(`methodsShort.${option}`)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The mark of "Varios": two methods at once. */
export function SplitMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex shrink-0 items-center justify-center bg-primary-soft text-primary-ink',
        size === 'sm'
          ? 'h-5 w-5 rounded-md [&>svg]:h-3 [&>svg]:w-3'
          : 'h-9 w-9 rounded-xl [&>svg]:h-[18px] [&>svg]:w-[18px]',
      )}
    >
      <Split />
    </span>
  );
}
