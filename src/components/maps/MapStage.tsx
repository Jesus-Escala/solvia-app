import { Box, Map as MapIcon, Minus, Plus, RotateCcw, RotateCw, Scan } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { IconButton, SegmentedControl, cx } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { MapSpot, SpotProduct, StoreMap } from '../../lib/types';
import { ProductThumb } from '../domain/ProductThumb';
import { spotPaint } from './spotTones';

export type MapView = '2d' | '3d';

/** An area of the plan: its center and size, as fractions of the plan's width and height. */
export interface SpotArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 4;
const START_TILT = 52;
const START_TURN = -18;
/** A tap (no drag) while marking makes an area of this size. */
const TAP_SIZE = { w: 0.12, h: 0.09 };
const MIN_SIZE = 0.02;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Keeps an area inside the plan. */
function fit(area: SpotArea): SpotArea {
  const w = clamp(area.w, MIN_SIZE, 1);
  const h = clamp(area.h, MIN_SIZE, 1);
  return { w, h, x: clamp(area.x, w / 2, 1 - w / 2), y: clamp(area.y, h / 2, 1 - h / 2) };
}

interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
  /** 3D only: how much the plan leans back (0 = seen from above) and how much it is turned. */
  tilt: number;
  turn: number;
}

const START: ViewState = { zoom: 1, panX: 0, panY: 0, tilt: START_TILT, turn: START_TURN };

type Point = { x: number; y: number };
type Gesture =
  | { kind: 'pan' | 'orbit'; x: number; y: number; start: ViewState; moved: boolean }
  | { kind: 'draw'; x: number; y: number; from: Point; moved: boolean }
  | {
      kind: 'move';
      x: number;
      y: number;
      spot: MapSpot;
      moved: boolean;
      /** Only an editable 2D plan moves its areas; otherwise a tap selects. */
      movable: boolean;
      /** From the pointer to the area's center, so it does not jump. */
      grab: Point;
    }
  | { kind: 'resize'; x: number; y: number; spot: MapSpot; moved: boolean }
  | { kind: 'pinch'; distance: number; zoom: number; moved: true };

