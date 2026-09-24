import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useErrorText } from '../i18n/useErrorText';
import { ApiError } from '../lib/http';
import { useUiI18n } from '../i18n/context';
import { Button } from './Button';
import { cx } from './cx';
import { Spinner } from './Feedback';
import { Modal } from './Modal';

// --- Popover / Menu -----------------------------------------------------------------

interface PopoverProps {
  /** Renders the trigger; `toggle` opens/closes the popover. */
  trigger: (props: {
    open: boolean;
    toggle: () => void;
    ref: (node: HTMLElement | null) => void;
  }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'start' | 'end';
  width?: number;
}

/**
 * Floating panel rendered in a portal with fixed positioning, so it is never clipped by scroll
 * containers (e.g. row actions inside a table). Closes on outside click, Escape, scroll or resize.
 */
export function Popover({ trigger, children, align = 'end', width = 224 }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number; maxHeight: number } | null>(
    null,
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const panelHeight = panelRef.current?.offsetHeight ?? 200;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const openUp = spaceBelow < panelHeight && rect.top > spaceBelow;
    const left = align === 'end' ? rect.right - width : rect.left;
    setPosition({
      top: openUp ? Math.max(8, rect.top - panelHeight - 6) : rect.bottom + 6,
      left: Math.min(Math.max(8, left), window.innerWidth - width - 8),
      maxHeight: Math.max(160, openUp ? rect.top - 16 : spaceBelow),
    });
  }, [open, anchor, align, width]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !anchor?.contains(target)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        anchor?.focus();
      }
    };
    const onViewportChange = (event: Event) => {
      if (event.type === 'scroll' && panelRef.current?.contains(event.target as Node)) return;
      close();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [open, anchor, close]);

  return (
    <>
      {trigger({ open, toggle: () => setOpen((value) => !value), ref: setAnchor })}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            style={{
              position: 'fixed',
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              width,
              maxHeight: position?.maxHeight,
            }}
            className="animate-pop-in z-50 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 text-sm text-ink shadow-pop"
          >
            {children(close)}
          </div>,
          // Inside a modal <dialog> (browser top layer) the panel must live in the dialog itself,
          // otherwise it would render underneath the modal.
          anchor?.closest('dialog') ?? document.body,
        )}
    </>
  );
}

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  hidden?: boolean;
}

export function MenuItems({ items, close }: { items: MenuItem[]; close: () => void }) {
  return (
    <>
      {items
        .filter((item) => !item.hidden)
        .map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              close();
              item.onSelect();
            }}
            className={cx(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition disabled:opacity-50',
              item.danger ? 'text-danger-ink hover:bg-danger-soft' : 'text-ink hover:bg-surface-3',
            )}
          >
            {item.icon && (
              <span className="shrink-0 text-muted [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>
            )}
            {item.label}
          </button>
        ))}
    </>
  );
}

// --- Toasts -------------------------------------------------------------------------

type ToastTone = 'success' | 'error' | 'info' | 'warning' | 'loading';

/**
 * Where an error comes from, shown as a small label so people can tell them apart:
 * `validation` rules of the interface, `service` a request the backend rejected, `network`
 * the backend is unreachable, `access` a session/permission problem, `system` anything
 * unexpected (a server crash or a bug in the app).
 */
export type ToastKind = 'validation' | 'service' | 'network' | 'access' | 'system';

interface ToastContent {
  tone: ToastTone;
  title: string;
  description?: string;
  kind?: ToastKind;
  /** Short technical reference next to the kind label, e.g. "409". */
  meta?: string;
}

interface ToastItem extends ToastContent {
  id: number;
  /** Bumped when an identical toast is shown again: restarts its timer instead of stacking. */
  version: number;
  /** Playing its exit animation; removed right after. */
  leaving?: boolean;
  /** Direction it was swiped away to (-1 left, 1 right). */
  swipe?: number;
}

const TOAST_EXIT_MS = 260;
const TOAST_LIMIT = 5;
const TOAST_GAP = 10;
/** How much of each older toast peeks out below the front one while collapsed. */
const TOAST_PEEK = 12;
const TOAST_SWIPE_PX = 70;
const TOAST_DURATION: Record<ToastTone, number> = {
  success: 4000,
  info: 5000,
  warning: 6500,
  error: 7000,
  loading: 0, // stays until updated or dismissed
};

