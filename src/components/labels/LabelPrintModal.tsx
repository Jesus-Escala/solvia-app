import { CheckSquare, Printer, Search, Square, Tag, X } from 'lucide-react';
import { useState } from 'react';
import {
  Button,
  cx,
  IconButton,
  Modal,
  SegmentedControl,
  Skeleton,
  TextButton,
  useFeedback,
} from '@/ui';
import { ProductThumb } from '../domain/ProductThumb';
import { useDebouncedValue } from '../domain/useSearchBox';
import { useMe, useProducts } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import { api } from '../../lib/api';
import { printHtml } from '../../lib/print';
import type { Paginated, Product } from '../../lib/types';
import { buildLabelsHtml, MAX_LABELS, type LabelPaper, type LabelSize } from './labels';

interface Picked {
  product: Product;
  copies: number;
}

/**
 * QR labels for one product or many at once (to stick on the items, or for gondolas and
 * shelves): choose the products (search, or all the ones found), how many labels of each, the
 * size (small for the product, big with the price for the shelf) and the paper (an A4 sheet full
 * of labels, or a label printer). `products` preselects some (e.g. the one whose QR was open).
 */
export function LabelPrintModal({
  open,
  products,
  onClose,
}: {
  open: boolean;
  products: Product[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      size="xl"
      title={t('labels.title')}
      description={t('labels.description')}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {open && <LabelPrinter initial={products} onClose={onClose} />}
    </Modal>
  );
}

function LabelPrinter({ initial, onClose }: { initial: Product[]; onClose: () => void }) {
  const { t, fmt } = useI18n();
  const { toast } = useFeedback();
  const { data: me } = useMe();
  const [size, setSize] = useState<LabelSize>('shelf');
  const [paper, setPaper] = useState<LabelPaper>('sheet');
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim());
  const list = useProducts({ search: debounced || null, status: 'active', page: 1, pageSize: 40 });
  const [picked, setPicked] = useState<Map<string, Picked>>(
    () => new Map(initial.map((product) => [product.id, { product, copies: 1 }])),
  );
  const [loadingAll, setLoadingAll] = useState(false);
  const [printing, setPrinting] = useState(false);

  const rows = list.data?.data ?? [];
  const total = [...picked.values()].reduce((sum, item) => sum + item.copies, 0);

  const toggle = (product: Product) =>
    setPicked((current) => {
      const next = new Map(current);
      if (next.has(product.id)) next.delete(product.id);
      else next.set(product.id, { product, copies: 1 });
      return next;
    });
  const setCopies = (id: string, copies: number) =>
    setPicked((current) => {
      const next = new Map(current);
      const item = next.get(id);
      if (item) next.set(id, { ...item, copies: Math.max(1, Math.min(99, copies)) });
      return next;
    });

  /** Every active product that matches the search (all pages), one label each. */
  const pickAll = async () => {
    setLoadingAll(true);
    try {
      const next = new Map(picked);
      for (let page = 1; ; page += 1) {
        const answer = await api.get<Paginated<Product>>('/products', {
          search: debounced || null,
          status: 'active',
          page,
          pageSize: 100,
        });
        answer.data.forEach((product) => {
          if (!next.has(product.id)) next.set(product.id, { product, copies: 1 });
        });
        if (page >= answer.meta.totalPages) break;
      }
      setPicked(next);
    } catch (error) {
      toast.apiError(error);
    } finally {
      setLoadingAll(false);
    }
  };

  const print = async () => {
    const items = [...picked.values()].filter((item) => item.product.code);
    if (items.length === 0) return;
    if (total > MAX_LABELS) toast.warning(t('labels.tooMany', { count: MAX_LABELS }));
    setPrinting(true);
    try {
      const html = await buildLabelsHtml({
        size,
        paper,
        business: me?.tenant.name ?? null,
        title: t('labels.title'),
        items: items.map(({ product, copies }) => ({
          name: product.name,
          price: fmt.money(product.price),
          code: product.code!,
          unit:
            product.kind === 'service' || product.unit === 'unit'
              ? null
              : t('labels.per', { unit: t(`products.unitsShort.${product.unit}`) }),
          copies,
        })),
      });
      printHtml(html);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* Products */}
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              className="input pl-9"
              placeholder={t('labels.search')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            icon={<CheckSquare className="h-4 w-4" />}
            loading={loadingAll}
            onClick={() => void pickAll()}
          >
            {debounced ? t('labels.pickFound') : t('labels.pickAll')}
          </Button>
        </div>
        <ul className="max-h-[52vh] divide-y divide-line overflow-y-auto rounded-xl border border-line">
          {list.isLoading &&
            Array.from({ length: 6 }, (_, index) => (
              <li key={index} className="p-3">
                <Skeleton className="h-10 w-full" />
              </li>
            ))}
          {rows.map((product) => {
            const item = picked.get(product.id);
            return (
              <li
                key={product.id}
                className={cx('flex items-center gap-3 px-3 py-2', item && 'bg-primary-soft/40')}
              >
                <button
                  type="button"
                  onClick={() => toggle(product)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  aria-pressed={item !== undefined}
                >
                  {item ? (
                    <CheckSquare className="h-5 w-5 shrink-0 text-primary" />
                  ) : (
                    <Square className="h-5 w-5 shrink-0 text-subtle" />
                  )}
                  <ProductThumb name={product.name} imageUrl={product.imageUrl} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{product.name}</span>
                    <span className="block text-xs text-muted tabular-nums">
                      {fmt.money(product.price)} · {product.code}
                    </span>
                  </span>
                </button>
                {item && (
                  <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                    {t('labels.copies')}
                    <input
                      type="number"
                      min={1}
                      max={99}
                      className="input h-8 w-16 text-center tabular-nums"
                      value={item.copies}
                      onChange={(event) => setCopies(product.id, Number(event.target.value) || 1)}
                    />
                  </label>
                )}
              </li>
            );
          })}
          {!list.isLoading && rows.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted">{t('labels.noProducts')}</li>
          )}
        </ul>
        {(list.data?.meta.total ?? 0) > rows.length && (
          <p className="text-xs text-subtle">
            {t('labels.more', { count: (list.data?.meta.total ?? 0) - rows.length })}
          </p>
        )}
      </div>

      {/* Settings and the chosen ones */}
      <div className="space-y-4">
        <div>
          <p className="label">{t('labels.size')}</p>
          <div className="grid grid-cols-2 gap-2">
            {(['shelf', 'product'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={size === option}
                onClick={() => setSize(option)}
                className={cx(
                  'flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition',
                  size === option
                    ? 'border-primary bg-primary-soft ring-2 ring-primary/25'
                    : 'border-line hover:bg-surface-2',
                )}
              >
                {/* A tiny drawing of the label, to scale. */}
                <span
                  className="flex items-center gap-1 rounded-md border border-line-strong bg-surface p-1"
                  style={option === 'shelf' ? { width: 80, height: 50 } : { width: 50, height: 30 }}
                >
                  <span
                    className="shrink-0 rounded-sm bg-ink/80"
                    style={
                      option === 'shelf' ? { width: 32, height: 32 } : { width: 20, height: 20 }
                    }
                  />
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="h-1 rounded bg-ink/40" />
                    <span
                      className={cx('rounded bg-ink/80', option === 'shelf' ? 'h-2.5' : 'h-1.5')}
                    />
                  </span>
                </span>
                <span className="text-sm font-semibold">{t(`labels.sizes.${option}`)}</span>
                <span className="text-xs text-muted">{t(`labels.sizes.${option}Hint`)}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="label">{t('labels.paper')}</p>
          <SegmentedControl
            label={t('labels.paper')}
            value={paper}
            onChange={setPaper}
            options={[
              { value: 'sheet', label: t('labels.papers.sheet') },
              { value: 'roll', label: t('labels.papers.roll') },
            ]}
          />
          <p className="mt-1.5 text-xs text-muted">{t(`labels.papers.${paper}Hint`)}</p>
        </div>

        <div className="rounded-xl border border-line">
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Tag className="h-4 w-4 text-primary" />
              {t('labels.chosen', { count: picked.size })}
            </span>
            {picked.size > 0 && (
              <TextButton size="sm" onClick={() => setPicked(new Map())}>
                {t('labels.clear')}
              </TextButton>
            )}
          </div>
          <ul className="max-h-40 overflow-y-auto">
            {[...picked.values()].map(({ product, copies }) => (
              <li key={product.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{product.name}</span>
                <span className="text-xs text-muted tabular-nums">×{copies}</span>
                <IconButton size="sm" label={t('common.delete')} onClick={() => toggle(product)}>
                  <X className="h-3.5 w-3.5" />
                </IconButton>
              </li>
            ))}
            {picked.size === 0 && (
              <li className="px-3 py-4 text-center text-xs text-muted">{t('labels.none')}</li>
            )}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            icon={<Printer className="h-4 w-4" />}
            loading={printing}
            disabled={picked.size === 0}
            onClick={() => void print()}
            className="h-12 text-base"
          >
            {t('labels.print', { count: fmt.number(total) })}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </div>
  );
}