/**
 * A floor plan with its areas (shelves, fridges…), seen from above (2D) or like a model (3D,
 * drawn with CSS 3D transforms: each area is a raised block with its products' pictures on top
 * and a label that faces you). Drag to move (2D) or turn it (3D), the wheel or two fingers to
 * zoom. In 2D, with `placing`, dragging draws a new area (a tap makes a small one); with
 * `editable`, areas drag to move and the corner of the chosen one resizes it.
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
  onChange,
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
  onPlace?: (area: SpotArea) => void;
  onSelect: (spot: MapSpot | null) => void;
  /** An area moved or resized. */
  onChange?: (spot: MapSpot, area: SpotArea) => void;
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
  // An area being drawn ('new'), moved or resized, while the pointer is down.
  const [draft, setDraft] = useState<{ id: string; area: SpotArea } | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const depth = view === '3d';
  // Small screens: only the chosen or found areas show their label, so labels do not pile up.
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

  // The plan fits the box; leaning back it looks shorter, so in 3D it leaves room around.
  const aspect = map.aspect > 0 ? map.aspect : 1.5;
  const width = Math.max(
    0,
    Math.min(
      size.width * (depth ? (compact ? 0.84 : 0.66) : 0.94),
      size.height * (depth ? 0.85 : 0.92) * aspect,
    ),
  );
  const height = width / aspect;
  // Height of the blocks in 3D, the same for all (like shelves), in pixels of the plan.
  const blockHeight = clamp(width * 0.04, 10, 36);

  // Bring a spot to the middle once per request (2D: the plan moves under it).
  const [focusedAt, setFocusedAt] = useState<number | null>(null);
  if (focus && width > 0 && focusedAt !== focus.at) {
    setFocusedAt(focus.at);
    const spot = map.spots.find((item) => item.id === focus.id);
    if (spot) {
      const zoom = Math.max(state.zoom, 1.4);
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

  const fractionAt = (clientX: number, clientY: number): Point | null => {
    const rect = plane.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return {
      x: clamp((clientX - rect.left) / rect.width, 0, 1),
      y: clamp((clientY - rect.top) / rect.height, 0, 1),
    };
  };

  /** The area a draw, move or resize gesture gives with the pointer at this place. */
  const areaFor = (current: Gesture, clientX: number, clientY: number): SpotArea | null => {
    const point = fractionAt(clientX, clientY);
    if (!point) return null;
    if (current.kind === 'draw') {
      return fit({
        x: (current.from.x + point.x) / 2,
        y: (current.from.y + point.y) / 2,
        w: Math.abs(point.x - current.from.x),
        h: Math.abs(point.y - current.from.y),
      });
    }
    if (current.kind === 'move') {
      const { spot, grab } = current;
      return fit({ ...spot, x: point.x - grab.x, y: point.y - grab.y });
    }
    if (current.kind === 'resize') {
      const { spot } = current;
      // The top-left corner stays; the bottom-right one follows the pointer.
      const left = spot.x - spot.w / 2;
      const top = spot.y - spot.h / 2;
      const w = Math.max(MIN_SIZE, point.x - left);
      const h = Math.max(MIN_SIZE, point.y - top);
      return fit({ x: left + w / 2, y: top + h / 2, w, h });
    }
    return null;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    // The floating controls work as plain buttons.
    if (target.closest('[data-map-control]')) return;
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
      setDraft(null);
      return;
    }
    const at = { x: event.clientX, y: event.clientY, moved: false };
    const spotId = target.closest<HTMLElement>('[data-spot-id]')?.dataset.spotId;
    const spot = spotId ? map.spots.find((item) => item.id === spotId) : undefined;
    const editing = editable && !depth;
    if (spot && editing && target.closest('[data-resize]')) {
      gesture.current = { kind: 'resize', ...at, spot };
    } else if (spot) {
      const point = fractionAt(event.clientX, event.clientY);
      gesture.current = {
        kind: 'move',
        ...at,
        spot,
        movable: editing,
        grab: point ? { x: point.x - spot.x, y: point.y - spot.y } : { x: 0, y: 0 },
      };
    } else if (placing && !depth) {
      const from = fractionAt(event.clientX, event.clientY);
      if (from) gesture.current = { kind: 'draw', ...at, from };
    } else {
      gesture.current = { kind: depth ? 'orbit' : 'pan', ...at, start: state };
    }
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
    if (current.kind === 'draw' || current.kind === 'resize') {
      const area = areaFor(current, event.clientX, event.clientY);
      if (area) setDraft({ id: current.kind === 'draw' ? 'new' : current.spot.id, area });
      return;
    }
    if (current.kind === 'move') {
      if (!current.movable) return;
      const area = areaFor(current, event.clientX, event.clientY);
      if (area) setDraft({ id: current.spot.id, area });
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
    gesture.current = null;
    // One finger of a pinch lifted: the other one does nothing until a new touch.
    if (pointers.current.size > 0) return;
    setDragging(false);
    setDraft(null);
    if (!current || current.kind === 'pinch') return;
    if (current.kind === 'draw') {
      const drawn = current.moved ? areaFor(current, event.clientX, event.clientY) : null;
      // A tap, or a line too thin to be an area: a small area where it was tapped.
      const area =
        drawn && drawn.w > MIN_SIZE * 1.5 && drawn.h > MIN_SIZE * 1.5
          ? drawn
          : fit({ ...current.from, ...TAP_SIZE });
      onPlace?.(area);
      return;
    }
    if (current.kind === 'move' || current.kind === 'resize') {
      if (!current.moved) {
        onSelect(current.spot);
        return;
      }
      if (current.kind === 'move' && !current.movable) return;
      const area = areaFor(current, event.clientX, event.clientY);
      if (area) onChange?.(current.spot, area);
      return;
    }
    if (!current.moved) onSelect(null);
  };

  const zoomBy = (factor: number) =>
    setState((current) => ({
      ...current,
      zoom: clamp(current.zoom * factor, MIN_ZOOM, MAX_ZOOM),
    }));

  const transform = depth
    ? `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom}) rotateX(${state.tilt}deg) rotateZ(${state.turn}deg)`
    : `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  // Labels face you in 3D: they undo the turn and the lean of the plan.
  const standUp = depth ? `rotateZ(${-state.turn}deg) rotateX(${-state.tilt}deg)` : '';

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
            const area = draft?.id === spot.id ? draft.area : spot;
            const selected = spot.id === selectedId;
            const matched = highlight?.has(spot.id) ?? false;
            return (
              <SpotShape
                key={spot.id}
                spot={spot}
                area={area}
                depth={depth}
                zoom={state.zoom}
                standUp={standUp}
                planWidth={width}
                planHeight={height}
                blockHeight={blockHeight}
                selected={selected}
                matched={matched}
                faded={highlight !== null && !matched && !selected}
                showLabel={!compact || selected || matched}
                resizable={selected && editable && !depth}
                countLabel={t('locations.productsCount', { count: spot.products.length })}
                onKeySelect={() => onSelect(spot)}
              />
            );
          })}

          {draft?.id === 'new' && (
            <div
              aria-hidden
              className="absolute rounded-md border-2 border-dashed border-primary bg-primary/15"
              style={areaBox(draft.area)}
            />
          )}
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
        className="absolute right-3 bottom-3 z-10 flex gap-1 rounded-xl border border-line bg-surface/95 p-1 shadow-card sm:top-3 sm:bottom-auto sm:flex-col"
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
        <p className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)] rounded-lg bg-surface/90 px-2.5 py-1 text-xs text-muted shadow-card max-sm:hidden">
          {depth
            ? t('locations.hint.depth')
            : t(editable ? 'locations.hint.flatEdit' : 'locations.hint.flat')}
        </p>
      )}
    </div>
  );
}

/** Position and size of an area inside the plan (percentages). */
function areaBox(area: SpotArea): CSSProperties {
  return {
    left: `${(area.x - area.w / 2) * 100}%`,
    top: `${(area.y - area.h / 2) * 100}%`,
    width: `${area.w * 100}%`,
    height: `${area.h * 100}%`,
  };
}

/** One area: a tinted box on the plan (2D) or a raised block (3D), with its products' pictures. */
function SpotShape({
  spot,
  area,
  depth,
  zoom,
  standUp,
  planWidth,
  planHeight,
  blockHeight,
  selected,
  matched,
  faded,
  showLabel,
  resizable,
  countLabel,
  onKeySelect,
}: {
  spot: MapSpot;
  area: SpotArea;
  depth: boolean;
  zoom: number;
  standUp: string;
  planWidth: number;
  planHeight: number;
  blockHeight: number;
  selected: boolean;
  matched: boolean;
  faded: boolean;
  showLabel: boolean;
  resizable: boolean;
  countLabel: string;
  onKeySelect: () => void;
}) {
  const paint = spotPaint(spot.color);
  // Size of the area on screen, to decide what fits inside it.
  const screen = { w: area.w * planWidth * zoom, h: area.h * planHeight * zoom };
  const outline = selected
    ? `0 0 0 ${3 / zoom}px var(--color-ink)`
    : matched
      ? `0 0 0 ${3 / zoom}px ${paint.base}`
      : undefined;
  const face = (
    <FaceContent spot={spot} screen={screen} zoom={zoom} textOnFace={depth || screen.w >= 56} />
  );

  return (
    <div
      data-spot-id={spot.id}
      className={cx('absolute transition-opacity', faded && 'opacity-35')}
      style={{
        ...areaBox(area),
        transformStyle: 'preserve-3d',
        zIndex: selected ? 3 : matched ? 2 : 1,
      }}
    >
      {/* Pointer taps are handled by the stage; this is for the keyboard. */}
      <button
        type="button"
        onClick={(event) => event.detail === 0 && onKeySelect()}
        aria-pressed={selected}
        aria-label={`${spot.name} · ${countLabel}`}
        className="absolute inset-0 opacity-0 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-primary"
      />
      {depth ? (
        <>
          {/* A block: its top raised by `blockHeight` and four sides down to the floor. */}
          <div
            className="absolute inset-0 overflow-hidden rounded-[2px] border"
            style={{
              background: paint.soft,
              borderColor: paint.base,
              boxShadow: outline,
              transform: `translateZ(${blockHeight}px)`,
            }}
          >
            {face}
          </div>
          <div
            aria-hidden
            className="absolute top-full left-0 w-full origin-top"
            style={{ height: blockHeight, background: paint.side, transform: 'rotateX(90deg)' }}
          />
          <div
            aria-hidden
            className="absolute bottom-full left-0 w-full origin-bottom"
            style={{ height: blockHeight, background: paint.shade, transform: 'rotateX(-90deg)' }}
          />
          <div
            aria-hidden
            className="absolute top-0 left-full h-full origin-left"
            style={{ width: blockHeight, background: paint.shade, transform: 'rotateY(-90deg)' }}
          />
          <div
            aria-hidden
            className="absolute top-0 right-full h-full origin-right"
            style={{ width: blockHeight, background: paint.side, transform: 'rotateY(90deg)' }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0 overflow-hidden rounded-md border-2"
          style={{
            background: `color-mix(in srgb, ${paint.base} 26%, transparent)`,
            borderColor: paint.base,
            boxShadow: outline,
          }}
        >
          {face}
        </div>
      )}

      {/* The label over the area (in 3D it stands up and faces you). */}
      {showLabel && (depth || screen.w < 56 || screen.h < 26) && (
        <div
          className={cx('absolute left-1/2', depth ? 'top-1/2' : 'top-0')}
          style={{
            transform: depth ? `translateZ(${blockHeight + 1}px) ${standUp}` : undefined,
            transformStyle: 'preserve-3d',
          }}
        >
          <div
            className="absolute bottom-0 left-0"
            style={{ transform: `scale(${1 / zoom})`, transformOrigin: '0 100%' }}
          >
            <SpotLabel spot={spot} highlighted={selected || matched} />
          </div>
        </div>
      )}

      {resizable && (
        <span
          data-resize
          className="absolute -right-2 -bottom-2 flex h-4 w-4 cursor-nwse-resize items-center justify-center rounded-sm border-2 border-ink bg-surface shadow-card"
          style={{ transform: `scale(${1 / zoom})` }}
        />
      )}
    </div>
  );
}

/** What an area shows inside: its name and the pictures of its products, when they fit. */
function FaceContent({
  spot,
  screen,
  zoom,
  textOnFace,
}: {
  spot: MapSpot;
  screen: { w: number; h: number };
  zoom: number;
  textOnFace: boolean;
}) {
  const thumb = screen.h >= 64 ? 26 : 20;
  const fits = Math.max(0, Math.floor((screen.w - 10) / (thumb + 4)));
  const showPictures = spot.products.length > 0 && screen.h >= 46 && fits >= 1;
  const shown = spot.products.slice(0, spot.products.length > fits ? fits - 1 : fits);
  const more = spot.products.length - shown.length;
  if (!textOnFace && !showPictures) return null;
  return (
    // Drawn at screen size (undoing the zoom), so text and pictures stay readable.
    <div
      className="pointer-events-none flex flex-col gap-1 p-1"
      style={{
        width: screen.w,
        height: screen.h,
        transform: `scale(${1 / zoom})`,
        transformOrigin: '0 0',
      }}
    >
      {textOnFace && screen.h >= 22 && (
        <span className="truncate text-[11px] leading-tight font-semibold text-ink">
          {spot.name}
        </span>
      )}
      {showPictures && (
        <span className="flex flex-wrap gap-1">
          {shown.map((product) => (
            <ProductPicture key={product.id} product={product} size={thumb} />
          ))}
          {more > 0 && (
            <span
              className="flex items-center justify-center rounded-md bg-surface/90 text-[10px] font-semibold text-muted tabular-nums"
              style={{ width: thumb, height: thumb }}
            >
              +{more}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

function ProductPicture({ product, size }: { product: SpotProduct; size: number }) {
  return (
    <span
      title={product.name}
      className="overflow-hidden rounded-md bg-surface ring-1 ring-line"
      style={{ width: size, height: size }}
    >
      <ProductThumb name={product.name} imageUrl={product.imageUrl} size={size} />
    </span>
  );
}

/** Name, how many products and the first pictures, in a chip over the area. */
function SpotLabel({ spot, highlighted }: { spot: MapSpot; highlighted: boolean }) {
  const paint = spotPaint(spot.color);
  // Only real pictures: initials are unreadable this small.
  const pictures = spot.products.filter((product) => product.imageUrl).slice(0, 3);
  return (
    <span
      className={cx(
        'mb-1.5 flex max-w-48 -translate-x-1/2 items-center gap-1.5 rounded-full border bg-surface py-0.5 pr-2 pl-1 text-[11px] font-semibold whitespace-nowrap text-ink shadow-pop',
        highlighted ? 'border-line-strong' : 'border-line',
      )}
    >
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: paint.base }} />
      <span className="truncate">{spot.name}</span>
      {pictures.length > 0 && (
        <span className="flex shrink-0 -space-x-1.5">
          {pictures.map((product) => (
            <span
              key={product.id}
              className="overflow-hidden rounded-full ring-2 ring-surface"
              style={{ width: 18, height: 18 }}
            >
              <ProductThumb name={product.name} imageUrl={product.imageUrl} size={18} />
            </span>
          ))}
        </span>
      )}
      {spot.products.length > 0 && (
        <span className="rounded-full bg-surface-3 px-1 text-[10px] text-muted tabular-nums">
          {spot.products.length}
        </span>
      )}
    </span>
  );
}