const TOAST_STYLES: Record<
  ToastTone,
  { badge: string; bar: string; tint: string; icon: ReactNode }
> = {
  success: {
    badge: 'bg-success text-white ring-success-soft',
    bar: 'bg-success',
    tint: 'var(--success-soft)',
    icon: <CheckCircle2 />,
  },
  error: {
    badge: 'bg-danger text-white ring-danger-soft',
    bar: 'bg-danger',
    tint: 'var(--danger-soft)',
    icon: <XCircle />,
  },
  info: {
    badge: 'bg-info text-white ring-info-soft',
    bar: 'bg-info',
    tint: 'var(--info-soft)',
    icon: <Info />,
  },
  warning: {
    badge: 'bg-warning text-white ring-warning-soft',
    bar: 'bg-warning',
    tint: 'var(--warning-soft)',
    icon: <AlertTriangle />,
  },
  loading: {
    badge: 'bg-primary-soft text-primary ring-transparent',
    bar: 'bg-primary',
    tint: 'var(--primary-soft)',
    icon: <Spinner />,
  },
};

/** Shows a notification; `description` adds a second, quieter line. Returns the toast id. */
type ToastFn = (title: string, description?: string) => number;

export interface ToastApi {
  success: ToastFn;
  error: ToastFn;
  info: ToastFn;
  warning: ToastFn;
  /** A toast with a spinner that stays open until `update()` turns it into a result. */
  loading: ToastFn;
  /**
   * Shows a failed request with a generic title for its origin (validation, service,
   * connection, access, system) and the specific reason below. `title` overrides the title of
   * service rejections, e.g. "We could not sign you in".
   */
  apiError: (error: unknown, title?: string) => number;
  update: (id: number, content: Partial<ToastContent>) => void;
  dismiss: (id: number) => void;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: 'danger' | 'primary';
}

interface FeedbackContextValue {
  toast: ToastApi;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

type FormField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Visible label of a form control, without the "(opcional)"-style hints. */
function fieldLabel(field: FormField) {
  const text = field.labels?.[0]?.innerText ?? field.getAttribute('aria-label') ?? '';
  return text.replace(/\s*[*(].*$/s, '').trim();
}

/** A number attribute shown with two decimals, as amounts are typed. */
function decimal(value: string | null) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : (value ?? '');
}

/**
 * Where the toast stack renders. A modal <dialog> makes everything outside it inert (even
 * top-layer popovers), so while one is open the stack moves inside it to stay clickable.
 */
function findToastHost() {
  const modals = [...document.querySelectorAll('dialog')].filter(
    (dialog) => dialog.matches(':modal') && dialog.dataset.state !== 'closing',
  );
  return modals.at(-1) ?? document.body;
}

function useToastHost(active: boolean) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!active) return;
    const sync = () => setHost(findToastHost());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['open', 'data-state'],
      childList: true,
    });
    return () => observer.disconnect();
  }, [active]);
  return host;
}

interface ToastLayout {
  index: number;
  offset: number;
  frontHeight: number;
  expanded: boolean;
}

/**
 * One notification. Collapsed, older toasts tuck behind the newest one; hovering the stack
 * fans them out. Its countdown pauses while the stack is open or it has focus, and it can be
 * swiped sideways to dismiss.
 */
