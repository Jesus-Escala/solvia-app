import { useNavigate } from 'react-router';
import { Ban, Warehouse } from 'lucide-react';
import { RowActions } from '../components/domain/RowActions';
import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  Modal,
  Page,
  PageHeader,
  SearchInput,
  useErrorText,
  useFeedback,
  urlSort,
  useUrlState,
  type DataTableColumn,
} from '@/ui';
import { usePurchases, useVoidPurchase } from '../hooks/queries';
import { useModules } from '../hooks/useModules';
import { useI18n } from '../i18n/I18nProvider';
import { Kbd } from '../components/pos/PosLayout';
import { ADD_KEY_LABEL } from '../components/pos/keys';
import { useAddShortcut } from '../hooks/useAddShortcut';
import type { Purchase } from '../lib/types';
import { PaymentPartsLabel } from '../components/domain/SplitPayments';
import { ModuleOff } from './ProductsPage';

// Empty sort = newest first.
const DEFAULTS = { search: '', page: '1', pageSize: '20', sortBy: '', sortDir: '' };

/** Voiding a purchase, always after a red confirmation: its products leave the stock again. */
function useVoidPurchaseAction() {
  const { t } = useI18n();
  const { toast, confirm } = useFeedback();
  const voidPurchase = useVoidPurchase();
  const run = async (purchase: Purchase) => {
    const confirmed = await confirm({
      title: t('purchases.voidTitle', { number: purchase.number }),
      message: t('purchases.voidMessage'),
      confirmLabel: t('purchases.void'),
      cancelLabel: t('common.cancel'),
      tone: 'danger',
    });
    if (!confirmed) return false;
    try {
      await voidPurchase.mutateAsync(purchase.id);
      toast.success(t('purchases.voided', { number: purchase.number }));
      return true;
    } catch (error) {
      toast.apiError(error);
      return false;
    }
  };
  return { run, pending: voidPurchase.isPending };
}

function PurchaseDetail({ purchase, onClose }: { purchase: Purchase; onClose: () => void }) {
  const { t, fmt } = useI18n();
  const voidAction = useVoidPurchaseAction();

  const cancel = async () => {
    if (await voidAction.run(purchase)) onClose();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span>{fmt.date(purchase.date)}</span>
        <span className="font-medium text-ink">
          {purchase.supplier?.name ?? t('purchases.noSupplier')}
        </span>
        {purchase.docType !== 'none' && (
          <span>
            {t(`sales.docTypes.${purchase.docType}`)} {purchase.docNumber}
          </span>
        )}
        {purchase.status === 'voided' && <Badge tone="danger">{t('sales.voidedBadge')}</Badge>}
      </div>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {purchase.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{item.description}</span>
            <span className="shrink-0 text-muted tabular-nums">
              {fmt.number(item.quantity)} × {fmt.money(item.unitCost)}
            </span>
            <span className="w-24 shrink-0 text-right font-semibold tabular-nums">
              {fmt.money(item.subtotal)}
            </span>
          </li>
        ))}
      </ul>
      <div className="space-y-2 rounded-xl bg-surface-2 px-4 py-3">
        <p className="flex items-baseline justify-between">
          <span className="text-sm text-muted">{t('sales.columns.total')}</span>
          <span className="font-display text-2xl font-semibold tabular-nums">
            {fmt.money(purchase.total)}
          </span>
        </p>
        {purchase.payments.length > 0 && (
          <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted">{t('split.youPaidWith')}</span>
            <PaymentPartsLabel parts={purchase.payments} />
          </p>
        )}
      </div>
      {purchase.status === 'completed' && (
        <div className="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger-soft/60 p-4 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 text-sm text-danger-ink">
            <span className="block font-semibold">{t('purchases.voidQuestion')}</span>
            {t('purchases.voidHint')}
          </p>
          <Button
            variant="danger"
            icon={<Ban className="h-4 w-4" />}
            loading={voidAction.pending}
            onClick={() => void cancel()}
          >
            {t('purchases.void')}
          </Button>
        </div>
      )}
    </div>
  );
}

export function PurchasesPage() {
  const modules = useModules();
  if (!modules.loading && !modules.inventory) return <ModuleOff />;
  return <PurchasesList />;
}

