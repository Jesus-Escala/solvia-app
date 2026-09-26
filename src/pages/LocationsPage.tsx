import {
  ArrowLeft,
  ImagePlus,
  MapPinPlus,
  Map as MapIcon,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Alert,
  Button,
  EmptyState,
  IconButton,
  MenuItems,
  Page,
  PageHeader,
  Popover,
  SearchInput,
  Skeleton,
  Tabs,
  TextButton,
  cx,
  useFeedback,
} from '@/ui';
import { useAuth } from '../auth/AuthContext';
import { SearchPicker } from '../components/domain/SearchPicker';
import { ProductThumb } from '../components/domain/ProductThumb';
import { MapFormModal, SpotFormModal } from '../components/maps/MapForms';
import { MapStage, type MapView } from '../components/maps/MapStage';
import { SPOT_TONES } from '../components/maps/spotTones';
import { PLAN_IMAGE_TYPES, useUploadPlanImage } from '../components/maps/useUploadPlanImage';
import { Kbd } from '../components/pos/PosLayout';
import { ADD_KEY_LABEL } from '../components/pos/keys';
import {
  useDeleteSpot,
  useDeleteStoreMap,
  usePlaceProducts,
  useProductLookup,
  useSaveSpot,
  useStoreMapImage,
  useStoreMaps,
  useUnplaceProduct,
} from '../hooks/queries';
import { useAddShortcut } from '../hooks/useAddShortcut';
import { useModules } from '../hooks/useModules';
import { useI18n } from '../i18n/I18nProvider';
import { normalizeSearch, rowMatches } from '../lib/searchText';
import type { MapSpot, StoreMap } from '../lib/types';
import { ModuleOff } from './ProductsPage';

const VIEW_KEY = 'solvia.mapView';

function storedView(): MapView {
  try {
    return localStorage.getItem(VIEW_KEY) === '2d' ? '2d' : '3d';
  } catch {
    return '3d';
  }
}

/** Inventario > Ubicaciones: floor plans of the business and where each product is kept. */
export function LocationsPage() {
  const modules = useModules();
  if (!modules.loading && !modules.inventory) return <ModuleOff />;
  return <Locations />;
}