function ToastCard({
  item,
  layout,
  labels,
  onHeight,
  onDismiss,
}: {
  item: ToastItem;
  layout: ToastLayout;
  labels: { close: string; kind?: string };
  onHeight: (id: number, height: number) => void;
  onDismiss: (id: number, swipe?: number) => void;
}) {
  const duration = TOAST_DURATION[item.tone];
  const [mounted, setMounted] = useState(false);
  const [focused, setFocused] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const dragStart = useRef<number | null>(null);
  const content = useRef<HTMLDivElement>(null);
  const remaining = useRef(duration);
  const startedAt = useRef(0);
  const paused = layout.expanded || focused || drag !== null;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useLayoutEffect(() => {
    const node = content.current;
    if (!node) return;
    const report = () => onHeight(item.id, node.offsetHeight);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, [item.id, onHeight]);

  // A new tone or a repeat restarts the countdown.
  useEffect(() => {
    remaining.current = duration;
  }, [duration, item.version]);

  useEffect(() => {
    if (!duration || paused || item.leaving) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(() => onDismiss(item.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [duration, paused, item.id, item.leaving, item.version, onDismiss]);

  const { index, offset, frontHeight, expanded } = layout;
  const behind = !expanded && index > 0;
  const hidden = !expanded && index >= 3;
  const scale = expanded ? 1 : 1 - index * 0.05;
  let transform = `translateY(${offset}px) scale(${scale})`;
  if (!mounted) transform = `translateY(-110%) scale(0.96)`;
  if (item.leaving) {
    transform = item.swipe
      ? `translateX(${item.swipe * 115}%)`
      : `translateY(${offset - 24}px) scale(${scale * 0.94})`;
  }
  if (drag !== null) transform = `translateY(${offset}px) translateX(${drag}px)`;

  const style = TOAST_STYLES[item.tone];
  return (
    <li
      data-state={item.leaving ? 'closing' : 'open'}
      role={item.tone === 'error' ? 'alert' : 'status'}
      aria-hidden={behind || undefined}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest('button')) return;
        dragStart.current = event.clientX;
      }}
      onPointerMove={(event) => {
        if (dragStart.current === null) return;
        const dx = event.clientX - dragStart.current;
        if (drag === null && Math.abs(dx) < 6) return;
        if (drag === null) event.currentTarget.setPointerCapture(event.pointerId);
        setDrag(dx);
      }}
      onPointerUp={() => {
        const dx = drag ?? 0;
        dragStart.current = null;
        setDrag(null);
        if (Math.abs(dx) > TOAST_SWIPE_PX) onDismiss(item.id, Math.sign(dx));
      }}
      onPointerCancel={() => {
        dragStart.current = null;
        setDrag(null);
      }}
      style={{
        transform,
        zIndex: TOAST_LIMIT - index,
        height: behind ? frontHeight : undefined,
        opacity:
          !mounted || item.leaving || hidden
            ? 0
            : drag
              ? 1 - Math.min(Math.abs(drag) / 240, 0.6)
              : 1,
        transition:
          drag !== null
            ? 'none'
            : 'transform 420ms cubic-bezier(0.21, 1.02, 0.73, 1), opacity 320ms ease, height 320ms ease',
        backgroundImage: `radial-gradient(130% 160% at 0% 0%, color-mix(in srgb, ${style.tint} 85%, transparent) 0%, transparent 58%)`,
      }}
      className={cx(
        'group pointer-events-auto absolute inset-x-0 top-0 origin-bottom touch-pan-y overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-pop select-none',
        hidden && 'pointer-events-none',
      )}
    >
      <div
        ref={content}
        className={cx(
          'flex items-start gap-3 p-3.5 pr-3 transition-opacity duration-200',
          behind && 'opacity-0',
        )}
      >
        <span
          className={cx(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 [&>svg]:h-[17px] [&>svg]:w-[17px]',
            style.badge,
          )}
        >
          {style.icon}
        </span>
        <div className="min-w-0 flex-1">
          {labels.kind && (
            <p className="mb-0.5 flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.08em] text-subtle uppercase">
              {labels.kind}
              {item.meta && (
                <span className="rounded-md bg-surface-3 px-1 py-px font-mono text-[10px] tracking-normal text-muted normal-case">
                  {item.meta}
                </span>
              )}
            </p>
          )}
          <p className="text-sm leading-5 font-semibold break-words">{item.title}</p>
          {item.description && (
            <p className="mt-0.5 text-[13px] leading-5 break-words text-muted">
              {item.description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          className="-mt-0.5 -mr-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-subtle transition group-hover:opacity-100 hover:bg-surface-3 hover:text-ink focus-visible:opacity-100 sm:opacity-0 [@media(hover:none)]:opacity-100"
          aria-label={labels.close}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {duration > 0 && (
        <span className="absolute inset-x-3 bottom-1 h-[3px] overflow-hidden rounded-full bg-surface-3/70">
          <span
            key={`${item.tone}-${item.version}`}
            aria-hidden="true"
            className={cx('toast-timer block h-full rounded-full', style.bar)}
            style={{
              animationDuration: `${duration}ms`,
              animationPlayState: paused ? 'paused' : 'running',
            }}
          />
        </span>
      )}
    </li>
  );
}

/** The toast region: newest on top, older ones stacked behind until hovered. */
function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number, swipe?: number) => void;
}) {
  const { t } = useUiI18n();
  const [expanded, setExpanded] = useState(false);
  const [heights, setHeights] = useState<Record<number, number>>({});
  const onHeight = useCallback(
    (id: number, height: number) =>
      setHeights((current) => (current[id] === height ? current : { ...current, [id]: height })),
    [],
  );

  const ordered = [...toasts].reverse();
  const heightOf = (item: ToastItem) => heights[item.id] ?? 76;
  const frontHeight = ordered[0] ? heightOf(ordered[0]) : 0;
  const offsets: number[] = [];
  let running = 0;
  for (const [index, item] of ordered.entries()) {
    offsets.push(expanded ? running : Math.min(index, 2) * TOAST_PEEK);
    running += heightOf(item) + TOAST_GAP;
  }
  const total = expanded
    ? Math.max(running - TOAST_GAP, 0)
    : frontHeight + Math.min(ordered.length - 1, 2) * TOAST_PEEK;

  return (
    <ol
      aria-live="polite"
      aria-label={t('toast.region')}
      onPointerEnter={(event) => event.pointerType === 'mouse' && setExpanded(true)}
      onPointerLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExpanded(false);
      }}
      style={{ height: total, transition: 'height 320ms ease' }}
      className="pointer-events-auto fixed inset-x-3 top-3 z-[70] mx-auto max-w-sm sm:inset-x-auto sm:top-4 sm:right-4 sm:mx-0 sm:w-[23rem]"
    >
      {ordered.map((item, index) => (
        <ToastCard
          key={item.id}
          item={item}
          layout={{ index, offset: offsets[index] ?? 0, frontHeight, expanded }}
          labels={{
            close: t('toast.close'),
            kind: item.kind ? t(`toast.kinds.${item.kind}`) : undefined,
          }}
          onHeight={onHeight}
          onDismiss={onDismiss}
        />
      ))}
    </ol>
  );
}

