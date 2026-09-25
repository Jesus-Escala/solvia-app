import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ClipboardCheck,
  History,
  Layers,
  Package,
  PackagePlus,
  Pencil,
  Printer,
  QrCode,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  IconButton,
  MenuItems,
  Page,
  PageHeader,
  Popover,
  SearchInput,
  SegmentedControl,
  useErrorText,
  useFeedback,
  useUrlState,
  type DataTableColumn,
} from '@/ui';
import { useAuth } from '../auth/AuthContext';
import { AdjustStockModal } from '../components/domain/AdjustStockModal';
import { KardexModal } from '../components/domain/KardexModal';
import { ProductFormModal } from '../components/domain/ProductFormModal';
import { ProductQrModal } from '../components/domain/ProductQrModal';
import { LabelPrintModal } from '../components/labels/LabelPrintModal';
import { ImageViewer } from '../components/domain/ImageViewer';
import { ProductThumb } from '../components/domain/ProductThumb';
import { ModulesOffer } from '../components/modules/ModulesOffer';
import {
  useDeleteProduct,
  useProducts,
  useSetProductActive,
  type ProductListParams,
} from '../hooks/queries';
import { useModules } from '../hooks/useModules';
import { useI18n } from '../i18n/I18nProvider';
import type { Product, ProductKind, SortDir } from '../lib/types';

const DEFAULTS = {
  search: '',
  status: 'all',
  kind: '',
  page: '1',
  pageSize: '20',
  sortBy: '',
  sortDir: '',
};

/** Shown instead of a module's page when the business does not have that module. */
export function ModuleOff() {
  const { t } = useI18n();
  return (
    <Page>
      <EmptyState
        icon={<Package className="h-5 w-5" />}
        title={t('modules.off.title')}
        description={t('modules.off.description')}
      />
      <ModulesOffer className="mx-auto w-full max-w-3xl" />
    </Page>
  );
}

export function ProductsPage() {
  const modules = useModules();
  if (!modules.loading && !modules.catalog) return <ModuleOff />;
  return <ProductsList />;
}

