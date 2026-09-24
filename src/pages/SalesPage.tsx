import { AlertTriangle, Ban, HandCoins, Layers, ReceiptText, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  Modal,
  Page,
  PageHeader,
  SearchInput,
  SegmentedControl,
  useErrorText,
  useFeedback,
  useUrlState,
  type DataTableColumn,
} from '@/ui';
import { PaymentMethodMark } from '../components/domain/PaymentMethods';
import { SaleFormModal } from '../components/domain/SaleFormModal';
import { useSales, useVoidSale } from '../hooks/queries';
import { useModules } from '../hooks/useModules';
import { useI18n } from '../i18n/I18nProvider';
import type { Sale } from '../lib/types';
import { ModuleOff } from './ProductsPage';

const DEFAULTS = { search: '', type: '', page: '1', pageSize: '20' };

/** "Contado · Yape" or "Fiado · Maria" in one short line. */
function PaymentLabel({ sale }: { sale: Sale }) {
  const { t } = useI18n();
  if (sale.paymentType === 'cash') {
    return (
      <span className="inline-flex items-center gap-1.5">
        {sale.method && <PaymentMethodMark method={sale.method} size="sm" />}
        {t('sales.types.cash')}
        {sale.method && <span className="text-muted">· {t(`methods.${sale.method}`)}</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <ReceiptText className="h-3.5 w-3.5 text-warning-ink" />
      {t('sales.types.credit')}
    </span>
  );
}

function SaleDetail({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const { t, fmt } = useI18n();
  const modules = useModules();
  const { toast, confirm } = useFeedback();
  const voidSale = useVoidSale();

  const cancel = async () => {
    const confirmed = await confirm({
      title: t('sales.voidTitle', { number: sale.number }),
      message:
        sale.paymentType === 'credit' ? t('sales.voidMessageCredit') : t('sales.voidMessage'),
      confirmLabel: t('sales.void'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;
    try {
      await voidSale.mutateAsync(sale.id);
      toast.success(t('sales.voided', { number: sale.number }));
      onClose();
    } catch (error) {
      toast.apiError(error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span>{fmt.date(sale.date)}</span>
        <span>
          {sale.customer ? (
            <Link
              to={`/customers/${sale.customer.id}`}
              className="font-medium text-ink hover:underline"
            >
              {sale.customer.name}
            </Link>
          ) : (
            t('sales.walkIn')
          )}
        </span>
        <PaymentLabel sale={sale} />
        {sale.docType !== 'none' && (
          <span>
            {t(`sales.docTypes.${sale.docType}`)} {sale.docNumber}
          </span>
        )}
        {sale.status === 'voided' && <Badge tone="danger">{t('sales.voidedBadge')}</Badge>}
        {modules.inventory && sale.hasShortage && (
          <Badge tone="warning" icon={<AlertTriangle className="h-3 w-3" />}>
            {t('sales.shortageBadge')}
          </Badge>
        )}
      </div>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {sale.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block truncate">{item.description}</span>
              {modules.inventory && item.shortage > 0 && (
                <span className="block text-xs font-medium text-warning-ink">
                  {t('sales.lineShortage', { count: fmt.number(item.shortage) })}
                </span>
              )}
            </span>
            <span className="shrink-0 text-muted tabular-nums">
              {fmt.number(item.quantity)} × {fmt.money(item.unitPrice)}
            </span>
            <span className="w-24 shrink-0 text-right font-semibold tabular-nums">
              {fmt.money(item.subtotal)}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between rounded-xl bg-surface-2 px-4 py-3">
        <span className="text-sm text-muted">{t('sales.columns.total')}</span>
        <span className="font-display text-2xl font-semibold tabular-nums">
          {fmt.money(sale.total)}
        </span>
      </div>
      {sale.receivable && (
        <p className="text-sm text-muted">
          {sale.receivable.outstanding > 0
            ? t('sales.stillOwes', { amount: fmt.money(sale.receivable.outstanding) })
            : t('sales.paidOff')}
        </p>
      )}
      {sale.status === 'completed' && (
        <div className="flex justify-end border-t border-line pt-4">
          <Button
            variant="secondary"
            icon={<Ban className="h-4 w-4" />}
            loading={voidSale.isPending}
            onClick={() => void cancel()}
          >
            {t('sales.void')}
          </Button>
        </div>
      )}
    </div>
  );
}

export function SalesPage() {
  const modules = useModules();
  if (!modules.loading && !modules.sales) return <ModuleOff />;
  return <SalesList />;
}

function SalesList() {
  const { t, fmt } = useI18n();
  const modules = useModules();
  const errors = useErrorText();
  const [state, update] = useUrlState(DEFAULTS);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Sale | null>(null);

  const query = useSales({
    search: state.search || null,
    paymentType: state.type === 'cash' || state.type === 'credit' ? state.type : null,
    shortage: state.type === 'shortage' ? true : null,
    page: Number(state.page) || 1,
    pageSize: Number(state.pageSize) || 20,
  });
  const filtered = Boolean(state.search || state.type);

  const columns: Array<DataTableColumn<Sale>> = [
    {
      id: 'number',
      header: t('sales.columns.number'),
      hideable: false,
      mobile: 'title',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-semibold">
            {t('sales.number', { number: row.number })}
            {row.status === 'voided' && (
              <span className="ml-2 align-middle">
                <Badge tone="danger">{t('sales.voidedBadge')}</Badge>
              </span>
            )}
            {modules.inventory && row.hasShortage && row.status !== 'voided' && (
              <span className="ml-2 align-middle">
                <Badge tone="warning">{t('sales.shortageBadge')}</Badge>
              </span>
            )}
          </p>
          <p className="text-xs text-subtle">{fmt.date(row.date)}</p>
        </div>
      ),
    },
    {
      id: 'customer',
      header: t('sales.columns.customer'),
      mobile: 'subtitle',
      cell: (row) => row.customer?.name ?? <span className="text-muted">{t('sales.walkIn')}</span>,
    },
    {
      id: 'items',
      header: t('sales.columns.items'),
      minWidth: 220,
      cell: (row) => <span className="line-clamp-1 text-muted">{row.summary}</span>,
    },
    {
      id: 'payment',
      header: t('sales.columns.payment'),
      cell: (row) => <PaymentLabel sale={row} />,
    },
    {
      id: 'total',
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
        title={t('sales.title')}
        description={t('sales.subtitle')}
        actions={
          <Button icon={<ShoppingCart className="h-4 w-4" />} onClick={() => setCreating(true)}>
            {t('sales.new')}
          </Button>
        }
      />
      <DataTable
        columnsStorageKey="sales"
        caption={t('sales.title')}
        toolbar={
          <>
            <SearchInput
              value={state.search}
              onChange={(search) => update({ search, page: '1' })}
              placeholder={t('sales.searchPlaceholder')}
            />
            <SegmentedControl
              label={t('sales.columns.payment')}
              value={state.type}
              onChange={(type) => update({ type, page: '1' })}
              options={[
                { value: '', label: t('common.all'), icon: <Layers /> },
                { value: 'cash', label: t('sales.types.cash'), icon: <HandCoins /> },
                { value: 'credit', label: t('sales.types.credit'), icon: <ReceiptText /> },
                ...(modules.inventory
                  ? [
                      {
                        value: 'shortage',
                        label: t('sales.shortageFilter'),
                        icon: <AlertTriangle />,
                      },
                    ]
                  : []),
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
        onRowClick={(row) => setViewing(row)}
        pagination={
          query.data && {
            ...query.data.meta,
            onPageChange: (page) => update({ page: String(page) }),
            onPageSizeChange: (pageSize) => update({ pageSize: String(pageSize) }),
          }
        }
        empty={{
          title: filtered ? t('sales.emptyFiltered') : t('sales.empty'),
          ...(!filtered && { description: t('sales.emptyDescription') }),
          ...(!filtered && {
            action: (
              <Button icon={<ShoppingCart className="h-4 w-4" />} onClick={() => setCreating(true)}>
                {t('sales.new')}
              </Button>
            ),
          }),
        }}
      />
      <SaleFormModal open={creating} onClose={() => setCreating(false)} />
      <Modal
        open={viewing !== null}
        title={viewing ? t('sales.number', { number: viewing.number }) : ''}
        onClose={() => setViewing(null)}
        closeLabel={t('common.close')}
      >
        {viewing && <SaleDetail sale={viewing} onClose={() => setViewing(null)} />}
      </Modal>
    </Page>
  );
}
