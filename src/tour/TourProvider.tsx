import { ArrowLeft, ArrowRight, Check, Compass, X } from 'lucide-react';
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
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Mascot, Button, cx, Modal, IconButton } from '@/ui';
import { useI18n } from '../i18n/I18nProvider';
import { useModules } from '../hooks/useModules';
import { TOUR_STEPS } from './steps';

interface TourContextValue {
  start: () => void;
  active: boolean;
}

const TourContext = createContext<TourContextValue | null>(null);
const SPOTLIGHT_PADDING = 6;
const CARD_WIDTH = 360;

const storageKey = (userId: string) => `solvia.tour.seen.${userId}`;
const GAP = 14;
const MARGIN = 20;

/**
 * Places the step card next to the target without covering it: below, above, right, then left.
 * Without a visible target it is centered; for targets too large to sit beside, it is pinned
 * to the bottom-right corner.
 */
function placeCard(
  rect: DOMRect | null,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
): React.CSSProperties {
  const center: React.CSSProperties = {
    top: '50%',
    left: '50%',
    width,
    transform: 'translate(-50%, -50%)',
  };
  if (!rect) return center;
  const clampLeft = (left: number) =>
    Math.min(Math.max(MARGIN, left), viewportWidth - width - MARGIN);
  const clampTop = (top: number) =>
    Math.min(Math.max(MARGIN, top), viewportHeight - height - MARGIN);
  const outer = SPOTLIGHT_PADDING + GAP;

  if (rect.bottom + outer + height <= viewportHeight - MARGIN) {
    return {
      top: rect.bottom + outer,
      left: clampLeft(rect.left + rect.width / 2 - width / 2),
      width,
    };
  }
  if (rect.top - outer - height >= MARGIN) {
    return {
      top: rect.top - outer - height,
      left: clampLeft(rect.left + rect.width / 2 - width / 2),
      width,
    };
  }
  if (rect.right + outer + width <= viewportWidth - MARGIN) {
    return { top: clampTop(rect.top), left: rect.right + outer, width };
  }
  if (rect.left - outer - width >= MARGIN) {
    return { top: clampTop(rect.top), left: rect.left - outer - width, width };
  }
  // Very large targets (e.g. a full-height table): pin to the bottom-right corner so the top of
  // the target (headers, first rows) stays visible.
  return { bottom: MARGIN * 2, right: MARGIN * 2, width };
}

function markSeen(userId: string | undefined) {
  if (!userId) return;
  try {
    localStorage.setItem(storageKey(userId), '1');
  } catch {
    // Not persisted.
  }
}

function hasSeen(userId: string) {
  try {
    return localStorage.getItem(storageKey(userId)) === '1';
  } catch {
    return true; // Without storage, do not nag on every load.
  }
}

/**
 * First visible element with the given data-tour attribute. The same target can exist twice
 * (e.g. "nav" in the desktop sidebar and in the mobile bottom bar); only one is displayed.
 */
function findVisibleTarget(target: string): HTMLElement | null {
  for (const element of document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return element;
  }
  return null;
}

/** Waits (up to ~3s) for a visible element with the given data-tour attribute. */
function waitForTarget(
  target: string,
  signal: { cancelled: boolean },
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const started = performance.now();
    const check = () => {
      if (signal.cancelled) return resolve(null);
      const element = findVisibleTarget(target);
      if (element) return resolve(element);
      if (performance.now() - started > 3000) return resolve(null);
      window.setTimeout(check, 80);
    };
    check();
  });
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [index, setIndex] = useState<number | null>(null);
  // The provider only mounts inside the authenticated shell, so `user` is known here.
  const [welcomeOpen, setWelcomeOpen] = useState(() => Boolean(user && !hasSeen(user.id)));

  const start = useCallback(() => {
    setWelcomeOpen(false);
    markSeen(user?.id);
    setIndex(0);
  }, [user?.id]);

  const stop = useCallback(() => {
    markSeen(user?.id);
    setIndex(null);
  }, [user?.id]);

  const value = useMemo(() => ({ start, active: index !== null }), [start, index]);

  return (
    <TourContext.Provider value={value}>
      {children}
      <WelcomeModal
        open={welcomeOpen}
        onStart={start}
        onLater={() => {
          setWelcomeOpen(false);
          markSeen(user?.id);
        }}
      />
      {index !== null && (
        <TourOverlay key={index} index={index} setIndex={setIndex} onClose={stop} />
      )}
    </TourContext.Provider>
  );
}

function WelcomeModal({
  open,
  onStart,
  onLater,
}: {
  open: boolean;
  onStart: () => void;
  onLater: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      title={t('tour.welcomeTitle')}
      size="sm"
      onClose={onLater}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onLater}>
            {t('tour.later')}
          </Button>
          <Button icon={<Compass className="h-4 w-4" />} onClick={onStart}>
            {t('tour.start')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <Mascot size={120} mood="wave" />
        <p className="text-sm text-muted">{t('tour.welcomeBody')}</p>
      </div>
    </Modal>
  );
}