function PurchasesList() {
  const { t, fmt } = useI18n();
  const errors = useErrorText();
  const [state, update] = useUrlState(DEFAULTS);
  const navigate = useNavigate();
  useAddShortcut(() => navigate('/purchases/new'));
  const voidAction = useVoidPurchaseAction();
  const [viewing, setViewing] = useState<Purchase | null>(null);
  const query = usePurchases({
    search: state.search || null,
    page: Number(state.page) || 1,
    pageSize: Number(state.pageSize) || 20,
    sortBy: (state.sortBy || null) as 'number' | 'supplier' | 'items' | 'total' | null,
    sortDir: state.sortDir === 'desc' ? 'desc' : 'asc',
  });

  const columns: Array<DataTableColumn<Purchase>> = [
    {
      id: 'number',
      sortable: true,
      header: t('purchases.columns.number'),
      hideable: false,
      mobile: 'title',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-semibold">
            {t('purchases.number', { number: row.number })}
            {row.status === 'voided' && (
              <span className="ml-2 align-middle">
                <Badge tone="danger">{t('sales.voidedBadge')}</Badge>
              </span>
            )}
          </p>
          <p className="text-xs text-subtle">{fmt.date(row.date)}</p>
        </div>
      ),
    },
    {
      id: 'supplier',
      sortable: true,
      header: t('purchases.columns.supplier'),
      mobile: 'subtitle',
      cell: (row) =>
        row.supplier?.name ?? <span className="text-muted">{t('purchases.noSupplier')}</span>,
    },
    {
      id: 'items',
      sortable: true,
      header: t('purchases.columns.items'),
      minWidth: 220,
      cell: (row) => <span className="line-clamp-1 text-muted">{row.summary}</span>,
    },
    {
      id: 'total',
      sortable: true,
      header: t('sales.columns.total'),
      align: 'right',
      mobile: 'aside',
      cell: (row) => (
        <span className={row.status === 'voided' ? 'text-subtle line-through' : 'font-semibold'}>
          {fmt.money(row.total)}
        </span>
      ),
    },
  ];

  return (
    <Page fill>
      <PageHeader
        title={t('purchases.title')}
        description={t('purchases.subtitle')}
        actions={
          <Button
            icon={<Warehouse className="h-4 w-4" />}
            onClick={() => navigate('/purchases/new')}
          >
            {t('purchases.new')}
            <Kbd>{ADD_KEY_LABEL}</Kbd>
          </Button>
        }
      />
      <DataTable
        columnsStorageKey="purchases"
        caption={t('purchases.title')}
        toolbar={
          <SearchInput
            value={state.search}
            onChange={(search) => update({ search, page: '1' })}
            placeholder={t('purchases.searchPlaceholder')}
          />
        }
        columns={columns}
        rows={query.data?.data}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        fetching={query.isFetching && !query.isLoading}
        {...(query.error && {
          error: <Alert tone="danger">{errors.message(query.error)}</Alert>,
        })}
        {...urlSort(state, update)}
        onRowClick={(row) => setViewing(row)}
        rowActions={(row) => (
          <RowActions
            onView={() => setViewing(row)}
            {...(row.status === 'completed' && { onVoid: () => void voidAction.run(row) })}
            viewLabel={t('purchases.viewDetail')}
            voidLabel={t('sales.voidShort')}
          />
        )}
        pagination={
          query.data && {
            ...query.data.meta,
            onPageChange: (page) => update({ page: String(page) }),
            onPageSizeChange: (pageSize) => update({ pageSize: String(pageSize) }),
          }
        }
        empty={{
          title: state.search ? t('purchases.emptyFiltered') : t('purchases.empty'),
          ...(!state.search && {
            description: t('purchases.emptyDescription'),
            action: (
              <Button
                icon={<Warehouse className="h-4 w-4" />}
                onClick={() => navigate('/purchases/new')}
              >
                {t('purchases.new')}
              </Button>
            ),
          }),
        }}
      />
      <Modal
        open={viewing !== null}
        title={viewing !== null ? t('purchases.number', { number: viewing.number }) : ''}
        onClose={() => setViewing(null)}
        closeLabel={t('common.close')}
      >
        {viewing !== null && <PurchaseDetail purchase={viewing} onClose={() => setViewing(null)} />}
      </Modal>
    </Page>
  );
}