/** Provides `toast.*()` notifications and a promise-based `confirm()` dialog to the whole app. */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { t } = useUiI18n();
  const errors = useErrorText();
  // Read through a ref so the context value (and every consumer) stays stable across renders.
  const text = useRef({ t, errors });
  useEffect(() => {
    text.current = { t, errors };
  });
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pending, setPending] = useState<
    (ConfirmOptions & { resolve: (value: boolean) => void }) | null
  >(null);
  const nextId = useRef(1);
  const host = useToastHost(toasts.length > 0);

  const dismiss = useCallback((id: number, swipe?: number) => {
    setToasts((items) =>
      items.map((item) => (item.id === id ? { ...item, leaving: true, swipe } : item)),
    );
    window.setTimeout(
      () => setToasts((items) => items.filter((item) => item.id !== id)),
      TOAST_EXIT_MS,
    );
  }, []);

  const push = useCallback((content: ToastContent) => {
    const id = nextId.current++;
    setToasts((items) => {
      const same = items.find(
        (item) =>
          !item.leaving &&
          item.tone === content.tone &&
          item.title === content.title &&
          item.description === content.description,
      );
      // The same message twice in a row (a double submit) refreshes the visible toast.
      if (same) {
        return items.map((item) => (item === same ? { ...item, version: item.version + 1 } : item));
      }
      return [...items.slice(-(TOAST_LIMIT - 1)), { ...content, id, version: 0 }];
    });
    return id;
  }, []);

  const update = useCallback((id: number, content: Partial<ToastContent>) => {
    setToasts((items) =>
      items.map((item) =>
        item.id === id ? { ...item, ...content, version: item.version + 1 } : item,
      ),
    );
  }, []);

  const value = useMemo<FeedbackContextValue>(() => {
    const of =
      (tone: ToastTone): ToastFn =>
      (title, description) =>
        push({ tone, title, description });
    return {
      toast: {
        success: of('success'),
        error: of('error'),
        info: of('info'),
        warning: of('warning'),
        loading: of('loading'),
        apiError: (error, title) => {
          const { t: translate, errors: errorText } = text.current;
          if (!(error instanceof ApiError)) {
            return push({
              tone: 'error',
              kind: 'system',
              title: translate('toast.titles.system'),
              description: translate('toast.hints.system'),
            });
          }
          const meta = error.status > 0 ? String(error.status) : undefined;
          if (errorText.hasFieldErrors(error) || error.code === 'VALIDATION_ERROR') {
            return push({
              tone: 'warning',
              kind: 'validation',
              meta,
              title: translate('toast.titles.validation'),
              description: translate('toast.hints.validation'),
            });
          }
          if (error.status === 0) {
            return push({
              tone: 'error',
              kind: 'network',
              title: translate('toast.titles.network'),
              description: errorText.message(error),
            });
          }
          if (error.status >= 500) {
            return push({
              tone: 'error',
              kind: 'system',
              meta,
              title: translate('toast.titles.serviceDown'),
              description: translate('toast.hints.serviceDown'),
            });
          }
          const access = error.status === 401 || error.status === 403;
          return push({
            tone: 'error',
            kind: access ? 'access' : 'service',
            meta,
            title: title ?? translate(access ? 'toast.titles.access' : 'toast.titles.service'),
            description: errorText.message(error),
          });
        },
        update,
        dismiss,
      },
      confirm: (options) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    };
  }, [push, update, dismiss]);

  // Native constraint validation (required, min/max…) is reported as a toast instead of the
  // browser bubble; the invalid fields get a red border (see `:user-invalid` in styles.css).
  useEffect(() => {
    let batch: FormField[] = [];
    const flush = () => {
      const [first, ...rest] = batch;
      batch = [];
      if (!first) return;
      const { t: translate } = text.current;
      const validity = first.validity;
      const reason = validity.valueMissing
        ? translate('toast.validation.required')
        : validity.typeMismatch && first.type === 'email'
          ? translate('toast.validation.email')
          : first.type === 'number' && (validity.rangeOverflow || validity.rangeUnderflow)
            ? translate(validity.rangeOverflow ? 'toast.validation.max' : 'toast.validation.min', {
                value: decimal(
                  validity.rangeOverflow ? first.getAttribute('max') : first.getAttribute('min'),
                ),
              })
            : validity.tooShort
              ? translate('toast.validation.tooShort', {
                  count: first.getAttribute('minlength') ?? '',
                })
              : first.validationMessage;
      const label = fieldLabel(first);
      const more =
        rest.length > 0 ? ` ${translate('toast.validation.more', { count: rest.length })}` : '';
      push({
        tone: 'warning',
        kind: 'validation',
        title: translate('toast.titles.validation'),
        description: `${label ? `${label}: ` : ''}${reason}${more}`,
      });
      first.focus({ preventScroll: true });
      first.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    const onInvalid = (event: Event) => {
      const field = event.target as FormField;
      if (!field.form) return;
      event.preventDefault();
      if (batch.length === 0) window.setTimeout(flush);
      batch.push(field);
    };
    document.addEventListener('invalid', onInvalid, true);
    return () => document.removeEventListener('invalid', onInvalid, true);
  }, [push]);

  const settle = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {host &&
        toasts.length > 0 &&
        createPortal(<ToastStack toasts={toasts} onDismiss={dismiss} />, host)}
      <Modal
        open={pending !== null}
        title={pending?.title ?? ''}
        size="sm"
        onClose={() => settle(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => settle(false)}>
              {pending?.cancelLabel}
            </Button>
            <Button
              variant={pending?.tone === 'primary' ? 'primary' : 'danger'}
              onClick={() => settle(true)}
              autoFocus
            >
              {pending?.confirmLabel}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{pending?.message}</p>
      </Modal>
    </FeedbackContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with its provider
export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used within a FeedbackProvider');
  return context;
}

/**
 * Shows a toast each time a new request error appears (a mutation's `error`, a flow's error
 * state…), so forms don't need an inline error box. Field errors still render under inputs.
 */
// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with its provider
export function useErrorToast(error: unknown, title?: string) {
  const { toast } = useFeedback();
  const shown = useRef<unknown>(null);
  useEffect(() => {
    if (error == null || error === shown.current) return;
    shown.current = error;
    toast.apiError(error, title);
  }, [error, title, toast]);
}
