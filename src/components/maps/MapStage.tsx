import { Box, Map as MapIcon, MapPin, Minus, Plus, RotateCcw, RotateCw, Scan } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { IconButton, SegmentedControl, cx } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { MapSpot, StoreMap } from '../../lib/types';
import { SPOT_TONES } from './spotTones';

export type MapView = '2d' | '3d';

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 4;
const START_TILT = 52;
const START_TURN = -18;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
  /** 3D only: how much the plan leans back (0 = seen from above) and how much it is turned. */
  tilt: number;
  turn: number;
}

const START: ViewState = { zoom: 1, panX: 0, panY: 0, tilt: START_TILT, turn: START_TURN };

type Gesture =
  | { kind: 'pan' | 'orbit'; x: number; y: number; start: ViewState; moved: boolean }
  | {
      kind: 'spot';
      x: number;
      y: number;
      spot: MapSpot;
      moved: boolean;
      /** From the pointer to the spot's point on the floor, so the pin does not jump. */
      offsetX: number;
      offsetY: number;
    }
  | { kind: 'pinch'; distance: number; zoom: number; moved: true };

/**
 * A floor plan with its spots, seen from above (2D) or leaning back like a model (3D, drawn with
 * CSS 3D transforms: the pins stand up and face you). Drag to move (2D) or turn it (3D), the
 * wheel or two fingers to zoom. In 2D, with `placing`, a tap marks a new spot; with `editable`,
 * dragging a pin moves it.
 */
