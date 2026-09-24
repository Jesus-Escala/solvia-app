import { X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from './cx';

export interface ModalProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeLabel?: string;
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-6xl' };

/**
 * Accessible modal built on the native <dialog> (focus trap, Escape and top layer for free).
 * Children only mount while open, so forms inside always start from fresh props.
 */
export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
  closeLabel = 'Close',
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // 'closing' keeps the dialog on screen while its exit animation plays.
  const [phase, setPhase] = useState<'open' | 'closing' | 'closed'>(open ? 'open' : 'closed');
  if (open && phase !== 'open') setPhase('open');
  if (!open && phase === 'open') setPhase('closing');

  // Parents usually stop rendering the modal's content as soon as it closes (e.g. `open && form`).
  // Keep the last open content so the exit animation doesn't show an empty dialog.
  const pressedBackdrop = useRef(false);
  const lastContent = useRef({ title, description, children, footer });
  useEffect(() => {
    if (open) lastContent.current = { title, description, children, footer };
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (phase === 'open' && !dialog.open) {
      dialog.showModal();
      // The native dialog focuses its first focusable element (the close button). Forms are
      // quicker to fill when the cursor starts in their first field.
      dialog
        .querySelector<HTMLElement>(
          '[data-autofocus], input:not([type="hidden"]):not([disabled]):not(.sr-only), select:not([disabled]), textarea:not([disabled])',
        )
        ?.focus();
    }
    if (phase !== 'closing') return;
    let done = false;
    const finish = (event?: AnimationEvent) => {
      // Ignore animations of the content (spinners, mascot...) that bubble up.
      if (event && event.target !== dialog) return;
      if (done) return;
      done = true;
      dialog.close();
      setPhase((current) => (current === 'closing' ? 'closed' : current));
    };
    dialog.addEventListener('animationend', finish);
    // Fallback when animations are disabled (reduced motion) or never fire.
    const timer = window.setTimeout(() => finish(), 260);
    return () => {
      dialog.removeEventListener('animationend', finish);
      window.clearTimeout(timer);
    };
  }, [phase]);

  // eslint-disable-next-line react-hooks/refs -- stale content is intended while closing
  const content = open ? { title, description, children, footer } : lastContent.current;

  return (
    <dialog
      ref={ref}
      data-state={phase === 'closing' ? 'closing' : open ? 'open' : undefined}
      onCancel={(event) => {
        // Escape: animate out through the parent instead of closing instantly.
        event.preventDefault();
        if (phase === 'open') onClose();
      }}
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === ref.current;
      }}
      onClick={(event) => {
        // Only a press that starts *and* ends on the backdrop closes: dragging a text selection
        // out of the dialog also fires a click on it, and must not dismiss the form.
        const fromBackdrop = pressedBackdrop.current;
        pressedBackdrop.current = false;
        if (fromBackdrop && event.target === ref.current && phase === 'open') onClose();
      }}
      className={cx(
        // Centered card on every screen size (phones get a 12px margin on each side).
        'modal m-auto w-[calc(100%-1.5rem)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-slate-950/50 backdrop:backdrop-blur-[2px] sm:w-[calc(100%-2rem)]',
        SIZES[size],
      )}
    >
      {phase !== 'closed' && (
        <div className="flex max-h-[calc(100dvh-1.5rem)] flex-col sm:max-h-[calc(100dvh-2rem)]">
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold">{content.title}</h2>
              {content.description && (
                <p className="mt-0.5 text-sm text-muted">{content.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="-mr-1 rounded-lg p-1.5 text-subtle transition hover:bg-surface-3 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{content.children}</div>
          {content.footer && (
            <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">
              {content.footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
