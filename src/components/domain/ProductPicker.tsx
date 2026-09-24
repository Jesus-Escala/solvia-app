import { Plus, ScanBarcode } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx, Spinner } from '@/ui';
import { useQueryClient } from '@tanstack/react-query';
import { productLookupQuery, useProductLookup } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { ProductOption } from '../../lib/types';
import { useFloatingPosition } from './useFloatingPosition';
import { useDebouncedValue } from './useSearchBox';

/**
 * Search box to add products to a sale: type part of the name, or scan / type a barcode and
 * press Enter (an exact code match is added right away). It asks the light
 * `/products/lookup` endpoint (8 results, cached, previous request cancelled) and Enter always
 * waits for the results of what is typed. The box empties after each product so the next one
 * can be scanned. `showStock` adds what is left of each product.
 */
export function ProductPicker({
  onPick,
  showStock = false,
  autoFocus = false,
}: {
  onPick: (product: ProductOption) => void;
  showStock?: boolean;
  autoFocus?: boolean;
}) {
  const { t, fmt } = useI18n();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  const [text, setText] = useState('');
  const debounced = useDebouncedValue(text.trim());
  const lookup = useProductLookup(debounced);
  const matches = lookup.data?.data ?? [];
  // The list may still show the previous text's results while the new ones load.
  const results = lookup.data?.data ?? null;
  const fresh = !lookup.isPlaceholderData && debounced === text.trim() && results !== null;

  const queryClient = useQueryClient();
  // Enters resolved in order, even when a scanner sends the next code before the first answer.
  const queue = useRef<Promise<void>>(Promise.resolve());

  const pick = (product: ProductOption) => {
    onPick(product);
    setText('');
    setActive(0);
    // The list closes so the cart shows; typing opens it again.
    setOpen(false);
    input.current?.focus();
  };

  /** The exact code wins (a scanned barcode), otherwise the highlighted / first result. */
  const choose = (options: ProductOption[], typed: string, index: number) =>
    options.find((product) => product.code !== null && product.code === typed) ??
    options[Math.min(index, options.length - 1)] ??
    null;

  /**
   * Enter: with the results of what is typed on screen, pick right away. Otherwise freeze the
   * text, empty the box for the next code and look that text up on its own (cached when it was
   * already searched), adding the product when the answer arrives.
   */
  const enter = () => {
    const typed = text.trim();
    if (typed === '' && !fresh) return;
    if (fresh && results !== null) {
      const chosen = choose(results, typed, active);
      if (chosen !== null) pick(chosen);
      return;
    }
    setText('');
    setActive(0);
    setOpen(false);
    queue.current = queue.current.then(async () => {
      try {
        const answer = await queryClient.fetchQuery(productLookupQuery(typed));
        const chosen = choose(answer.data, typed, 0);
        if (chosen !== null) onPick(chosen);
        else setNotFound(typed);
      } catch {
        setNotFound(typed);
      }
    });
  };
  const [notFound, setNotFound] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!box.current?.contains(target) && !list.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const position = useFloatingPosition(anchor, open);

  return (
    <div
      ref={(element) => {
        box.current = element;
        setAnchor(element);
      }}
      className="relative"
    >
      <ScanBarcode className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-subtle" />
      <input
        ref={input}
        className="input h-12 pr-10 pl-11 text-base"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-busy={!fresh}
        aria-label={t('sales.form.search')}
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={t('sales.form.search')}
        value={text}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setNotFound(null);
          setText(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActive((index) => Math.min(index + 1, matches.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter') {
            event.preventDefault();
            enter();
          } else if (event.key === 'Escape' && open) {
            // Close only the list, not the modal around it.
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
      {notFound !== null && text === '' && (
        <p className="mt-1 text-xs text-warning-ink" role="status">
          {t('sales.form.codeNotFound', { code: notFound })}
        </p>
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
            className={cx(
              'animate-fade-in z-50 overflow-auto rounded-xl border border-line bg-surface p-1 shadow-pop transition-opacity',
              // Previous results stay visible (no flicker) but faded while the new ones load.
              !fresh && 'opacity-60',
            )}
          >
            {matches.map((product, index) => {
              const low =
                showStock && product.trackStock && product.stock <= (product.minStock ?? 0);
              return (
                <li
                  key={product.id}
                  role="option"
                  aria-selected={index === active}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => pick(product)}
                  onMouseEnter={() => setActive(index)}
                  className={cx(
                    'flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm',
                    index === active && 'bg-surface-3',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{product.name}</span>
                    {showStock && product.trackStock && (
                      <span
                        className={cx('block text-xs', low ? 'text-warning-ink' : 'text-muted')}
                      >
                        {t('sales.form.left', { count: fmt.number(product.stock) })}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {fmt.money(product.price)}
                  </span>
                  <Plus className="h-4 w-4 shrink-0 text-primary-ink" aria-hidden="true" />
                </li>
              );
            })}
            {fresh && matches.length === 0 && (
              <li className="px-3 py-3 text-sm text-muted">
                {text.trim() ? t('sales.form.noProducts') : t('sales.form.noCatalog')}
              </li>
            )}
          </ul>,
          anchor.closest('dialog') ?? document.body,
        )}
    </div>
  );
}
