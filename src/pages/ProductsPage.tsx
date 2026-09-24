import { Archive, ArchiveRestore, Package, PackagePlus, Pencil, Trash2 } from 'lucide-react';
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
import { ProductFormModal } from '../components/domain/ProductFormModal';
import {
  useDeleteProduct,
  useProducts,
  useSetProductActive,
  type ProductListParams,
} from '../hooks/queries';
import { useModules } from '../hooks/useModules';
import { useI18n } from '../i18n/I18nProvider';
import type { Product, SortDir } from '../lib/types';

const DEFAULTS = {
  search: '',
  status: 'active',
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
  const errors = useErrorText();
  const { isAdmin } = useAuth();
  const { toast, confirm } = useFeedback();
  const [state, update] = useUrlState(DEFAULTS);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const remove = useDeleteProduct();
  const setActive = useSetProductActive();

  const query = useProducts({
    search: state.search || undefined,
    status: state.status as ProductListParams['status'],
    page: Number(state.page) || 1,
    pageSize: Number(state.pageSize) || 20,
    sortBy: (state.sortBy || undefined) as ProductListParams['sortBy'],
    sortDir: (state.sortDir || undefined) as SortDir | undefined,
  });
  const filtered = Boolean(state.search) || state.status !== 'active';

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
        <div className="min-w-0">
          <p className="truncate font-medium">
            {row.name}
            {!row.active && (
              <span className="ml-2 align-middle">
                <Badge tone="neutral">{t('products.archivedBadge')}</Badge>
              </span>
            )}
          </p>
          {row.code && <p className="text-xs text-subtle tabular-nums">{row.code}</p>}
        </div>
      ),
    },
    {
      id: 'unit',
      header: t('products.columns.unit'),
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
      sortValue: (row) => (row.cost === null ? null : row.price - row.cost),
      cell: (row) =>
        row.cost === null ? (
          <span className="text-subtle">—</span>
        ) : (
          <span className={row.price - row.cost < 0 ? 'text-danger-ink' : 'text-success-ink'}>
            {fmt.percent((row.price - row.cost) / row.price)}
          </span>
        ),
    },
    {
      id: 'minStock',
      header: t('products.columns.minStock'),
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
          <Button icon={<PackagePlus className="h-4 w-4" />} onClick={() => setCreating(true)}>
            {t('products.new')}
          </Button>
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
                { value: 'active', label: t('products.filters.active'), icon: <Package /> },
                { value: 'archived', label: t('products.filters.archived'), icon: <Archive /> },
                { value: 'all', label: t('common.all') },
              ]}
            />
          </>
        }
        columns={columns}
        rows={query.data?.data}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        fetching={query.isFetching && !query.isLoading}
        error={query.error ? <Alert tone="danger">{errors.message(query.error)}</Alert> : undefined}
        onRowClick={(row) => setEditing(row)}
        sort={state.sortBy ? { id: state.sortBy, dir: state.sortDir as SortDir } : undefined}
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
          action: !filtered ? (
            <Button icon={<PackagePlus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              {t('products.new')}
            </Button>
          ) : undefined,
        }}
      />
      <ProductFormModal open={creating} onClose={() => setCreating(false)} />
      <ProductFormModal
        open={editing !== null}
        product={editing ?? undefined}
        onClose={() => setEditing(null)}
      />
    </Page>
  );
}
