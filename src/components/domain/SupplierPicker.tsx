import { Plus, Search, Truck, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx, Spinner } from '@/ui';
import { useSupplierLookup } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { SupplierOption } from '../../lib/types';
import { useFloatingPosition } from './useFloatingPosition';
import { useDebouncedValue, usePendingEnter } from './useSearchBox';

/**
 * Supplier search box: pick one from the light lookup, or "Nuevo proveedor «…»" to create it
 * with just its name (RUC and WhatsApp can be added later from Proveedores).
 */
export function SupplierPicker({
  id,
  value,
  onChange,
  onCreate,
}: {
  id: string;
  value: SupplierOption | null;
  onChange: (supplier: SupplierOption | null) => void;
  onCreate: (name: string) => void;
}) {
  const { t } = useI18n();
  const listId = useId();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  const debounced = useDebouncedValue(text.trim());
  const lookup = useSupplierLookup(debounced);
  const results = lookup.data?.data ?? null;
  const matches = results ?? [];
  const fresh = !lookup.isPlaceholderData && debounced === text.trim() && results !== null;
  const canCreate = text.trim().length >= 2;
  const position = useFloatingPosition(anchor, open);

  const pick = (index: number) => {
    const match = matches[index] ?? null;
    if (match !== null) onChange(match);
    else if (canCreate) onCreate(text.trim());
    pending.cancel();
    setText('');
    setOpen(false);
  };
  const pending = usePendingEnter({
    fresh,
    results,
    onEnter: (options) => pick(Math.min(active, options.length + (canCreate ? 0 : -1))),
  });

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!box.current?.contains(target) && !list.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  if (value !== null) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary-soft/50 px-3 py-2">
        <Truck className="h-4 w-4 shrink-0 text-primary-ink" />
        <span className="min-w-0 flex-1 truncate font-medium">{value.name}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary-ink hover:bg-surface"
        >
          <X className="h-3.5 w-3.5" />
          {t('picker.change')}
        </button>
      </div>
    );
  }

  const options = matches.length + (canCreate ? 1 : 0);
  return (
    <div
      ref={(element) => {
        box.current = element;
        setAnchor(element);
      }}
      className="relative"
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" />
      <input
        id={id}
        className="input pr-9 pl-9"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        autoComplete="off"
        placeholder={t('purchases.form.supplierPlaceholder')}
        value={text}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setText(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((index) => Math.min(index + 1, options - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter' && open) {
            event.preventDefault();
            pending.enter();
          } else if (event.key === 'Escape' && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }
        }}
      />
      {!fresh && text.trim() !== '' && (
        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-subtle">
          <Spinner className="h-4 w-4" />
        </span>
      )}
      {open &&
        anchor &&
        createPortal(
          <ul
            ref={list}
            id={listId}
            role="listbox"
            style={{
              position: 'fixed',
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              width: position?.width,
              maxHeight: position?.maxHeight,
            }}
            className="animate-fade-in z-50 overflow-auto rounded-xl border border-line bg-surface p-1 shadow-pop"
          >
            {matches.map((supplier, index) => (
              <li
                key={supplier.id}
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
                <Truck className="h-4 w-4 shrink-0 text-subtle" />
                <span className="min-w-0 flex-1 truncate font-medium">{supplier.name}</span>
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
                <Plus className="h-4 w-4 shrink-0" />
                {t('purchases.form.newSupplier', { name: text.trim() })}
              </li>
            )}
            {fresh && options === 0 && (
              <li className="px-3 py-3 text-sm text-muted">{t('purchases.form.noSuppliers')}</li>
            )}
          </ul>,
          anchor.closest('dialog') ?? document.body,
        )}
    </div>
  );
}
