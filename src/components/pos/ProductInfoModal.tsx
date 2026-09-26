import { Plus, ZoomIn } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Badge, Button, Modal, Skeleton, cx } from '@/ui';
import { useProduct } from '../../hooks/queries';
import { useModules } from '../../hooks/useModules';
import { useI18n } from '../../i18n/I18nProvider';
import type { ProductOption } from '../../lib/types';
import { ImageViewer } from '../domain/ImageViewer';
import { ProductThumb } from '../domain/ProductThumb';
import { QrImage } from '../domain/QrImage';

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

function ProductInfo({
  product,
  mode,
  onAdd,
}: {
  product: ProductOption;
  mode: 'sale' | 'purchase';
  onAdd: () => void;
}) {
  const { t, fmt } = useI18n();
  const modules = useModules();
  const full = useProduct(product.id);
  const [viewing, setViewing] = useState<{ url: string; title: string } | null>(null);
  const unit = t(`products.unitsShort.${product.unit}`);
  const service = product.kind === 'service';
  const margin =
    product.cost !== null && product.price > 0
      ? (product.price - product.cost) / product.price
      : null;
  const counted = modules.inventory && product.trackStock;
  const left = product.stock;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Picture: big on a tap. */}
        <button
          type="button"
          disabled={!product.imageUrl}
          onClick={() =>
            product.imageUrl && setViewing({ url: product.imageUrl, title: product.name })
          }
          className="group relative flex items-center justify-center rounded-2xl border border-line p-3 disabled:cursor-default"
          aria-label={t('products.form.zoomImage')}
        >
          <ProductThumb name={product.name} imageUrl={product.imageUrl} size={144} />
          {product.imageUrl && (
            <span className="absolute right-2 bottom-2 flex h-7 w-7 items-center justify-center rounded-lg bg-surface/90 text-muted shadow-sm group-hover:text-ink">
              <ZoomIn className="h-4 w-4" />
            </span>
          )}
        </button>
        {/* Code and QR. */}
        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-surface-2 p-3 text-center">
          {product.code && <QrImage code={product.code} size={112} />}
          <p className="text-[11px] font-medium text-muted">{t('products.form.qrCode')}</p>
          <p className="-mt-0.5 font-mono text-lg font-semibold tracking-wider">
            {product.code ?? '—'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={service ? 'info' : 'neutral'}>
          {t(service ? 'products.kinds.service' : 'products.kinds.product')}
        </Badge>
        {full.isLoading ? (
          <Skeleton className="h-5 w-24" />
        ) : (
          <Badge tone="neutral">{full.data?.category?.name ?? t('categories.none')}</Badge>
        )}
        {counted && left <= 0 && <Badge tone="danger">{t('sales.pos.out')}</Badge>}
        {counted && left > 0 && left <= (product.minStock ?? 0) && (
          <Badge tone="warning">{t('products.filters.low')}</Badge>
        )}
      </div>

      <dl className="divide-y divide-line rounded-2xl border border-line text-sm">
        <Row label={t('products.form.price')} strong>
          {fmt.money(product.price)}
          {!service && <span className="ml-1 text-xs font-normal text-muted">/ {unit}</span>}
        </Row>
        <Row label={t('products.columns.cost')}>
          {product.cost === null ? '—' : fmt.money(product.cost)}
        </Row>
        <Row label={t('products.columns.margin')}>
          {margin === null ? (
            '—'
          ) : (
            <span className={margin < 0 ? 'text-danger-ink' : 'text-success-ink'}>
              {fmt.money(product.price - (product.cost ?? 0))} · {fmt.percent(margin)}
            </span>
          )}
        </Row>
        {!service && (
          <Row label={t('products.columns.unit')}>{t(`products.units.${product.unit}`)}</Row>
        )}
        {counted && (
          <Row label={t('products.columns.stock')}>
            <span className={cx(left <= 0 && 'text-danger-ink')}>
              {fmt.number(left)} {unit}
            </span>
            {product.minStock !== null && (
              <span className="ml-2 text-xs font-normal text-muted">
                {t('pos.info.alertAt', { count: fmt.number(product.minStock) })}
              </span>
            )}
          </Row>
        )}
        {product.packSize !== null && (
          <Row label={t('pos.info.pack')}>
            {fmt.number(product.packSize)} {unit}
          </Row>
        )}
        {product.sold !== null && product.sold !== undefined && (
          <Row label={t('pos.info.sold')}>{t('pos.info.soldCount', { count: product.sold })}</Row>
        )}
      </dl>

      <Button className="h-12 w-full" icon={<Plus className="h-5 w-5" />} onClick={onAdd}>
        {t(mode === 'sale' ? 'pos.info.addSale' : 'pos.info.addPurchase')}
      </Button>
      <ImageViewer image={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function Row({
  label,
  strong = false,
  children,
}: {
  label: string;
  strong?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-2">
      <dt className="text-muted">{label}</dt>
      <dd
        className={cx(
          'text-right tabular-nums',
          strong ? 'text-base font-semibold' : 'font-medium',
        )}
      >
        {children}
      </dd>
    </div>
  );
}
