import { Map as MapIcon, MapPin, Plus, ZoomIn } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Badge, Button, Modal, Skeleton, TextButton, cx } from '@/ui';
import { useProduct } from '../../hooks/queries';
import { useModules } from '../../hooks/useModules';
import { useI18n } from '../../i18n/I18nProvider';
import type { ProductOption } from '../../lib/types';
import { ImageViewer } from '../domain/ImageViewer';
import { ProductThumb } from '../domain/ProductThumb';
import { QrImage } from '../domain/QrImage';
import { SpotMapModal } from '../maps/SpotMapModal';

/**
 * The detail of a product from the point of sale: its picture (big on a tap), code and QR, price,
 * cost and margin, stock, how it is sold and bought and how much it sold lately, with a button to
 * add it to the ticket. `product` null: closed.
 */
export function ProductInfoModal({
  product,
  mode,
  onAdd,
  onClose,
}: {
  product: ProductOption | null;
  mode: 'sale' | 'purchase';
  onAdd: (product: ProductOption) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={product !== null}
      title={product?.name ?? ''}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {product && (
        <ProductInfo
          product={product}
          mode={mode}
          onAdd={() => {
            onAdd(product);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}

/**
 * The same detail outside the point of sale (e.g. the products of a spot in Ubicaciones), only
 * to look: loaded by id, without the button to add it. `productId` null: closed.
 */
export function ProductDetailModal({
  productId,
  onClose,
}: {
  productId: string | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const product = useProduct(productId);
  return (
    <Modal
      open={productId !== null}
      title={product.data?.name ?? ''}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {productId !== null &&
        (product.data ? (
          <ProductInfo product={product.data} mode={null} onAdd={null} />
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-52 rounded-2xl" />
          </div>
        ))}
    </Modal>
  );
}

function ProductInfo({
  product,
  mode,
  onAdd,
}: {
  product: ProductOption;
  /** null: only to look (no button to add it). */
  mode: 'sale' | 'purchase' | null;
  onAdd: (() => void) | null;
}) {
  const { t, fmt } = useI18n();
  const modules = useModules();
  const full = useProduct(product.id);
  const [viewing, setViewing] = useState<{ url: string; title: string } | null>(null);
  const [showSpot, setShowSpot] = useState(false);
  const spot = modules.inventory ? (full.data?.spot ?? null) : null;
  const unit = t(`products.unitsShort.${product.unit}`);
  const service = product.kind === 'service';
  const margin =
    product.cost !== null && product.price > 0
      ? (product.price - product.cost) / product.price
      : null;
  const counted = modules.inventory && product.trackStock;
  const left = product.stock;

  const low = counted && left > 0 && left <= (product.minStock ?? 0);

  return (
    <div className="space-y-3">
      {/* The product at a glance: picture, name, what it is and its price. */}
      <div className="flex gap-4 rounded-2xl bg-surface-2 p-3 sm:p-4">
        <button
          type="button"
          disabled={!product.imageUrl}
          onClick={() =>
            product.imageUrl && setViewing({ url: product.imageUrl, title: product.name })
          }
          className="group relative shrink-0 self-start overflow-hidden rounded-xl bg-surface shadow-card disabled:cursor-default"
          aria-label={t('products.form.zoomImage')}
        >
          <ProductThumb name={product.name} imageUrl={product.imageUrl} size={112} />
          {product.imageUrl && (
            <span className="absolute right-1.5 bottom-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-surface/90 text-muted shadow-sm group-hover:text-ink">
              <ZoomIn className="h-4 w-4" />
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={service ? 'info' : 'neutral'}>
              {t(service ? 'products.kinds.service' : 'products.kinds.product')}
            </Badge>
            {full.isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <Badge tone="neutral">{full.data?.category?.name ?? t('categories.none')}</Badge>
            )}
            {counted && left <= 0 && <Badge tone="danger">{t('sales.pos.out')}</Badge>}
            {low && <Badge tone="warning">{t('products.filters.low')}</Badge>}
          </div>
          <p className="mt-2 line-clamp-2 text-lg leading-snug font-semibold">{product.name}</p>
          <p className="mt-1 text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">
            {t('products.form.price')}
          </p>
          <p className="font-display text-2xl leading-tight font-semibold text-primary-ink tabular-nums sm:text-3xl">
            {fmt.money(product.price)}
            {!service && (
              <span className="ml-1 font-sans text-sm font-normal text-muted">/ {unit}</span>
            )}
          </p>
        </div>
      </div>

      {/* One card per row: the location needs the width for its button. */}
      <div className="grid gap-3">
        {/* Its code and QR, to scan or read out. */}
        <div className="flex items-center gap-3 rounded-2xl border border-line p-3">
          {product.code && (
            <span className="shrink-0 rounded-lg bg-white p-1 ring-1 ring-line">
              <QrImage code={product.code} size={64} />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">
              {t('products.form.qrCode')}
            </p>
            <p className="truncate font-mono text-lg font-semibold tracking-wider">
              {product.code ?? '—'}
            </p>
          </div>
        </div>
        {/* Where it is kept. */}
        {modules.inventory && (
          <div
            className={cx(
              'flex items-center gap-3 rounded-2xl border p-3',
              spot ? 'border-primary/30 bg-primary-soft/40' : 'border-line',
            )}
          >
            <span
              className={cx(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                spot ? 'bg-primary text-on-primary' : 'bg-surface-2 text-muted',
              )}
            >
              <MapPin className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">
                {t('locations.product.label')}
              </p>
              {full.isLoading ? (
                <Skeleton className="mt-1 h-5 w-24" />
              ) : spot ? (
                <p className="truncate font-semibold">
                  {spot.name} <span className="font-normal text-muted">· {spot.mapName}</span>
                </p>
              ) : (
                <p className="text-sm text-muted">{t('locations.product.none')}</p>
              )}
            </div>
            {spot && (
              <TextButton onClick={() => setShowSpot(true)} className="shrink-0 whitespace-nowrap">
                <MapIcon className="h-4 w-4" />
                {t('locations.product.see')}
              </TextButton>
            )}
          </div>
        )}
      </div>

      {/* The numbers, each in its own tile. */}
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Tile label={t('products.columns.cost')}>
          {product.cost === null ? '—' : fmt.money(product.cost)}
        </Tile>
        <Tile
          label={t('products.columns.margin')}
          tone={margin === null ? 'default' : margin < 0 ? 'danger' : 'success'}
          sub={margin === null ? null : fmt.percent(margin)}
        >
          {margin === null ? '—' : fmt.money(product.price - (product.cost ?? 0))}
        </Tile>
        {counted && (
          <Tile
            label={t('products.columns.stock')}
            tone={left <= 0 ? 'danger' : low ? 'warning' : 'default'}
            sub={
              product.minStock === null
                ? null
                : t('pos.info.alertAt', { count: fmt.number(product.minStock) })
            }
          >
            {fmt.number(left)} <span className="text-sm font-normal">{unit}</span>
          </Tile>
        )}
        {!service && (
          <Tile label={t('products.columns.unit')}>{t(`products.units.${product.unit}`)}</Tile>
        )}
        {product.packSize !== null && (
          <Tile label={t('pos.info.pack')}>
            {fmt.number(product.packSize)} <span className="text-sm font-normal">{unit}</span>
          </Tile>
        )}
        {product.sold !== null && product.sold !== undefined && (
          <Tile label={t('pos.info.sold')}>{t('pos.info.soldCount', { count: product.sold })}</Tile>
        )}
      </dl>

      {mode !== null && onAdd && (
        <Button className="h-12 w-full" icon={<Plus className="h-5 w-5" />} onClick={onAdd}>
          {t(mode === 'sale' ? 'pos.info.addSale' : 'pos.info.addPurchase')}
        </Button>
      )}
      <ImageViewer image={viewing} onClose={() => setViewing(null)} />
      <SpotMapModal
        target={
          showSpot && spot
            ? { mapId: spot.mapId, spotId: spot.id, title: `${product.name} · ${spot.name}` }
            : null
        }
        onClose={() => setShowSpot(false)}
      />
    </div>
  );
}

const TILE_TONES = {
  default: 'text-ink',
  success: 'text-success-ink',
  warning: 'text-warning-ink',
  danger: 'text-danger-ink',
} as const;

/** One figure of the product: a small label over a big value (and a note under it). */
function Tile({
  label,
  tone = 'default',
  sub = null,
  children,
}: {
  label: string;
  tone?: keyof typeof TILE_TONES;
  sub?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-line px-3 py-2.5">
      <dt className="truncate text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">
        {label}
      </dt>
      <dd className={cx('mt-0.5 truncate text-base font-semibold tabular-nums', TILE_TONES[tone])}>
        {children}
      </dd>
      {sub && <p className="truncate text-xs text-muted">{sub}</p>}
    </div>
  );
}