function Locations() {
  const { t } = useI18n();
  const { toast, confirm } = useFeedback();
  const { isAdmin } = useAuth();
  const maps = useStoreMaps();
  const [params, setParams] = useSearchParams();
  const [view, setViewState] = useState<MapView>(storedView);
  const [placing, setPlacing] = useState(false);
  const [search, setSearch] = useState('');
  const [focus, setFocus] = useState<{ id: string; at: number } | null>(null);
  const [mapForm, setMapForm] = useState<StoreMap | null | undefined>(undefined);
  const [spotForm, setSpotForm] = useState<{
    mapId: string;
    spot: MapSpot | null;
    at: { x: number; y: number } | null;
  } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { upload } = useUploadPlanImage();
  const image = useStoreMapImage();
  const removeMap = useDeleteStoreMap();
  const moveSpot = useSaveSpot();
  useAddShortcut(() => setMapForm(null), mapForm === undefined && spotForm === null);

  const list = maps.data ?? [];
  const current = list.find((map) => map.id === params.get('map')) ?? list[0] ?? null;
  const selected = current?.spots.find((spot) => spot.id === params.get('spot')) ?? null;

  const setView = (next: MapView) => {
    setViewState(next);
    if (next === '3d') setPlacing(false);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Only a convenience: the view is not remembered.
    }
  };

  const select = (mapId: string | null, spotId: string | null) =>
    setParams(
      (currentParams) => {
        const next = new URLSearchParams(currentParams);
        if (mapId) next.set('map', mapId);
        else next.delete('map');
        if (spotId) next.set('spot', spotId);
        else next.delete('spot');
        return next;
      },
      { replace: true },
    );

  const focusSpot = (spot: MapSpot) => {
    select(current?.id ?? null, spot.id);
    setFocus({ id: spot.id, at: Date.now() });
  };

  // What the search finds: spots by their name or by a product kept there.
  const matches = useMemo(() => {
    if (!current || normalizeSearch(search) === '') return null;
    return new Set(
      current.spots
        .filter(
          (spot) =>
            rowMatches(spot.name, search) ||
            spot.products.some((product) => rowMatches([product.name, product.code], search)),
        )
        .map((spot) => spot.id),
    );
  }, [current, search]);

  const startPlacing = () => {
    setView('2d');
    setPlacing(true);
  };

  const deleteMap = async (map: StoreMap) => {
    const confirmed = await confirm({
      title: t('locations.confirmDeleteMapTitle'),
      message: t('locations.confirmDeleteMapMessage', {
        name: map.name,
        count: map.spots.length,
      }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;
    try {
      await removeMap.mutateAsync(map.id);
      toast.success(t('locations.mapDeleted'));
      select(null, null);
    } catch (error) {
      toast.apiError(error);
    }
  };

  const removeImage = async (map: StoreMap) => {
    try {
      await image.mutateAsync({ id: map.id, file: null, aspect: map.aspect });
      toast.success(t('locations.imageRemoved'));
    } catch (error) {
      toast.apiError(error);
    }
  };

  const move = async (spot: MapSpot, x: number, y: number) => {
    if (!current) return;
    try {
      await moveSpot.mutateAsync({ mapId: current.id, spotId: spot.id, input: { x, y } });
      toast.success(t('locations.spot.moved'));
    } catch (error) {
      toast.apiError(error);
    }
  };

  const newMapButton = (
    <Button icon={<MapIcon className="h-4 w-4" />} onClick={() => setMapForm(null)}>
      {t('locations.newMap')}
      <Kbd>{ADD_KEY_LABEL}</Kbd>
    </Button>
  );

  return (
    <Page fill>
      <PageHeader
        title={t('locations.title')}
        description={t('locations.description')}
        actions={list.length > 0 ? newMapButton : null}
      />

      {maps.isError ? (
        <Alert tone="danger">{t('locations.loadError')}</Alert>
      ) : maps.isLoading ? (
        <Skeleton className="min-h-80 flex-1 rounded-2xl" />
      ) : !current ? (
        <div className="rounded-2xl border border-line bg-surface">
          <EmptyState
            icon={<MapIcon className="h-5 w-5" />}
            title={t('locations.empty.title')}
            description={t('locations.empty.description')}
            action={newMapButton}
          />
        </div>
      ) : (
        <>
          {list.length > 1 && (
            <Tabs
              label={t('locations.maps')}
              value={current.id}
              onChange={(id) => {
                select(id, null);
                setPlacing(false);
                setSearch('');
              }}
              items={list.map((map) => ({ value: map.id, label: map.name }))}
            />
          )}
          <div className="flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-4">
            <section className="relative flex h-[44dvh] shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card lg:h-auto lg:min-h-0">
              <header className="flex items-center gap-2 border-b border-line px-3 py-2">
                <h2 className="min-w-0 flex-1 truncate font-semibold">{current.name}</h2>
                {placing ? (
                  <TextButton tone="danger" onClick={() => setPlacing(false)}>
                    <X className="h-4 w-4" />
                    {t('locations.cancelMark')}
                  </TextButton>
                ) : (
                  <Button
                    size="sm"
                    variant="soft"
                    icon={<MapPinPlus className="h-4 w-4" />}
                    onClick={startPlacing}
                  >
                    {t('locations.mark')}
                  </Button>
                )}
                <Popover
                  trigger={({ toggle, ref }) => (
                    <IconButton
                      ref={ref}
                      size="sm"
                      label={t('common.moreActions')}
                      onClick={toggle}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </IconButton>
                  )}
                >
                  {(close) => (
                    <MenuItems
                      close={close}
                      items={[
                        {
                          label: t(
                            current.imageUrl ? 'locations.changeImage' : 'locations.uploadImage',
                          ),
                          icon: <ImagePlus className="h-4 w-4" />,
                          onSelect: () => fileInput.current?.click(),
                        },
                        {
                          label: t('locations.renameMap'),
                          icon: <Pencil className="h-4 w-4" />,
                          onSelect: () => setMapForm(current),
                        },
                        {
                          label: t('locations.removeImage'),
                          icon: <X className="h-4 w-4" />,
                          onSelect: () => void removeImage(current),
                          hidden: !current.imageUrl,
                          danger: true,
                        },
                        {
                          label: t('locations.deleteMap'),
                          icon: <Trash2 className="h-4 w-4" />,
                          onSelect: () => void deleteMap(current),
                          hidden: !isAdmin,
                          danger: true,
                        },
                      ]}
                    />
                  )}
                </Popover>
                <input
                  ref={fileInput}
                  type="file"
                  accept={PLAN_IMAGE_TYPES}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void upload(current.id, file);
                  }}
                />
              </header>
              <MapStage
                className="min-h-0 flex-1 rounded-none"
                map={current}
                view={view}
                onViewChange={setView}
                selectedId={selected?.id ?? null}
                // The search marks the spots only while its results are listed.
                highlight={selected ? null : matches}
                placing={placing}
                editable
                focus={focus}
                onSelect={(spot) => select(current.id, spot?.id ?? null)}
                onPlace={(x, y) => {
                  setPlacing(false);
                  setSpotForm({ mapId: current.id, spot: null, at: { x, y } });
                }}
                onMove={(spot, x, y) => void move(spot, x, y)}
              />
              {!current.imageUrl && !placing && (
                <div className="pointer-events-none absolute inset-x-0 top-14 flex justify-center px-3">
                  <div className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl border border-line bg-surface/95 p-3 shadow-pop">
                    <ImagePlus className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{t('locations.noImage.title')}</p>
                      <p className="text-xs text-muted">{t('locations.noImage.description')}</p>
                    </div>
                    <Button size="sm" onClick={() => fileInput.current?.click()}>
                      {t('locations.uploadImage')}
                    </Button>
                  </div>
                </div>
              )}
              {placing && (
                <p className="pointer-events-none absolute inset-x-0 top-14 mx-auto w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold text-on-primary shadow-pop">
                  {t('locations.hint.mark')}
                </p>
              )}
            </section>

            <aside className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
              {selected ? (
                <SpotDetail
                  key={selected.id}
                  map={current}
                  spot={selected}
                  onBack={() => select(current.id, null)}
                  onEdit={() => setSpotForm({ mapId: current.id, spot: selected, at: null })}
                />
              ) : (
                <SpotList
                  map={current}
                  search={search}
                  onSearch={setSearch}
                  matches={matches}
                  onPick={focusSpot}
                  onMark={startPlacing}
                />
              )}
            </aside>
          </div>
        </>
      )}

      <MapFormModal
        map={mapForm}
        onClose={() => setMapForm(undefined)}
        onSaved={(map) => select(map.id, null)}
      />
      <SpotFormModal
        target={spotForm}
        onClose={() => setSpotForm(null)}
        onSaved={(map, spot) => spot && select(map.id, spot.id)}
      />
    </Page>
  );
}