export function MapStage({
  map,
  view,
  onViewChange,
  selectedId = null,
  highlight = null,
  placing = false,
  editable = false,
  onPlace,
  onSelect,
  onMove,
  focus = null,
  className,
}: {
  map: StoreMap;
  view: MapView;
  onViewChange: (view: MapView) => void;
  selectedId?: string | null;
  /** Spots that match a search (the others fade); null: no search. */
  highlight?: ReadonlySet<string> | null;
  placing?: boolean;
  editable?: boolean;
  onPlace?: (x: number, y: number) => void;
  onSelect: (spot: MapSpot | null) => void;
  onMove?: (spot: MapSpot, x: number, y: number) => void;
  /** Spot to bring to the middle (2D); a new `at` moves the plan there again. */
  focus?: { id: string; at: number } | null;
  className?: string;
}) {
  const { t } = useI18n();
  const viewport = useRef<HTMLDivElement>(null);
  const plane = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [state, setState] = useState<ViewState>(START);
  const [dragging, setDragging] = useState(false);
  // A pin being dragged: where it goes (fractions of the plan).
  const [moving, setMoving] = useState<{ id: string; x: number; y: number } | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const depth = view === '3d';
  // Small screens: only the chosen or found spots show their name, so labels do not pile up.
  const compact = size.width < 520;

  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // The wheel zooms (a non-passive listener, so the page does not scroll).
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setState((current) => ({
        ...current,
        zoom: clamp(current.zoom * Math.exp(-event.deltaY * 0.0015), MIN_ZOOM, MAX_ZOOM),
      }));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, []);

  // Another plan or another view: start from the whole plan (adjusted while rendering).
  const viewKey = `${map.id}:${view}`;
  const [shownKey, setShownKey] = useState(viewKey);
  if (shownKey !== viewKey) {
    setShownKey(viewKey);
    setState(START);
  }

  // The plan fits the box; leaning back it looks shorter, so in 3D it may be a bit taller.
  const aspect = map.aspect > 0 ? map.aspect : 1.5;
  const fitWidth = Math.max(
    0,
    Math.min(
      size.width * (depth ? (compact ? 0.84 : 0.64) : 0.92),
      size.height * (depth ? 0.82 : 0.9) * aspect,
    ),
  );
  const width = fitWidth;
  const height = fitWidth / aspect;

  // Bring a spot to the middle once per request (2D: the plan moves under it).
  const [focusedAt, setFocusedAt] = useState<number | null>(null);
  if (focus && width > 0 && focusedAt !== focus.at) {
    setFocusedAt(focus.at);
    const spot = map.spots.find((item) => item.id === focus.id);
    if (spot) {
      const zoom = Math.max(state.zoom, 1.5);
      setState(
        depth
          ? { ...state, panX: 0, panY: 0 }
          : {
              ...state,
              zoom,
              panX: -(spot.x - 0.5) * width * zoom,
              panY: -(spot.y - 0.5) * height * zoom,
            },
      );
    }
  }

  const fractionAt = (clientX: number, clientY: number) => {
    const rect = plane.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return {
      x: clamp((clientX - rect.left) / rect.width, 0, 1),
      y: clamp((clientY - rect.top) / rect.height, 0, 1),
    };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    // The floating controls work as plain buttons.
    if ((event.target as HTMLElement).closest('[data-map-control]')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        kind: 'pinch',
        distance: Math.hypot(a!.x - b!.x, a!.y - b!.y) || 1,
        zoom: state.zoom,
        moved: true,
      };
      setMoving(null);
      return;
    }
    const spotId = (event.target as HTMLElement).closest<HTMLElement>('[data-spot-id]')?.dataset
      .spotId;
    const spot = spotId ? map.spots.find((item) => item.id === spotId) : undefined;
    const rect = plane.current?.getBoundingClientRect();
    gesture.current = spot
      ? {
          kind: 'spot',
          x: event.clientX,
          y: event.clientY,
          spot,
          moved: false,
          offsetX: rect ? event.clientX - (rect.left + spot.x * rect.width) : 0,
          offsetY: rect ? event.clientY - (rect.top + spot.y * rect.height) : 0,
        }
      : {
          kind: depth ? 'orbit' : 'pan',
          x: event.clientX,
          y: event.clientY,
          start: state,
          moved: false,
        };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const current = gesture.current;
    if (!current) return;
    if (current.kind === 'pinch') {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      setState((view) => ({
        ...view,
        zoom: clamp((current.zoom * distance) / current.distance, MIN_ZOOM, MAX_ZOOM),
      }));
      return;
    }
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.moved && Math.hypot(dx, dy) < 5) return;
    if (!current.moved) {
      current.moved = true;
      setDragging(true);
    }
    if (current.kind === 'spot') {
      // Only an editable 2D plan moves its pins; otherwise dragging a pin moves the plan.
      if (editable && !depth) {
        const point = fractionAt(event.clientX - current.offsetX, event.clientY - current.offsetY);
        if (point) setMoving({ id: current.spot.id, ...point });
      }
      return;
    }
    const { start } = current;
    setState(
      current.kind === 'orbit'
        ? { ...start, turn: start.turn + dx * 0.35, tilt: clamp(start.tilt - dy * 0.25, 0, 72) }
        : { ...start, panX: start.panX + dx, panY: start.panY + dy },
    );
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) return;
    const current = gesture.current;
    if (pointers.current.size > 0) {
      // One finger of a pinch lifted: the other one does nothing until a new touch.
      gesture.current = null;
      return;
    }
    gesture.current = null;
    setDragging(false);
    if (!current || current.kind === 'pinch') return;
    if (current.kind === 'spot') {
      if (!current.moved) onSelect(current.spot);
      else if (editable && !depth) {
        // Where it was let go (the state of the last move may not be drawn yet).
        const point = fractionAt(event.clientX - current.offsetX, event.clientY - current.offsetY);
        if (point) onMove?.(current.spot, point.x, point.y);
      }
      setMoving(null);
      return;
    }
    if (current.moved) return;
    if (placing && !depth) {
      const point = fractionAt(event.clientX, event.clientY);
      if (point) onPlace?.(point.x, point.y);
      return;
    }
    onSelect(null);
  };

  const zoomBy = (factor: number) =>
    setState((current) => ({
      ...current,
      zoom: clamp(current.zoom * factor, MIN_ZOOM, MAX_ZOOM),
    }));

  const transform = depth
    ? `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom}) rotateX(${state.tilt}deg) rotateZ(${state.turn}deg)`
    : `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  // The pins stand up in 3D: they undo the turn and the lean of the plan.
  const standUp = depth ? `rotateZ(${-state.turn}deg) rotateX(${-state.tilt}deg)` : 'none';

  return (
    <div
      ref={viewport}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cx(
        'relative touch-none overflow-hidden rounded-2xl bg-surface-2 select-none',
        placing && !depth ? 'cursor-crosshair' : dragging ? 'cursor-grabbing' : 'cursor-grab',
        className,
      )}
      style={{ perspective: `${Math.max(900, size.width * 1.6)}px` }}
    >
      {width > 0 && (
        <div
          ref={plane}
          className="absolute top-1/2 left-1/2"
          style={{
            width,
            height,
            marginLeft: -width / 2,
            marginTop: -height / 2,
            transform,
            transformStyle: 'preserve-3d',
            transition: dragging ? 'none' : 'transform 450ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          {/* The slab under the plan, so in 3D it has some thickness. */}
          {depth && (
            <div
              aria-hidden
              className="absolute inset-0 rounded-lg bg-line-strong shadow-pop"
              style={{ transform: 'translateZ(-10px)' }}
            />
          )}
          <div className="absolute inset-0 overflow-hidden rounded-lg border border-line bg-surface shadow-card">
            {map.imageUrl ? (
              <img
                src={map.imageUrl}
                alt={map.name}
                draggable={false}
                className="pointer-events-none h-full w-full object-fill"
              />
            ) : (
              <div
                aria-hidden
                className="h-full w-full"
                style={{
                  backgroundImage:
                    'linear-gradient(var(--color-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-line) 1px, transparent 1px)',
                  backgroundSize: `${Math.max(16, width / 16)}px ${Math.max(16, width / 16)}px`,
                }}
              />
            )}
          </div>

          {map.spots.map((spot) => {
            const at = moving?.id === spot.id ? moving : spot;
            const tone = SPOT_TONES[spot.color] ?? SPOT_TONES.primary;
            const selected = spot.id === selectedId;
            const matched = highlight?.has(spot.id) ?? false;
            const faded = highlight !== null && !matched && !selected;
            return (
              <div
                key={spot.id}
                className={cx('absolute transition-opacity', faded && 'opacity-30')}
                style={{
                  left: `${at.x * 100}%`,
                  top: `${at.y * 100}%`,
                  transformStyle: 'preserve-3d',
                  zIndex: selected ? 3 : matched ? 2 : 1,
                }}
              >
                {/* The mark on the floor. */}
                <span
                  aria-hidden
                  className={cx('absolute h-4 w-4 rounded-full ring-2', tone.floor)}
                  style={{ transform: `translate(-50%, -50%) scale(${1 / state.zoom})` }}
                />
                {/* The pin, standing up (3D) and always the same size on screen. */}
                <div style={{ transform: standUp, transformStyle: 'preserve-3d' }}>
                  <div
                    className="absolute bottom-0 left-0"
                    style={{
                      transform: `scale(${1 / state.zoom})`,
                      transformOrigin: '0 100%',
                    }}
                  >
                    <button
                      type="button"
                      data-spot-id={spot.id}
                      // Pointer taps are handled by the stage; this is for the keyboard.
                      onClick={(event) => event.detail === 0 && onSelect(spot)}
                      aria-pressed={selected}
                      aria-label={`${spot.name} · ${t('locations.productsCount', { count: spot.products.length })}`}
                      className={cx(
                        'group flex -translate-x-1/2 flex-col items-center outline-none',
                        editable && !depth && 'cursor-move',
                      )}
                    >
                      {(!compact || selected || matched) && (
                        <span
                          className={cx(
                            'mb-1 flex max-w-36 items-center gap-1 rounded-full border bg-surface px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-ink shadow-card',
                            selected || matched ? 'border-line-strong' : 'border-line',
                          )}
                        >
                          <span className="truncate">{spot.name}</span>
                          {spot.products.length > 0 && (
                            <span className="rounded-full bg-surface-3 px-1 text-[10px] text-muted tabular-nums">
                              {spot.products.length}
                            </span>
                          )}
                        </span>
                      )}
                      <span
                        className={cx(
                          'relative flex items-center justify-center rounded-full text-white shadow-pop ring-white transition-all',
                          tone.pin,
                          selected
                            ? 'h-9 w-9 ring-4'
                            : compact
                              ? 'h-6 w-6 ring-2'
                              : 'h-7 w-7 ring-2',
                          'group-focus-visible:ring-4',
                        )}
                      >
                        {matched && (
                          <span
                            aria-hidden
                            className={cx(
                              'absolute inset-0 animate-ping rounded-full opacity-60',
                              tone.pin,
                            )}
                          />
                        )}
                        <MapPin className={selected ? 'h-5 w-5' : 'h-4 w-4'} />
                      </span>
                      {/* The stick down to the floor. */}
                      <span
                        aria-hidden
                        className={cx('w-0.5 rounded-full', tone.pin, depth ? 'h-6' : 'h-1.5')}
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating controls. */}
      <div data-map-control className="absolute top-3 left-3 z-10">
        <SegmentedControl
          size="sm"
          label={t('locations.view.label')}
          value={view}
          onChange={onViewChange}
          options={[
            { value: '2d', label: t('locations.view.flat'), icon: <MapIcon className="h-4 w-4" /> },
            { value: '3d', label: t('locations.view.depth'), icon: <Box className="h-4 w-4" /> },
          ]}
        />
      </div>
      <div
        data-map-control
        className="absolute right-3 bottom-3 z-10 flex gap-1 rounded-xl border border-line bg-surface/95 p-1 shadow-card sm:flex-col"
      >
        <IconButton size="sm" label={t('locations.zoomIn')} onClick={() => zoomBy(1.3)}>
          <Plus className="h-4 w-4" />
        </IconButton>
        <IconButton size="sm" label={t('locations.zoomOut')} onClick={() => zoomBy(1 / 1.3)}>
          <Minus className="h-4 w-4" />
        </IconButton>
        {depth && (
          <>
            <IconButton
              size="sm"
              label={t('locations.rotateLeft')}
              onClick={() => setState((current) => ({ ...current, turn: current.turn - 45 }))}
            >
              <RotateCcw className="h-4 w-4" />
            </IconButton>
            <IconButton
              size="sm"
              label={t('locations.rotateRight')}
              onClick={() => setState((current) => ({ ...current, turn: current.turn + 45 }))}
            >
              <RotateCw className="h-4 w-4" />
            </IconButton>
          </>
        )}
        <IconButton size="sm" label={t('locations.reset')} onClick={() => setState(START)}>
          <Scan className="h-4 w-4" />
        </IconButton>
      </div>
      {!(placing && !depth) && (
        <p className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[calc(100%-5rem)] rounded-lg bg-surface/90 px-2.5 py-1 text-xs text-muted shadow-card max-sm:hidden">
          {depth
            ? t('locations.hint.depth')
            : t(editable ? 'locations.hint.flatEdit' : 'locations.hint.flat')}
        </p>
      )}
    </div>
  );
}
