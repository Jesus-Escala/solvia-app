import { Eye, MoreHorizontal, Pencil, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { RiskBadge } from '../components/domain/Badges';
import { CustomerFormModal } from '../components/domain/CustomerFormModal';
import {
  Alert,
  Avatar,
  Button,
  DataTable,
  IconButton,
  MenuItems,
  Page,
  PageHeader,
  Popover,
  SearchInput,
  SegmentedControl,
  useFeedback,
  type DataTableColumn,
  useErrorText,
} from '@/ui';
import { useCustomers, useDeleteCustomer, type CustomerListParams } from '../hooks/queries';
import { useUrlState } from '@/ui';
import { useI18n } from '../i18n/I18nProvider';
import type { CustomerListItem, RiskLevel, SortDir } from '../lib/types';

const DEFAULTS = {
  search: '',
  risk: '',
  page: '1',
  pageSize: '20',
  sortBy: 'name',
  sortDir: 'asc',
};

export function CustomersPage() {
  const { t, fmt } = useI18n();
  const navigate = useNavigate();
  const errors = useErrorText();
  const { isAdmin } = useAuth();
  const { toast, confirm } = useFeedback();
  const [state, update] = useUrlState(DEFAULTS);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CustomerListItem | null>(null);
  const remove = useDeleteCustomer();

  const query = useCustomers({
    search: state.search || undefined,
    risk: (state.risk || undefined) as RiskLevel | undefined,
    page: Number(state.page) || 1,
    pageSize: Number(state.pageSize) || 20,
    sortBy: state.sortBy as CustomerListParams['sortBy'],
    sortDir: state.sortDir as SortDir,
  });
  const filtered = Boolean(state.search || state.risk);

  const deleteCustomer = async (customer: CustomerListItem) => {
    const confirmed = await confirm({
      title: t('customers.confirmDeleteTitle'),
      message: t('customers.confirmDeleteMessage', { name: customer.name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(customer.id);
      toast.success(t('customers.deleted'));
    } catch (error) {
      toast.error(errors.message(error));
    }
  };

  const columns: Array<DataTableColumn<CustomerListItem>> = [
    {
      id: 'name',
      header: t('customers.columns.customer'),
      sortable: true,
      hideable: false,
      minWidth: 220,
      mobile: 'title',
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium">{row.name}</p>
            {row.documentId && (
              <p className="text-xs text-subtle">
                {t('customers.documentLabel', { id: row.documentId })}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'phone',
      header: t('customers.columns.phone'),
      mobile: 'subtitle',
      cell: (row) => <span className="tabular-nums">{row.phone}</span>,
    },
    {
      id: 'risk',
      header: t('customers.columns.risk'),
      sortable: true,
      mobile: 'aside',
      cell: (row) => <RiskBadge risk={row.risk} />,
    },
    {
      id: 'open',
      header: t('customers.columns.open'),
      align: 'right',
      cell: (row) => row.summary.openReceivables,
    },
    {
      id: 'overdue',
      header: t('customers.columns.overdue'),
      align: 'right',
      cell: (row) =>
        row.summary.overdueReceivables > 0 ? (
          <span className="font-medium text-danger-ink">{row.summary.overdueReceivables}</span>
        ) : (
          <span className="text-subtle">0</span>
        ),
    },
    {
      id: 'outstanding',
      header: t('customers.columns.outstanding'),
      sortable: true,
      align: 'right',
      mobile: 'aside',
      cell: (row) => (
        <span className="font-semibold">{fmt.money(row.summary.totalOutstanding)}</span>
      ),
    },
    {
      id: 'createdAt',
      header: t('customers.columns.createdAt'),
      sortable: true,
      defaultHidden: true,
      cell: (row) => fmt.date(row.createdAt),
    },
  ];

  return (
    <Page fill>
      <PageHeader
        title={t('customers.title')}
        description={t('customers.subtitle')}
        actions={
          <Button
            data-tour="new-customer"
            icon={<UserPlus className="h-4 w-4" />}
            onClick={() => setCreating(true)}
          >
            {t('customers.new')}
          </Button>
        }
      />
      <DataTable
        data-tour="customers-table"
        columnsStorageKey="customers"
        caption={t('customers.title')}
        toolbar={
          <>
            <SearchInput
              value={state.search}
              onChange={(search) => update({ search })}
              placeholder={t('customers.searchPlaceholder')}
            />
            <SegmentedControl
              label={t('customers.columns.risk')}
              value={state.risk}
              onChange={(risk) => update({ risk })}
              options={[
                { value: '', label: t('common.all') },
                { value: 'low', label: t('risk.low') },
                { value: 'medium', label: t('risk.medium') },
                { value: 'high', label: t('risk.high') },
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
        onRowClick={(row) => navigate(`/customers/${row.id}`)}
        sort={{ id: state.sortBy, dir: state.sortDir as SortDir }}
        onSortChange={(sort) => update({ sortBy: sort.id, sortDir: sort.dir })}
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
                  {
                    label: t('common.view'),
                    icon: <Eye />,
                    onSelect: () => navigate(`/customers/${row.id}`),
                  },
                  { label: t('common.edit'), icon: <Pencil />, onSelect: () => setEditing(row) },
                  {
                    label: t('common.delete'),
                    icon: <Trash2 />,
                    danger: true,
                    hidden: !isAdmin,
                    onSelect: () => void deleteCustomer(row),
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
          title: filtered ? t('customers.emptyFiltered') : t('customers.empty'),
          description: filtered
            ? t('customers.emptyFilteredDescription')
            : t('customers.emptyDescription'),
          action: !filtered ? (
            <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              {t('customers.new')}
            </Button>
          ) : undefined,
        }}
      />
      <CustomerFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(customer) => navigate(`/customers/${customer.id}`)}
      />
      <CustomerFormModal
        open={editing !== null}
        customer={editing ?? undefined}
        onClose={() => setEditing(null)}
      />
    </Page>
  );
}
