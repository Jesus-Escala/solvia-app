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
  align?: 'start' | 'center' | 'end';
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
    const left =
      align === 'end'
        ? rect.right - width
        : align === 'center'
          ? rect.left + rect.width / 2 - width / 2
          : rect.left;
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
  /** Several things of the same kind (e.g. products running low), shown as a tidy list. */
  items?: string[];
  kind?: ToastKind;
  /** Short technical reference next to the kind label, e.g. "409". */
  meta?: string;
  /** Part of the description shown in bold, e.g. the name of the field to fix. */
  emphasis?: string;
}

interface ToastItem extends ToastContent {
  id: number;
  /** When it appeared (or when a loading toast turned into a result): its countdown starts here. */
  createdAt: number;
  /** How long it stays (ms); 0 stays until closed (loading). */
  duration: number;
  /** Playing its exit animation; removed right after. */
  leaving?: boolean;
  /** Form whose native validation raised it: it closes once that form is valid again. */
  source?: HTMLFormElement;
}

const TOAST_EXIT_MS = 260;
/** Most toasts on screen: a new one pushes the oldest out. */
const TOAST_LIMIT = 6;
/** Lines of a toast list shown before "+N". */
const TOAST_LIST_LIMIT = 5;
/** The same toast twice within this time (a double click) is shown once. */
const TOAST_REPEAT_MS = 400;
const TOAST_DURATION: Record<ToastTone, number> = {
  success: 3500,
  info: 4500,
  warning: 5500,
  error: 6000,
  loading: 0, // stays until updated or dismissed
};

/** Solid colored cards, like the TSI component library: the color says what happened. */
const TOAST_STYLES: Record<ToastTone, { card: string; icon: ReactNode }> = {
  success: { card: 'bg-success text-white', icon: <CheckCircle2 /> },
  error: { card: 'bg-danger text-white', icon: <XCircle /> },
  info: { card: 'bg-info text-white', icon: <Info /> },
  warning: { card: 'bg-warning text-white', icon: <AlertTriangle /> },
  loading: { card: 'border border-line bg-surface text-ink', icon: <Spinner /> },
};

/**
 * Shows a notification; `description` adds a second, quieter line and `items` a short list under
 * it (the first ones, then "+N"). Returns the toast id.
 */
type ToastFn = (title: string, description?: string, items?: string[]) => number;

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

