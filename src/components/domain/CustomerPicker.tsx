import { Check, Search, UserPlus, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { cx } from '@/ui';
import { useCustomers } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';

export interface PickedCustomer {
  id: string;
  name: string;
  phone?: string;
  outstanding?: number;
}

/**
 * Customer search box for forms: type a few letters, pick from the matches (with what they owe)
 * or, with `onCreate`, choose "Nuevo cliente «…»" to create one on the spot.
 */
export function CustomerPicker({
  id,
  value,
  onChange,
  onCreate,
  autoFocus = false,
  disabled = false,
}: {
  id?: string;
  value: PickedCustomer | null;
  onChange: (customer: PickedCustomer | null) => void;
  /** Offered as the last option with the typed text as the new customer's name. */
  onCreate?: (name: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const { t, fmt } = useI18n();
  const listId = useId();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [debounced, setDebounced] = useState('');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const customers = useCustomers({
    page: 1,
    pageSize: 8,
    search: debounced || undefined,
    // Without a search, the ones who owe the most first: usually who you are looking for.
    sortBy: debounced ? 'name' : 'outstanding',
    sortDir: debounced ? 'asc' : 'desc',
  });
  const matches = customers.data?.data ?? [];
  const canCreate = Boolean(onCreate && search.trim().length >= 2);
  const options = matches.length + (canCreate ? 1 : 0);

  const pick = (index: number) => {
    const match = matches[index];
    if (match) {
      onChange({
        id: match.id,
        name: match.name,
        phone: match.phone,
        outstanding: match.summary.totalOutstanding,
      });
      setSearch('');
      setOpen(false);
    } else if (canCreate) {
      onCreate?.(search.trim());
      setSearch('');
      setOpen(false);
    }
  };

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary-soft/50 px-3 py-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">
          {value.name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{value.name}</span>
          {value.outstanding !== undefined && value.outstanding > 0 && (
            <span className="block text-xs text-muted">
              {t('picker.owes', { amount: fmt.money(value.outstanding) })}
            </span>
          )}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary-ink hover:bg-surface"
          >
            <X className="h-3.5 w-3.5" />
            {t('picker.change')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={box} className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" />
      <input
        id={id}
        className="input pl-9"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={t('picker.placeholder')}
        value={search}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setSearch(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActive((index) => Math.min(index + 1, options - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter' && open && options > 0) {
            event.preventDefault();
            pick(active);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-40 mt-1 max-h-72 overflow-auto rounded-xl border border-line bg-surface p-1 shadow-pop"
        >
          {matches.map((customer, index) => (
            <li
              key={customer.id}
              role="option"
              aria-selected={index === active}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => pick(index)}
              onMouseEnter={() => setActive(index)}
              className={cx(
                'flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm',
                index === active && 'bg-surface-3',
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold text-muted">
                {customer.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{customer.name}</span>
              {customer.summary.totalOutstanding > 0 ? (
                <span className="shrink-0 text-xs text-muted tabular-nums">
                  {t('picker.owes', { amount: fmt.money(customer.summary.totalOutstanding) })}
                </span>
              ) : (
                <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
              )}
            </li>
          ))}
          {canCreate && (
            <li
              role="option"
              aria-selected={active === matches.length}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => pick(matches.length)}
              onMouseEnter={() => setActive(matches.length)}
              className={cx(
                'flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-primary-ink',
                active === matches.length && 'bg-primary-soft',
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                <UserPlus className="h-3.5 w-3.5" />
              </span>
              {t('picker.create', { name: search.trim() })}
            </li>
          )}
          {!customers.isLoading && options === 0 && (
            <li className="px-3 py-3 text-sm text-muted">
              {search.trim() ? t('picker.noResults') : t('picker.typeToSearch')}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