function ProductsList() {
  const { t, fmt } = useI18n();
  const modules = useModules();
  const errors = useErrorText();
  const { isAdmin } = useAuth();
  const { toast, confirm } = useFeedback();
  const [state, update] = useUrlState(DEFAULTS);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [kardex, setKardex] = useState<Product | null>(null);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [qr, setQr] = useState<Product | null>(null);
  const [viewing, setViewing] = useState<{ url: string; title: string } | null>(null);
  // Label printer: null closed, otherwise the products it starts with.
  const [labels, setLabels] = useState<Product[] | null>(null);
  const remove = useDeleteProduct();
  const setActive = useSetProductActive();

  const query = useProducts({
    search: state.search || null,
    status: (state.status === 'low' ? 'active' : state.status) as ProductListParams['status'],
    lowStock: state.status === 'low' ? true : null,
    kind: (state.kind || null) as ProductKind | null,
    page: Number(state.page) || 1,
    pageSize: Number(state.pageSize) || 20,
    sortBy: (state.sortBy || null) as ProductListParams['sortBy'],
    sortDir: (state.sortDir || null) as SortDir | null,
  });
  const filtered = Boolean(state.search) || state.status !== 'all';

  // Archived products stay for history but are hidden from pickers.
  const toggleArchived = async (product: Product) => {
    try {
      await setActive.mutateAsync({ id: product.id, active: !product.active });
      toast.success(t(product.active ? 'products.archived' : 'products.restored'));
    } catch (error) {
      toast.apiError(error);
    }
  };

  const deleteProduct = async (product: Product) => {
    const confirmed = await confirm({
      title: t('products.confirmDeleteTitle'),
      message: t('products.confirmDeleteMessage', { name: product.name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(product.id);
      toast.success(t('products.deleted'));
    } catch (error) {
      toast.apiError(error);
    }
  };

  const columns: Array<DataTableColumn<Product>> = [
    {
      id: 'name',
      header: t('products.columns.name'),
      sortable: true,
      hideable: false,
      minWidth: 220,
      mobile: 'title',
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          {row.imageUrl ? (
            <button
              type="button"
              title={t('products.form.zoomImage')}
              aria-label={t('products.form.zoomImage')}
              // Only the picture: not the row (edit) nor its double click (delete).
              onClick={(event) => {
                event.stopPropagation();
                setViewing({ url: row.imageUrl!, title: row.name });
              }}
              onDoubleClick={(event) => event.stopPropagation()}
              className="rounded-xl transition hover:ring-2 hover:ring-primary/40"
            >
              <ProductThumb name={row.name} imageUrl={row.imageUrl} size={36} />
            </button>
          ) : (
            <ProductThumb name={row.name} imageUrl={null} size={36} />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium">
              {row.name}
              {row.kind === 'service' && (
                <span className="ml-2 align-middle">
                  <Badge tone="info">{t('products.kinds.service')}</Badge>
                </span>
              )}
              {!row.active && (
                <span className="ml-2 align-middle">
                  <Badge tone="neutral">{t('products.archivedBadge')}</Badge>
                </span>
              )}
            </p>
            {row.code && <p className="text-xs text-subtle tabular-nums">{row.code}</p>}
          </div>
        </div>
      ),
    },
    {
      id: 'unit',
      header: t('products.columns.unit'),
      sortable: true,
      mobile: 'subtitle',
      cell: (row) => t(`products.units.${row.unit}`),
    },
    {
      id: 'price',
      header: t('products.columns.price'),
      sortable: true,
      align: 'right',
      mobile: 'aside',
      cell: (row) => <span className="font-semibold">{fmt.money(row.price)}</span>,
    },
    {
      id: 'cost',
      header: t('products.columns.cost'),
      sortable: true,
      align: 'right',
      cell: (row) =>
        row.cost === null ? <span className="text-subtle">—</span> : fmt.money(row.cost),
    },
    {
      id: 'margin',
      header: t('products.columns.margin'),
      align: 'right',
      sortable: true,
      cell: (row) =>
        row.cost === null ? (
          <span className="text-subtle">—</span>
        ) : (
          <span className={row.price - row.cost < 0 ? 'text-danger-ink' : 'text-success-ink'}>
            {fmt.percent((row.price - row.cost) / row.price)}
          </span>
        ),
    },
    ...(modules.inventory
      ? [
          {
            id: 'stock',
            header: t('products.columns.stock'),
            align: 'right' as const,
            sortable: true,
            cell: (row: Product) =>
              !row.trackStock ? (
                <span className="text-subtle">{t('products.noStock')}</span>
              ) : (
                <span
                  className={
                    row.stock <= (row.minStock ?? 0) ? 'font-semibold text-warning-ink' : ''
                  }
                >
                  {fmt.number(row.stock)}
                </span>
              ),
          },
        ]
      : []),
    {
      id: 'minStock',
      header: t('products.columns.minStock'),
      sortable: true,
      align: 'right',
      defaultHidden: true,
      cell: (row) =>
        !row.trackStock ? (
          <span className="text-subtle">{t('products.noStock')}</span>
        ) : row.minStock === null ? (
          <span className="text-subtle">—</span>
        ) : (
          fmt.number(row.minStock)
        ),
    },
  ];

  return (
    <Page fill>
      <PageHeader
        title={t('products.title')}
        description={t('products.subtitle')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              icon={<Printer className="h-4 w-4" />}
              onClick={() => setLabels([])}
            >
              {t('labels.button')}
            </Button>
            <Button icon={<PackagePlus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              {t('products.new')}
            </Button>
          </div>
        }
      />
      <DataTable
        columnsStorageKey="products"
        caption={t('products.title')}
        toolbar={
          <>
            <SearchInput
              value={state.search}
              onChange={(search) => update({ search, page: '1' })}
              placeholder={t('products.searchPlaceholder')}
            />
            <SegmentedControl
              label={t('products.filters.label')}
              value={state.status}
              onChange={(status) => update({ status, page: '1' })}
              options={[
                { value: 'all', label: t('common.all'), icon: <Layers /> },
                { value: 'active', label: t('products.filters.active'), icon: <Package /> },
                ...(modules.inventory
                  ? [{ value: 'low', label: t('products.filters.low'), icon: <AlertTriangle /> }]
                  : []),
                { value: 'archived', label: t('products.filters.archived'), icon: <Archive /> },
              ]}
            />
            <SegmentedControl
              label={t('products.form.kind')}
              value={state.kind}
              onChange={(kind) => update({ kind, page: '1' })}
              options={[
                { value: '', label: t('common.all'), icon: <Layers /> },
                { value: 'product', label: t('products.kinds.products'), icon: <Package /> },
                { value: 'service', label: t('products.kinds.services'), icon: <Wrench /> },
              ]}
            />
          </>
        }
        columns={columns}
        rows={query.data?.data}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        fetching={query.isFetching && !query.isLoading}
        {...(query.error && {
          error: <Alert tone="danger">{errors.message(query.error)}</Alert>,
        })}
        onRowClick={(row) => setEditing(row)}
        onRowEdit={(row) => setEditing(row)}
        {...(isAdmin && { onRowDelete: (row: Product) => void deleteProduct(row) })}
        {...(state.sortBy && { sort: { id: state.sortBy, dir: state.sortDir as SortDir } })}
        onSortChange={(sort) =>
          update({ sortBy: sort?.id ?? '', sortDir: sort?.dir ?? '', page: '1' })
        }
        rowActions={(row) => (
          <Popover
            trigger={({ toggle, ref }) => (
              <IconButton ref={ref} size="sm" label={t('common.moreActions')} onClick={toggle}>
                <MoreHorizontal className="h-4 w-4" />
              </IconButton>
            )}
          >
            {(close) => (
              <MenuItems
                close={close}
                items={[
                  { label: t('common.edit'), icon: <Pencil />, onSelect: () => setEditing(row) },
                  { label: t('products.qr.action'), icon: <QrCode />, onSelect: () => setQr(row) },
                  {
                    label: t('labels.printOne'),
                    icon: <Printer />,
                    onSelect: () => setLabels([row]),
                  },
                  {
                    label: t('adjust.open'),
                    icon: <ClipboardCheck />,
                    onSelect: () => setAdjusting(row),
                    hidden: !modules.inventory || !row.trackStock,
                  },
                  {
                    label: t('kardex.open'),
                    icon: <History />,
                    onSelect: () => setKardex(row),
                    hidden: !modules.inventory || !row.trackStock,
                  },
                  {
                    label: row.active ? t('products.archive') : t('products.restore'),
                    icon: row.active ? <Archive /> : <ArchiveRestore />,
                    onSelect: () => void toggleArchived(row),
                  },
                  {
                    label: t('common.delete'),
                    icon: <Trash2 />,
                    danger: true,
                    hidden: !isAdmin,
                    onSelect: () => void deleteProduct(row),
                  },
                ]}
              />
            )}
          </Popover>
        )}
        pagination={
          query.data && {
            ...query.data.meta,
            onPageChange: (page) => update({ page: String(page) }),
            onPageSizeChange: (pageSize) => update({ pageSize: String(pageSize) }),
          }
        }
        empty={{
          title: filtered ? t('products.emptyFiltered') : t('products.empty'),
          description: filtered
            ? t('products.emptyFilteredDescription')
            : t('products.emptyDescription'),
          ...(!filtered && {
            action: (
              <Button icon={<PackagePlus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                {t('products.new')}
              </Button>
            ),
          }),
        }}
      />
      <ProductFormModal open={creating} onClose={() => setCreating(false)} />
      <KardexModal product={kardex} onClose={() => setKardex(null)} />
      <AdjustStockModal product={adjusting} onClose={() => setAdjusting(null)} />
      <ProductFormModal
        open={editing !== null}
        {...(editing !== null && { product: editing })}
        onClose={() => setEditing(null)}
        onShowQr={setQr}
      />
      <ProductQrModal
        product={qr}
        onClose={() => setQr(null)}
        onPrint={(product) => {
          setQr(null);
          setLabels([product]);
        }}
      />
      <ImageViewer image={viewing} onClose={() => setViewing(null)} />
      <LabelPrintModal
        open={labels !== null}
        products={labels ?? []}
        onClose={() => setLabels(null)}
      />
    </Page>
  );
}