function TourOverlay({
  index,
  setIndex,
  onClose,
}: {
  index: number;
  setIndex: (index: number) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const modules = useModules();
  // Only the steps of the modules this business has.
  const steps = TOUR_STEPS.filter((item) => !item.module || modules[item.module]);
  const step = steps[Math.min(index, steps.length - 1)]!;
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(200);
  const isLast = index >= steps.length - 1;

  // Navigate to the step's page, then find and focus its target.
  useEffect(() => {
    // Each step remounts this component (key={index}), so `ready` starts false.
    const signal = { cancelled: false };
    // Routes may include a query (e.g. a dashboard view): compare it too when present.
    const current = step.route?.includes('?')
      ? location.pathname + location.search
      : location.pathname;
    if (step.route && current !== step.route) {
      navigate(step.route);
      return () => {
        signal.cancelled = true;
      };
    }
    void waitForTarget(step.target, signal).then((element) => {
      if (signal.cancelled) return;
      if (element) {
        element.scrollIntoView({ block: 'center', inline: 'nearest' });
        // Measure after scrolling settles.
        window.setTimeout(() => {
          if (!signal.cancelled) {
            setRect(element.getBoundingClientRect());
            setReady(true);
          }
        }, 120);
      } else {
        setRect(null);
        setReady(true);
      }
    });
    return () => {
      signal.cancelled = true;
    };
  }, [step, location.pathname, location.search, navigate]);

  // Keep the spotlight aligned on resize/scroll.
  useEffect(() => {
    const update = () => {
      setRect(findVisibleTarget(step.target)?.getBoundingClientRect() ?? null);
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step.target]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
  }, [index, ready]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') {
        if (isLast) onClose();
        else setIndex(index + 1);
      }
      if (event.key === 'ArrowLeft' && index > 0) setIndex(index - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, isLast, onClose, setIndex]);

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(CARD_WIDTH, viewportWidth - MARGIN * 2);

  const cardStyle = placeCard(rect, width, cardHeight, viewportWidth, viewportHeight);
  // Keep the spotlight inside the viewport even for elements touching the edges.
  const spot = rect && {
    top: Math.max(4, rect.top - SPOTLIGHT_PADDING),
    left: Math.max(4, rect.left - SPOTLIGHT_PADDING),
    right: Math.min(viewportWidth - 4, rect.right + SPOTLIGHT_PADDING),
    bottom: Math.min(viewportHeight - 4, rect.bottom + SPOTLIGHT_PADDING),
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      {/* Backdrop with a spotlight "hole" around the target. */}
      {rect && ready ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all duration-300"
          style={{
            top: spot!.top,
            left: spot!.left,
            width: spot!.right - spot!.left,
            height: spot!.bottom - spot!.top,
            boxShadow: '0 0 0 9999px rgb(2 6 23 / 0.66)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/66" />
      )}

      <div
        ref={cardRef}
        className={cx(
          'absolute rounded-2xl border border-line bg-surface p-6 text-ink shadow-pop',
          ready ? 'animate-pop-in' : 'opacity-0',
        )}
        style={cardStyle}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Mascot variant="avatar" size={28} mood="happy" />
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-semibold text-primary-ink tabular-nums">
              {t('tour.progress', { current: index + 1, total: steps.length })}
            </span>
          </span>
          <IconButton size="sm" label={t('tour.skip')} onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <h2 id="tour-title" className="text-base font-semibold">
          {t(`tour.steps.${step.id}.title`)}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {t(`tour.steps.${step.id}.body`)}
        </p>
        <div className="mt-4 flex items-center gap-1" aria-hidden="true">
          {steps.map((item, dot) => (
            <span
              key={item.id}
              className={cx(
                'h-1.5 rounded-full transition-all duration-300',
                dot === index ? 'w-5 bg-primary' : 'w-1.5 bg-line-strong',
              )}
            />
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          {index > 0 ? (
            <Button
              variant="secondary"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => setIndex(index - 1)}
            >
              {t('tour.previous')}
            </Button>
          ) : (
            <Button variant="ghost" className="-ml-3" onClick={onClose}>
              {t('tour.skip')}
            </Button>
          )}
          <Button
            autoFocus
            className="pr-3.5"
            onClick={() => (isLast ? onClose() : setIndex(index + 1))}
            icon={isLast ? <Check className="h-4 w-4" /> : undefined}
          >
            {isLast ? t('tour.finish') : t('tour.next')}
            {!isLast && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with its provider
export function useTour() {
  const context = useContext(TourContext);
  if (!context) throw new Error('useTour must be used within a TourProvider');
  return context;
}
