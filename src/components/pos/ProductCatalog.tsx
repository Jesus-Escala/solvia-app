import { useQueryClient } from '@tanstack/react-query';
import {
  Flame,
  PackageOpen,
  PackagePlus,
  Plus,
  ScanQrCode,
  Search,
  Sparkles,
  Tag,
  X,
  Info,
} from 'lucide-react';
import { useRef, useState, type ReactNode, type RefObject } from 'react';
import { cx, Skeleton } from '@/ui';
import { productLookupQuery, useCategories, useProductCatalog } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { ProductOption } from '../../lib/types';
import { CameraScanner } from './CameraScanner';
import { ProductInfoModal } from './ProductInfoModal';
import { ADD_KEY_LABEL } from './keys';
import { Kbd } from './PosLayout';
import { ProductThumb } from '../domain/ProductThumb';
import { useDebouncedValue } from '../domain/useSearchBox';

/**
 * The catalog of a point of sale: a search box that also takes a barcode scanner (Enter adds
 * the exact code, or the first result), a row of categories ("Recomendados" first) and big tiles
 * to tap — the best sellers, the products of the chosen category, or what matches the search
 * (always in the whole catalog). Tiles show the price (or the cost in a purchase), what is left
 * and how many are already in the ticket.
 */
export function ProductCatalog({
  onPick,
  amountOf,
  amountLabel,
  showStock,
  inCart,
  searchRef,
  onCreate,
  purchase = false,
}: {
  onPick: (product: ProductOption) => void;
  /** The amount on the tile: the price for a sale, the cost for a purchase (null: none). */
  amountOf: (product: ProductOption) => number | null;
  /** Small text over the amount (e.g. "Costo"). */
  amountLabel?: string;
  showStock: boolean;
  /** Quantity of each product already in the ticket. */
  inCart: ReadonlyMap<string, number>;
  searchRef: RefObject<HTMLInputElement | null>;
  /** Create a product that is not in the catalog yet (with what was searched as its name). */
  onCreate: (name: string) => void;
  /** A purchase adds stock: the tiles show what there is plus what arrives. */
  purchase?: boolean;
}) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [notFound, setNotFound] = useState<string | null>(null);
  // The product whose detail is open (the "i" of its tile).
  const [info, setInfo] = useState<ProductOption | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const categories = (useCategories().data ?? []).filter((category) => category.products > 0);
  const typed = text.trim();
  const debounced = useDebouncedValue(typed);
  // A search looks in the whole catalog; the category applies while nothing is typed.
  const category =
    typed === '' ? (categories.find((item) => item.id === categoryId) ?? null) : null;
  const catalog = useProductCatalog(debounced, typed === '' ? (category?.id ?? null) : null);
  const found = catalog.data?.data ?? [];
  // Without a search only the recommended ones: what has sold (the rest is one search away). A
  // business that has not sold yet sees its first products instead of an empty screen.
  const sold = found.filter((product) => (product.sold ?? 0) > 0);
  const recommended = typed === '' && category === null && sold.length > 0;
  const products = recommended ? sold : found;
  const fresh = !catalog.isPlaceholderData && debounced === typed && catalog.data !== undefined;
  const queryClient = useQueryClient();
  // Enters resolve in order, even when a scanner sends the next code before the first answer.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [scanning, setScanning] = useState(false);

  const choose = (options: ProductOption[], code: string) =>
    options.find((product) => product.code !== null && product.code === code) ?? options[0] ?? null;

  /** Enter: the exact code (a scanned barcode) or the first result; the box empties at once. */
  const enter = () => {
    if (typed === '') return;
    setText('');
    if (fresh) {
      const chosen = choose(products, typed);
      if (chosen) onPick(chosen);
      else setNotFound(typed);
      return;
    }
    resolve(typed, false);
  };

  /**
   * Looks a code up and adds its product, in the order the codes arrive (a fast scanner or the
   * camera never loses one). `exact`: only a product with that very code (a scan).
   */
  const resolve = (code: string, exact: boolean): Promise<ProductOption | null> => {
    const result = queue.current.then(async () => {
      try {
        const answer = await queryClient.fetchQuery(productLookupQuery(code));
        const chosen = exact
          ? (answer.data.find((product) => product.code === code) ?? null)
          : choose(answer.data, code);
        if (chosen) {
          setNotFound(null);
          onPick(chosen);
        } else setNotFound(code);
        return chosen;
      } catch {
        setNotFound(code);
        return null;
      }
    });
    queue.current = result.then(() => undefined);
    return result;
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-2 px-3 pt-3 pb-1 sm:px-4 sm:pt-4">
        <div className="flex gap-2">
          <div data-tour="pos-search" className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-subtle" />
            <input
              ref={searchRef}
              className="input h-12 pr-10 pl-11 text-base"
              aria-label={t('sales.form.search')}
              autoComplete="off"
              autoFocus
              placeholder={t('sales.form.search')}
              value={text}
              onChange={(event) => {
                setNotFound(null);
                setText(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  enter();
                } else if (event.key === 'Escape' && text !== '') {
                  // Clear the search, not close the screen.
                  event.preventDefault();
                  event.stopPropagation();
                  setText('');
                }
              }}
            />
            {text !== '' && (
              <button
                type="button"
                aria-label={t('sales.pos.clearSearch')}
                onClick={() => {
                  setText('');
                  searchRef.current?.focus();
                }}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-subtle hover:bg-surface-3 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              onCreate(typed);
              setText('');
            }}
            title={t('pos.newButtonTitle')}
            data-tour="pos-new"
            className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-semibold text-on-primary shadow-sm transition hover:brightness-110 [&>svg]:h-5 [&>svg]:w-5"
          >
            <PackagePlus />
            <span className="hidden sm:inline">{t('pos.newButton')}</span>
            <Kbd>{ADD_KEY_LABEL}</Kbd>
          </button>
          <button
            type="button"
            onClick={() => setScanning(true)}
            data-tour="pos-scan"
            title={t('scanner.open')}
            aria-label={t('scanner.open')}
            className="flex h-12 shrink-0 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-sm font-semibold text-ink shadow-xs transition hover:border-primary/40 hover:bg-primary-soft/40 [&>svg]:h-5 [&>svg]:w-5"
          >
            <ScanQrCode />
            <span className="hidden sm:inline">{t('scanner.button')}</span>
          </button>
        </div>
        <CameraScanner
          open={scanning}
          onClose={() => {
            setScanning(false);
            searchRef.current?.focus();
          }}
          onCode={async (code) => (await resolve(code, true))?.name ?? null}
        />
        {typed === '' && categories.length > 0 && (
          <div
            role="radiogroup"
            aria-label={t('pos.categories')}
            data-tour="pos-categories"
            className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]! sm:-mx-4 sm:px-4"
          >
            <CategoryChip
              active={category === null}
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label={t('pos.recommendedChip')}
              onClick={() => setCategoryId(null)}
            />
            {categories.map((item) => (
              <CategoryChip
                key={item.id}
                active={category?.id === item.id}
                icon={<Tag className="h-3.5 w-3.5" />}
                label={item.name}
                onClick={() => setCategoryId(item.id)}
              />
            ))}
          </div>
        )}
        <p className="flex items-center justify-between gap-2 text-xs text-muted">
          <span className="font-semibold tracking-[0.08em] uppercase">
            {typed !== ''
              ? t('sales.pos.results', { text: typed })
              : category !== null
                ? t('pos.category', { name: category.name, count: category.products })
                : recommended
                  ? t('pos.recommended', { count: products.length })
                  : t('pos.yourProducts')}
          </span>
          {notFound !== null && (
            <span className="font-medium text-danger-ink">
              {t('sales.form.codeNotFound', { code: notFound })}
            </span>
          )}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-2.5 pb-4 sm:px-4">
        {catalog.isLoading ? (
          <ul
            data-tour="pos-catalog"
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
          >
            {Array.from({ length: 8 }, (_, index) => (
              <li key={index}>
                <Skeleton className="h-32 w-full rounded-2xl" />
              </li>
            ))}
          </ul>
        ) : (
          <ul
            className={cx(
              'grid grid-cols-2 gap-2.5 transition-opacity sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
              !fresh && 'opacity-70',
            )}
          >
            {products.map((product, index) => (
              <li key={product.id} className="relative">
                <ProductTile
                  // The three best sellers get a mark (only in the default list).
                  top={recommended && index < 3}
                  product={product}
                  amount={amountOf(product)}
                  amountLabel={amountLabel}
                  showStock={showStock}
                  purchase={purchase}
                  quantity={inCart.get(product.id) ?? 0}
                  onPick={() => {
                    onPick(product);
                    searchRef.current?.focus();
                  }}
                />
                <button
                  type="button"
                  title={t('pos.info.open')}
                  aria-label={t('pos.info.openNamed', { name: product.name })}
                  onClick={() => setInfo(product)}
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-surface text-muted shadow-xs transition hover:border-primary/40 hover:bg-primary-soft/50 hover:text-primary-ink"
                >
                  <Info className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {!catalog.isLoading && products.length === 0 && (
          <div className="mt-2 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
            <PackageOpen className="h-6 w-6 text-subtle" />
            {typed !== ''
              ? t('sales.form.noProducts')
              : category !== null
                ? t('pos.emptyCategory')
                : t('pos.noCatalog')}
            <button
              type="button"
              onClick={() => {
                onCreate(typed);
                setText('');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-semibold text-on-primary shadow-sm transition hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              {typed === '' ? t('pos.newTile') : t('pos.create', { text: typed })}
            </button>
          </div>
        )}
        {products.length > 0 && typed === '' && category === null && (
          <p className="mt-3 text-center text-sm text-muted">{t('pos.searchMore')}</p>
        )}
      </div>
      <ProductInfoModal
        product={info}
        mode={purchase ? 'purchase' : 'sale'}
        onAdd={(product) => {
          onPick(product);
          searchRef.current?.focus();
        }}
        onClose={() => setInfo(null)}
      />
    </div>
  );
}

/** A category in the row over the catalog (one is always chosen: "Recomendados" by default). */
function CategoryChip({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cx(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition',
        active
          ? 'border-primary bg-primary text-on-primary shadow-sm'
          : 'border-line bg-surface text-muted hover:border-primary/40 hover:text-ink',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ProductTile({
  product,
  amount,
  amountLabel,
  showStock,
  purchase,
  quantity,
  top,
  onPick,
}: {
  product: ProductOption;
  amount: number | null;
  amountLabel: string | undefined;
  showStock: boolean;
  purchase: boolean;
  quantity: number;
  top: boolean;
  onPick: () => void;
}) {
  const { t, fmt } = useI18n();
  const counted = showStock && product.trackStock;
  // What is left once this ticket is saved (a sale takes it out; a purchase counts it as now).
  const left = purchase ? product.stock : product.stock - quantity;
  const tone = !counted
    ? null
    : left <= 0
      ? 'bg-danger-soft text-danger-ink'
      : left <= (product.minStock ?? 0)
        ? 'bg-warning-soft text-warning-ink'
        : 'bg-surface-3 text-muted';
  return (
    <button
      type="button"
      onClick={onPick}
      className={cx(
        'group relative flex h-full min-h-32 w-full flex-col rounded-2xl border bg-surface p-3 text-left shadow-card transition duration-150 select-none hover:-translate-y-0.5 hover:shadow-pop active:translate-y-0 active:scale-[0.97]',
        quantity > 0
          ? 'border-primary ring-2 ring-primary/25'
          : 'border-line hover:border-primary/40',
      )}
    >
      {quantity > 0 && (
        <span
          key={quantity}
          className="animate-pop-in absolute -top-2 -left-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-on-primary shadow-pop tabular-nums"
        >
          {fmt.number(quantity)}
        </span>
      )}
      <span className="flex items-start gap-2">
        <ProductThumb
          name={product.name}
          imageUrl={product.imageUrl}
          size={product.imageUrl ? 48 : 36}
        />
        <span className="min-w-0">
          <span className="line-clamp-2 pr-7 text-sm leading-snug font-semibold">
            {product.name}
          </span>
          {top && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-ink">
              <Flame className="h-3 w-3" />
              {t('pos.top')}
            </span>
          )}
        </span>
      </span>
      <span className="mt-auto flex items-end justify-between gap-2 pt-3">
        <span className="min-w-0">
          {amountLabel && <span className="block text-[11px] text-muted">{amountLabel}</span>}
          <span className="block font-display text-lg leading-none font-semibold tabular-nums">
            {amount === null ? '—' : fmt.money(amount)}
          </span>
          <span className="text-[11px] text-muted">
            {product.kind === 'service'
              ? t('products.kinds.service')
              : t(`products.unitsShort.${product.unit}`)}
          </span>
        </span>
        {tone && (
          <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold', tone)}>
            {left <= 0 ? t('sales.pos.out') : t('sales.pos.left', { count: fmt.number(left) })}
          </span>
        )}
      </span>
    </button>
  );
}
