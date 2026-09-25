import type { UseQueryResult } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx, Spinner } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useFloatingPosition } from './useFloatingPosition';
import { useDebouncedValue, usePendingEnter } from './useSearchBox';

/**
 * Search box for forms over a light lookup endpoint: type a few letters, pick a match, or (with
 * `create`) the last option "Nuevo … «text»". Shared by the customer and supplier pickers.
 *
 * The list floats over everything (fixed position); inside a modal it is rendered in the
 * <dialog> itself, so neither the modal body's scroll nor its edges cut it. Enter waits for the
 * results of what is typed (never picks a stale match); Escape closes only the list.
 */
export function SearchPicker<T extends { id: string }>({
  id,
  placeholder,
  useLookup,
  renderOption,
  onPick,
  create = null,
  emptyText,
  autoFocus = false,
  disabled = false,
}: {
  id?: string;
  placeholder: string;
  /** The TanStack Query hook of the lookup (called with the debounced text). */
  useLookup: (search: string) => UseQueryResult<{ data: T[] }>;
  /** Content of one option (icon, name, extra line). */
  renderOption: (item: T) => ReactNode;
  onPick: (item: T) => void;
  /** Offered as the last option once 2+ characters are typed. */
  create?: {
    label: (text: string) => string;
    onCreate: (text: string) => void;
    icon?: ReactNode;
  } | null;
  /** Shown when nothing matches (receives the typed text, empty before typing). */
  emptyText: (text: string) => string;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const listId = useId();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  const debounced = useDebouncedValue(text.trim());
  const lookup = useLookup(debounced);
  const results = lookup.data?.data ?? null;
  const matches = results ?? [];
  const fresh = !lookup.isPlaceholderData && debounced === text.trim() && results !== null;
  const canCreate = create !== null && text.trim().length >= 2;
  const options = matches.length + (canCreate ? 1 : 0);
  const position = useFloatingPosition(anchor, open);

  const pick = (index: number) => {
    const match = matches[index];
    if (match) onPick(match);
    else if (canCreate) create.onCreate(text.trim());
    else return;
    pending.cancel();
    setText('');
    setOpen(false);
  };
  const pending = usePendingEnter({
    fresh,
    results,
    onEnter: (found) => {
      if (found.length > 0 || canCreate)
        pick(Math.min(active, found.length + (canCreate ? 0 : -1)));
    },
  });

  // Close when clicking outside the box and the list.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!box.current?.contains(target) && !list.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const option = (index: number) => ({
    role: 'option' as const,
    'aria-selected': index === active,
    onPointerDown: (event: React.PointerEvent) => event.preventDefault(),
    onClick: () => pick(index),
    onMouseEnter: () => setActive(index),
  });

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
        aria-autocomplete="list"
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        value={text}
        // Opens on tap or typing, not on focus: forms focus this box on open, and a list popping
        // up by itself would cover the form.
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setText(event.target.value);
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
          } else if (event.key === 'Enter' && open) {
            event.preventDefault();
            pending.enter();
          } else if (event.key === 'Escape' && open) {
            // Only the list closes, not the modal around it.
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
              ...(position === null
                ? { top: -9999 }
                : position.top !== null
                  ? { top: position.top }
                  : { bottom: position.bottom ?? 0 }),
              left: position?.left ?? -9999,
              width: position?.width,
              maxHeight: position?.maxHeight,
            }}
            className="animate-fade-in z-50 overflow-auto rounded-xl border border-line bg-surface p-1 shadow-pop"
          >
            {matches.map((item, index) => (
              <li
                key={item.id}
                {...option(index)}
                className={cx(
                  'flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm',
                  index === active && 'bg-surface-3',
                )}
              >
                {renderOption(item)}
              </li>
            ))}
            {canCreate && (
              <li
                {...option(matches.length)}
                className={cx(
                  'flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-primary-ink',
                  active === matches.length && 'bg-primary-soft',
                )}
              >
                {create.icon ?? <Plus className="h-4 w-4 shrink-0" />}
                {create.label(text.trim())}
              </li>
            )}
            {fresh && options === 0 && (
              <li className="px-3 py-3 text-sm text-muted">{emptyText(text.trim())}</li>
            )}
          </ul>,
          anchor.closest('dialog') ?? document.body,
        )}
    </div>
  );
}

/** What a picker shows once something is chosen: who/what, an extra line and "Cambiar". */
export function PickedChip({
  icon,
  title,
  subtitle = null,
  onClear,
  disabled = false,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: ReactNode;
  onClear: () => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary-soft/50 px-3 py-2">
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {subtitle && <span className="block text-xs text-muted">{subtitle}</span>}
      </span>
      {!disabled && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary-ink hover:bg-surface"
        >
          <X className="h-3.5 w-3.5" />
          {t('picker.change')}
        </button>
      )}
    </div>
  );
}
