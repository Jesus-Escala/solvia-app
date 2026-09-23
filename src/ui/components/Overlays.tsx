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
import { Button } from './Button';
import { cx } from './cx';
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
          document.body,
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

type ToastTone = 'success' | 'error' | 'info' | 'warning';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  /** Playing its exit animation; removed right after. */
  leaving?: boolean;
}

const TOAST_EXIT_MS = 180;

const TOAST_ICONS: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-success" />,
  error: <XCircle className="h-5 w-5 text-danger" />,
  info: <Info className="h-5 w-5 text-info" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning" />,
};

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: 'danger' | 'primary';
}

interface FeedbackContextValue {
  toast: Record<ToastTone, (message: string) => void>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

/** Provides `toast.*()` notifications and a promise-based `confirm()` dialog to the whole app. */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pending, setPending] = useState<
    (ConfirmOptions & { resolve: (value: boolean) => void }) | null
  >(null);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.map((item) => (item.id === id ? { ...item, leaving: true } : item)));
    window.setTimeout(
      () => setToasts((items) => items.filter((item) => item.id !== id)),
      TOAST_EXIT_MS,
    );
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setToasts((items) => [...items.slice(-3), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4500);
    },
    [dismiss],
  );

  const value = useMemo<FeedbackContextValue>(
    () => ({
      toast: {
        success: (message) => push('success', message),
        error: (message) => push('error', message),
        info: (message) => push('info', message),
        warning: (message) => push('warning', message),
      },
      confirm: (options) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    }),
    [push],
  );

  const settle = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-20 z-[60] flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2 lg:bottom-4"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            data-state={item.leaving ? 'closing' : 'open'}
            className="toast pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink shadow-pop"
          >
            <span className="shrink-0">{TOAST_ICONS[item.tone]}</span>
            <p className="min-w-0 flex-1 break-words">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="shrink-0 text-subtle hover:text-ink"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
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