function SpotDot({ spot, className }: { spot: MapSpot; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        'h-3 w-3 shrink-0 rounded-full',
        (SPOT_TONES[spot.color] ?? SPOT_TONES.primary).pin,
        className,
      )}
    />
  );
}

/** The spots of the plan, or what the search found (and in which spot each product is). */
function SpotList({
  map,
  search,
  onSearch,
  matches,
  onPick,
  onMark,
}: {
  map: StoreMap;
  search: string;
  onSearch: (text: string) => void;
  matches: ReadonlySet<string> | null;
  onPick: (spot: MapSpot) => void;
  onMark: () => void;
}) {
  const { t } = useI18n();
  const spots = matches ? map.spots.filter((spot) => matches.has(spot.id)) : map.spots;
  return (
    <>
      <div className="border-b border-line p-3">
        <SearchInput
          value={search}
          onChange={onSearch}
          placeholder={t('locations.search')}
          className="sm:w-full"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {map.spots.length === 0 ? (
          <div className="space-y-3 p-4 text-center">
            <p className="text-sm text-muted">{t('locations.noSpots')}</p>
            <Button size="sm" icon={<MapPinPlus className="h-4 w-4" />} onClick={onMark}>
              {t('locations.mark')}
            </Button>
          </div>
        ) : spots.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted">
            {t('locations.noMatches', { text: search.trim() })}
          </p>
        ) : (
          <>
            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold tracking-[0.1em] text-subtle uppercase">
              {matches ? t('locations.found') : t('locations.spots')}
            </p>
            <ul className="divide-y divide-line">
              {spots.map((spot) => {
                const found = matches
                  ? spot.products.filter((product) =>
                      rowMatches([product.name, product.code], search),
                    )
                  : [];
                return (
                  <li key={spot.id}>
                    <button
                      type="button"
                      onClick={() => onPick(spot)}
                      className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-surface-2"
                    >
                      <SpotDot spot={spot} className="mt-1.5" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{spot.name}</span>
                        {found.length > 0 ? (
                          <span className="block truncate text-xs text-primary-ink">
                            {found.map((product) => product.name).join(' · ')}
                          </span>
                        ) : (
                          <span className="block text-xs text-muted">
                            {t('locations.productsCount', { count: spot.products.length })}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

/** One spot: its products (add, take out) and its name and color. */
function SpotDetail({
  map,
  spot,
  onBack,
  onEdit,
}: {
  map: StoreMap;
  spot: MapSpot;
  onBack: () => void;
  onEdit: () => void;
}) {
  const { t, fmt } = useI18n();
  const { toast, confirm } = useFeedback();
  const place = usePlaceProducts();
  const unplace = useUnplaceProduct();
  const remove = useDeleteSpot();

  const add = async (product: { id: string; name: string }) => {
    try {
      await place.mutateAsync({ spotId: spot.id, productIds: [product.id] });
      toast.success(t('locations.spot.placed', { product: product.name, spot: spot.name }));
    } catch (error) {
      toast.apiError(error);
    }
  };

  const takeOut = async (product: { id: string; name: string }) => {
    try {
      await unplace.mutateAsync({ spotId: spot.id, productId: product.id });
      toast.success(t('locations.spot.removed', { product: product.name, spot: spot.name }));
    } catch (error) {
      toast.apiError(error);
    }
  };

  const deleteSpot = async () => {
    const confirmed = await confirm({
      title: t('locations.spot.confirmDeleteTitle'),
      message: t('locations.spot.confirmDeleteMessage', {
        name: spot.name,
        count: spot.products.length,
      }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(spot);
      toast.success(t('locations.spot.deleted'));
      onBack();
    } catch (error) {
      toast.apiError(error);
    }
  };

  return (
    <>
      <div className="space-y-3 border-b border-line p-3">
        <TextButton onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          {t('locations.allSpots')}
        </TextButton>
        <div className="flex items-center gap-2">
          <SpotDot spot={spot} className="h-4 w-4" />
          <h3 className="min-w-0 flex-1 truncate text-lg font-semibold">{spot.name}</h3>
        </div>
        <p className="-mt-2 text-xs text-muted">
          {map.name} · {t('locations.productsCount', { count: spot.products.length })}
        </p>
        <div className="flex flex-wrap gap-2">
          <TextButton onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            {t('common.edit')}
          </TextButton>
          <TextButton tone="danger" onClick={() => void deleteSpot()}>
            <Trash2 className="h-4 w-4" />
            {t('common.delete')}
          </TextButton>
        </div>
        <SearchPicker
          placeholder={t('locations.spot.addPlaceholder')}
          useLookup={useProductLookup}
          onPick={(product) => void add(product)}
          emptyText={(text) =>
            text ? t('locations.spot.noResults', { text }) : t('locations.spot.addHint')
          }
          renderOption={(product) => (
            <span className="flex min-w-0 items-center gap-2">
              <ProductThumb name={product.name} imageUrl={product.imageUrl} size={28} />
              <span className="min-w-0">
                <span className="block truncate">{product.name}</span>
                {product.code && (
                  <span className="block font-mono text-xs text-muted">{product.code}</span>
                )}
              </span>
            </span>
          )}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {spot.products.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted">{t('locations.spot.noProducts')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {spot.products.map((product) => (
              <li key={product.id} className="flex items-center gap-3 px-3 py-2">
                <ProductThumb name={product.name} imageUrl={product.imageUrl} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{product.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {product.code && <span className="font-mono">{product.code}</span>}
                    {product.trackStock && (
                      <>
                        {product.code && ' · '}
                        {t('locations.spot.stock', {
                          count: fmt.number(product.stock),
                          unit: t(`products.unitsShort.${product.unit}`),
                        })}
                      </>
                    )}
                  </span>
                </span>
                <IconButton
                  size="sm"
                  label={t('locations.spot.removeProduct')}
                  onClick={() => void takeOut(product)}
                  className="text-danger-ink hover:bg-danger-soft"
                >
                  <X className="h-4 w-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
