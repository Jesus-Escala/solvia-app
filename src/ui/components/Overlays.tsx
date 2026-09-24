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

interface ToastContent {
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastItem extends ToastContent {
  id: number;
  /** Bumped when an identical toast is shown again: restarts its timer instead of stacking. */
  version: number;
  /** Playing its exit animation; removed right after. */
  leaving?: boolean;
}

const TOAST_EXIT_MS = 200;
const TOAST_LIMIT = 4;
const TOAST_DURATION: Record<ToastTone, number> = {
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 7000,
  loading: 0, // stays until updated or dismissed
};

const TOAST_STYLES: Record<ToastTone, { tile: string; bar: string; icon: ReactNode }> = {
  success: { tile: 'bg-success-soft text-success', bar: 'bg-success', icon: <CheckCircle2 /> },
  error: { tile: 'bg-danger-soft text-danger', bar: 'bg-danger', icon: <XCircle /> },
  info: { tile: 'bg-info-soft text-info', bar: 'bg-info', icon: <Info /> },
  warning: { tile: 'bg-warning-soft text-warning', bar: 'bg-warning', icon: <AlertTriangle /> },
  loading: { tile: 'bg-primary-soft text-primary', bar: 'bg-primary', icon: <Spinner /> },
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
  /** Shows a failed request: known API errors get a translated message, field errors a hint. */
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

/** One notification: its own countdown, paused while hovered or focused. */
function ToastCard({
  item,
  closeLabel,
  onDismiss,
}: {
  item: ToastItem;
  closeLabel: string;
  onDismiss: (id: number) => void;
}) {
  const duration = TOAST_DURATION[item.tone];
  const [paused, setPaused] = useState(false);
  const remaining = useRef(duration);
  const startedAt = useRef(0);

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

  const style = TOAST_STYLES[item.tone];
  return (
    <li
      data-state={item.leaving ? 'closing' : 'open'}
      role={item.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="toast pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-2xl border border-line bg-surface/95 p-3 pr-2.5 text-ink shadow-pop backdrop-blur-md"
    >
      <span
        className={cx(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl [&>svg]:h-[18px] [&>svg]:w-[18px]',
          style.tile,
        )}
      >
        {style.icon}
      </span>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-sm leading-5 font-semibold break-words">{item.title}</p>
        {item.description && (
          <p className="mt-0.5 text-[13px] leading-5 break-words text-muted">{item.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="-mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-subtle transition hover:bg-surface-2 hover:text-ink"
        aria-label={closeLabel}
      >
        <X className="h-4 w-4" />
      </button>
      {duration > 0 && (
        <span
          key={`${item.tone}-${item.version}`}
          aria-hidden="true"
          className={cx('toast-timer absolute inset-x-0 bottom-0 h-[3px] opacity-70', style.bar)}
          style={{
            animationDuration: `${duration}ms`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      )}
    </li>
  );
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

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.map((item) => (item.id === id ? { ...item, leaving: true } : item)));
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
          return errorText.hasFieldErrors(error)
            ? push({
                tone: 'error',
                title: translate('toast.checkFields'),
                description: translate('toast.checkFieldsHint'),
              })
            : push({
                tone: 'error',
                title: title ?? translate('toast.errorTitle'),
                description: errorText.message(error),
              });
        },
        update,
        dismiss,
      },
      confirm: (options) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    };
  }, [push, update, dismiss]);

  const settle = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {host &&
        toasts.length > 0 &&
        createPortal(
          <ol
            aria-live="polite"
            aria-label={t('toast.region')}
            className="pointer-events-none fixed inset-x-3 top-3 z-[70] mx-auto flex max-w-sm flex-col gap-2 sm:inset-x-auto sm:top-4 sm:right-4 sm:mx-0 sm:w-96"
          >
            {toasts.map((item) => (
              <ToastCard
                key={item.id}
                item={item}
                closeLabel={t('toast.close')}
                onDismiss={dismiss}
              />
            ))}
          </ol>,
          host,
        )}
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