/** `text` with the first occurrence of `part` in bold. */
function Emphasized({ text, part }: { text: string; part?: string }) {
  const at = part ? text.indexOf(part) : -1;
  if (!part || at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <strong className="font-semibold">{part}</strong>
      {text.slice(at + part.length)}
    </>
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

/**
 * One notification: it slides in from the right, stays its time (the bar shows what is left) and
 * slides out to the right; the ones below move up. Always the same, like the TSI library: no
 * pause, no restart.
 */
function ToastCard({
  item,
  host,
  labels,
  onDismiss,
}: {
  item: ToastItem;
  /** Where the list lives now; the bar is laid out again when it moves. */
  host: HTMLElement | null;
  labels: { close: string; kind?: string };
  onDismiss: (id: number) => void;
}) {
  const bar = useRef<HTMLSpanElement>(null);
  // The entrance plays once: moving the list into or out of a dialog must not replay it.
  const [entered, setEntered] = useState(false);
  // Also when the animation end is missed (a background tab): done once its time is over.
  useEffect(() => {
    const timer = window.setTimeout(() => setEntered(true), 450);
    return () => window.clearTimeout(timer);
  }, []);

  // The bar runs from the time the toast appeared (also after the list moved).
  useEffect(() => {
    const node = bar.current;
    if (!node || !item.duration || item.leaving) return;
    const elapsed = Math.min(Date.now() - item.createdAt, item.duration);
    const animation = node.animate(
      [{ transform: `scaleX(${1 - elapsed / item.duration})` }, { transform: 'scaleX(0)' }],
      { duration: item.duration - elapsed, easing: 'linear', fill: 'forwards' },
    );
    return () => animation.cancel();
  }, [item.createdAt, item.duration, item.leaving, host]);

  const loading = item.tone === 'loading';
  const style = TOAST_STYLES[item.tone];
  return (
    // The row collapses as the toast leaves, so the others glide up instead of jumping.
    <li
      className={cx(
        'grid w-full transition-[grid-template-rows] duration-300 ease-out',
        item.leaving ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
      )}
    >
      <div className={cx('min-h-0', !item.leaving && 'pb-2.5')}>
        <div
          role={item.tone === 'error' ? 'alert' : 'status'}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setEntered(true);
          }}
          className={cx(
            'pointer-events-auto relative ml-auto w-full overflow-hidden rounded-2xl shadow-pop transition-transform duration-200 hover:-translate-y-0.5 sm:w-[23rem]',
            style.card,
            item.leaving ? 'animate-toast-out' : !entered && 'animate-toast-in',
          )}
        >
          {/* Darker accent on the left edge. */}
          {!loading && (
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-black/25" />
          )}
          <div className="flex items-start gap-3 py-3.5 pr-11 pl-5">
            <span
              className={cx(
                'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] [&>svg]:h-[18px] [&>svg]:w-[18px]',
                loading ? 'bg-primary-soft text-primary' : 'border border-white/35 bg-white/20',
              )}
            >
              {style.icon}
            </span>
            <div className="min-w-0 flex-1">
              {labels.kind && (
                <p
                  className={cx(
                    'mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.08em] uppercase',
                    loading ? 'text-subtle' : 'text-white/75',
                  )}
                >
                  {labels.kind}
                  {item.meta && (
                    <span
                      className={cx(
                        'rounded px-1 font-mono text-[10px] tracking-normal normal-case',
                        loading ? 'bg-surface-3' : 'bg-white/20',
                      )}
                    >
                      {item.meta}
                    </span>
                  )}
                </p>
              )}
              <p className="text-[13.5px] leading-5 font-semibold break-words">{item.title}</p>
              {item.description && (
                <p
                  className={cx(
                    'mt-0.5 text-[12.5px] leading-5 break-words',
                    loading ? 'text-muted' : 'text-white/85',
                  )}
                >
                  <Emphasized text={item.description} part={item.emphasis} />
                </p>
              )}
              {item.items && item.items.length > 0 && (
                <ul className={cx('mt-1.5 space-y-0.5', loading ? 'text-muted' : 'text-white/90')}>
                  {item.items.slice(0, TOAST_LIST_LIMIT).map((line) => (
                    <li
                      key={line}
                      className="flex items-start gap-2 text-[12.5px] leading-5 break-words"
                    >
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current" />
                      <span className="min-w-0">{line}</span>
                    </li>
                  ))}
                  {item.items.length > TOAST_LIST_LIMIT && (
                    <li className="pl-3 text-[12px] font-semibold">
                      +{item.items.length - TOAST_LIST_LIMIT}
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(item.id)}
            aria-label={labels.close}
            className={cx(
              'absolute top-2.5 right-3 flex h-6 w-6 items-center justify-center rounded-lg border transition',
              loading
                ? 'border-line bg-surface-2 text-muted hover:text-ink'
                : 'border-white/30 bg-white/15 text-white/85 hover:bg-white/30 hover:text-white',
            )}
          >
            <X className="h-3.5 w-3.5" />
          </button>
          {item.duration > 0 && (
            <span
              ref={bar}
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-white/70"
            />
          )}
        </div>
      </div>
    </li>
  );
}

/** The toast region, top right: newest at the bottom; they pile up and leave on their own. */
function ToastStack({
  toasts,
  host,
  onDismiss,
}: {
  toasts: ToastItem[];
  host: HTMLElement | null;
  onDismiss: (id: number) => void;
}) {
  const { t } = useUiI18n();
  return (
    <ol
      aria-live="polite"
      aria-label={t('toast.region')}
      className="pointer-events-none fixed inset-x-3 top-3 z-[70] flex flex-col sm:inset-x-auto sm:top-5 sm:right-5 sm:w-[23rem]"
    >
      {toasts.map((item) => (
        <ToastCard
          key={item.id}
          item={item}
          host={host}
          labels={{
            close: t('toast.close'),
            kind: item.kind ? t(`toast.kinds.${item.kind}`) : undefined,
          }}
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
  // The toasts live in one element that is moved into the open dialog (the top layer) and back.
  // Rendering them into a different element each time would mount them again: they would blink
  // and restart their countdown whenever a dialog opens or closes.
  const [toastRoot] = useState(() =>
    typeof document === 'undefined' ? null : document.createElement('div'),
  );
  useEffect(() => {
    if (toastRoot && host && toastRoot.parentNode !== host) host.appendChild(toastRoot);
  }, [toastRoot, host]);
  useEffect(() => () => toastRoot?.remove(), [toastRoot]);

  // One timer per toast, started when it appears: it always leaves after its time.
  const timers = useRef(new Map<number, number>());
  useEffect(() => {
    const all = timers.current;
    return () => all.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((items) => items.map((item) => (item.id === id ? { ...item, leaving: true } : item)));
    window.setTimeout(
      () => setToasts((items) => items.filter((item) => item.id !== id)),
      TOAST_EXIT_MS,
    );
  }, []);

  const schedule = useCallback(
    (id: number, duration: number) => {
      window.clearTimeout(timers.current.get(id));
      if (duration > 0)
        timers.current.set(
          id,
          window.setTimeout(() => dismiss(id), duration),
        );
    },
    [dismiss],
  );

  // Mirror of the list, to find a double click's repeat and the toasts of a form.
  const current = useRef<ToastItem[]>([]);
  useEffect(() => {
    current.current = toasts;
  }, [toasts]);

  const push = useCallback(
    (content: ToastContent, source?: HTMLFormElement) => {
      const now = Date.now();
      // The very same toast right after (a double click): one is enough.
      const repeat = current.current.find(
        (item) =>
          !item.leaving &&
          now - item.createdAt < TOAST_REPEAT_MS &&
          item.tone === content.tone &&
          item.title === content.title &&
          item.description === content.description,
      );
      if (repeat) return repeat.id;
      const id = nextId.current++;
      const duration = TOAST_DURATION[content.tone];
      const item: ToastItem = { ...content, id, createdAt: now, duration, source };
      const kept = current.current.filter((toast) => !toast.leaving);
      // Too many on screen: the oldest one leaves.
      if (kept.length >= TOAST_LIMIT) dismiss(kept[0]!.id);
      current.current = [...current.current, item];
      setToasts((items) => [...items, item]);
      schedule(id, duration);
      return id;
    },
    [dismiss, schedule],
  );

  /** Changes a toast in place; a loading toast that becomes a result starts its countdown. */
  const update = useCallback(
    (id: number, content: Partial<ToastContent>) => {
      const tone = content.tone;
      const restart = tone !== undefined && tone !== 'loading';
      const now = Date.now();
      setToasts((items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                ...content,
                ...(restart && { createdAt: now, duration: TOAST_DURATION[tone] }),
              }
            : item,
        ),
      );
      if (restart) schedule(id, TOAST_DURATION[tone]);
    },
    [schedule],
  );

  const value = useMemo<FeedbackContextValue>(() => {
    const of =
      (tone: ToastTone): ToastFn =>
      (title, description, items) =>
        push({ tone, title, description, ...(items && { items }) });
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
            // The service rejected the data: show its own reasons, not the interface template.
            const reasons = [
              ...new Set(
                Object.keys(error.fieldErrors)
                  .map((name) => errorText.field(error, name))
                  .filter(Boolean),
              ),
            ];
            return push({
              tone: 'error',
              kind: 'service',
              meta,
              title: translate('toast.titles.serviceRejected'),
              description: reasons.length > 0 ? reasons.join(' · ') : errorText.message(error),
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
      const label = fieldLabel(first);
      const reason = !label
        ? translate('toast.validation.generic')
        : first.validity.valueMissing
          ? translate('toast.validation.required', { field: label })
          : translate('toast.validation.invalid', { field: label });
      const more =
        rest.length > 0 ? ` ${translate('toast.validation.more', { count: rest.length })}` : '';
      push(
        {
          tone: 'warning',
          kind: 'validation',
          title: translate('toast.titles.validation'),
          description: `${reason}${more}`,
          emphasis: label || undefined,
        },
        first.form ?? undefined,
      );
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
    // Once the form is fixed (every field valid) or submitted, its validation toast is stale.
    const settle = (event: Event) => {
      const target = event.target as Element;
      const form = target instanceof HTMLFormElement ? target : (target as FormField).form;
      if (!form) return;
      if (event.type !== 'submit' && !form.matches(':valid')) return;
      for (const item of current.current) {
        if (item.source === form && !item.leaving) dismiss(item.id);
      }
    };
    document.addEventListener('invalid', onInvalid, true);
    document.addEventListener('input', settle, true);
    document.addEventListener('change', settle, true);
    document.addEventListener('submit', settle, true);
    return () => {
      document.removeEventListener('invalid', onInvalid, true);
      document.removeEventListener('input', settle, true);
      document.removeEventListener('change', settle, true);
      document.removeEventListener('submit', settle, true);
    };
  }, [push, dismiss]);

  const settle = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {toastRoot &&
        toasts.length > 0 &&
        createPortal(<ToastStack toasts={toasts} host={host} onDismiss={dismiss} />, toastRoot)}
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
  const toastId = useRef<number | null>(null);
  useEffect(() => {
    if (error === shown.current) return;
    shown.current = error;
    // A new attempt clears the error (or replaces it): the previous toast no longer applies.
    if (toastId.current !== null) toast.dismiss(toastId.current);
    toastId.current = error == null ? null : toast.apiError(error, title);
  }, [error, title, toast]);
  // Closing the form takes its error with it.
  useEffect(
    () => () => {
      if (toastId.current !== null) toast.dismiss(toastId.current);
    },
    [toast],
  );
}
