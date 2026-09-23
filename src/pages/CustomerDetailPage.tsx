import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  HandCoins,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  Send,
  Trash2,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { RiskBadge } from '../components/domain/Badges';
import { CustomerFormModal } from '../components/domain/CustomerFormModal';
import { useReceivableColumns } from '../components/domain/receivableColumns';
import { ReceivableFormModal } from '../components/domain/ReceivableFormModal';
import { useReceivableActions } from '../components/domain/useReceivableActions';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  DataTable,
  IconButton,
  KpiCard,
  KpiRow,
  LoadingState,
  MenuItems,
  Page,
  Popover,
  Tabs,
  useFeedback,
  type DataTableColumn,
  useErrorText,
  formatPhone,
} from '@/ui';
import {
  useCustomer,
  useDeleteCustomer,
  useNotifications,
  useSendStatement,
} from '../hooks/queries';
import { useI18n } from '../i18n/I18nProvider';
import { api } from '../lib/api';
import type { CustomerDetail, NotificationLogItem } from '../lib/types';

type TabKey = 'receivables' | 'payments' | 'messages';
type PaymentRow = CustomerDetail['payments'][number];

export function CustomerDetailPage() {
  const { id = '' } = useParams();
  const { t, fmt } = useI18n();
  const navigate = useNavigate();
  const errors = useErrorText();
  const { isAdmin } = useAuth();
  const { toast, confirm } = useFeedback();
  const { data: customer, isLoading, error } = useCustomer(id);
  const [tab, setTab] = useState<TabKey>('receivables');
  const [editing, setEditing] = useState(false);
  const [addingReceivable, setAddingReceivable] = useState(false);
  const [opening, setOpening] = useState(false);
  const sendStatement = useSendStatement();
  const deleteCustomer = useDeleteCustomer();
  const actions = useReceivableActions();
  const receivableColumns = useReceivableColumns({ showCustomer: false });
  const messages = useNotifications({ page: 1, pageSize: 100, customerId: id });

  if (isLoading) return <LoadingState label={t('common.loading')} />;
  if (error || !customer) {
    return (
      <Page>
        <Alert tone="danger">{errors.message(error)}</Alert>
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-sm text-primary-ink hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> {t('customerDetail.back')}
        </Link>
      </Page>
    );
  }

  const openStatement = async () => {
    setOpening(true);
    // Open the tab synchronously so popup blockers allow it, then load the PDF into it.
    const tab = window.open('', '_blank');
    try {
      const blob = await api.blob(`/customers/${customer.id}/statement`);
      const url = URL.createObjectURL(blob);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      tab?.close();
      toast.error(errors.message(err));
    } finally {
      setOpening(false);
    }
  };

  const sendStatementNow = async () => {
    try {
      const result = await sendStatement.mutateAsync(customer.id);
      if (result.notification.status === 'sent')
        toast.success(t('customerDetail.statementSent', { phone: customer.phone }));
      else toast.warning(t('customerDetail.statementFailed'));
    } catch (err) {
      toast.error(errors.message(err));
    }
  };

  const remove = async () => {
    const confirmed = await confirm({
      title: t('customers.confirmDeleteTitle'),
      message: t('customers.confirmDeleteMessage', { name: customer.name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;
    try {
      await deleteCustomer.mutateAsync(customer.id);
      toast.success(t('customers.deleted'));
      navigate('/customers', { replace: true });
    } catch (err) {
      toast.error(errors.message(err));
    }
  };

  const { metrics } = customer.risk;
  const receivables = customer.receivables.map((receivable) => ({
    ...receivable,
    customer: { id: customer.id, name: customer.name, phone: customer.phone },
  }));

  const paymentColumns: Array<DataTableColumn<PaymentRow>> = [
    {
      id: 'date',
      header: t('customerDetail.payments.date'),
      mobile: 'subtitle',
      cell: (row) => fmt.date(row.date),
    },
    {
      id: 'receivable',
      header: t('customerDetail.payments.receivable'),
      mobile: 'title',
      cell: (row) => row.receivableDescription,
    },
    {
      id: 'method',
      header: t('customerDetail.payments.method'),
      cell: (row) => <Badge>{t(`methods.${row.method}`)}</Badge>,
    },
    {
      id: 'proof',
      header: t('customerDetail.payments.proof'),
      cell: (row) =>
        row.proofUrl ? (
          <a
            href={row.proofUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary-ink hover:underline"
          >
            <FileText className="h-3.5 w-3.5" /> {t('customerDetail.payments.viewProof')}
          </a>
        ) : (
          <span className="text-subtle">—</span>
        ),
    },
    {
      id: 'amount',
      header: t('customerDetail.payments.amount'),
      align: 'right',
      mobile: 'aside',
      cell: (row) => <span className="font-semibold">{fmt.money(row.amount)}</span>,
    },
  ];

  const messageColumns: Array<DataTableColumn<NotificationLogItem>> = [
    {
      id: 'date',
      header: t('customerDetail.messages.date'),
      minWidth: 150,
      mobile: 'subtitle',
      cell: (row) => fmt.dateTime(row.sentAt),
    },
    {
      id: 'type',
      header: t('customerDetail.messages.type'),
      mobile: 'title',
      cell: (row) => (row.templateType ? t(`templateTypes.${row.templateType}.title`) : '—'),
    },
    {
      id: 'status',
      header: t('customerDetail.messages.status'),
      mobile: 'aside',
      cell: (row) =>
        row.status === 'sent' ? (
          <Badge tone="success" icon={<CheckCircle2 />}>
            {t('settings.log.sent')}
          </Badge>
        ) : (
          <Badge tone="danger" icon={<XCircle />}>
            {t('settings.log.failed')}
          </Badge>
        ),
    },
    {
      id: 'content',
      header: t('customerDetail.messages.content'),
      minWidth: 320,
      cell: (row) => <p className="line-clamp-2 max-w-xl text-muted">{row.sentContent}</p>,
    },
  ];

  return (
    <Page fill>
      <div className="flex shrink-0 flex-col gap-4">
        <Link
          to="/customers"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> {t('customerDetail.back')}
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={customer.name} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                  {customer.name}
                </h1>
                <RiskBadge risk={customer.risk} />
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Phone className="h-3.5 w-3.5" /> {formatPhone(customer.phone)}
                </span>
                {customer.documentId && (
                  <span>{t('customers.documentLabel', { id: customer.documentId })}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAddingReceivable(true)}>
              {t('customerDetail.newReceivable')}
            </Button>
            <Button
              variant="secondary"
              icon={<FileText className="h-4 w-4" />}
              loading={opening}
              onClick={() => void openStatement()}
              title={t('customerDetail.viewStatement')}
              aria-label={t('customerDetail.viewStatement')}
            >
              <span className="hidden sm:inline">{t('customerDetail.viewStatement')}</span>
            </Button>
            <Button
              variant="secondary"
              icon={<Send className="h-4 w-4" />}
              loading={sendStatement.isPending}
              onClick={() => void sendStatementNow()}
              title={t('customerDetail.sendStatement')}
              aria-label={t('customerDetail.sendStatement')}
            >
              <span className="hidden sm:inline">{t('customerDetail.sendStatement')}</span>
            </Button>
            <Popover
              trigger={({ toggle, ref }) => (
                <IconButton
                  ref={ref}
                  variant="secondary"
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
                    { label: t('common.edit'), icon: <Pencil />, onSelect: () => setEditing(true) },
                    {
                      label: t('common.delete'),
                      icon: <Trash2 />,
                      danger: true,
                      hidden: !isAdmin,
                      onSelect: () => void remove(),
                    },
                  ]}
                />
              )}
            </Popover>
          </div>
        </div>

        {customer.notes && (
          <Alert tone="warning">
            <span className="font-medium">{t('customerDetail.notes')}: </span>
            {customer.notes}
          </Alert>
        )}

        <KpiRow>
          <KpiCard
            label={t('customerDetail.kpi.outstanding')}
            value={fmt.money(customer.summary.totalOutstanding)}
            hint={t('customerDetail.kpi.outstandingHint', {
              count: customer.summary.openReceivables,
            })}
            icon={<Wallet />}
          />
          <KpiCard
            label={t('customerDetail.kpi.paid')}
            value={fmt.money(customer.summary.totalPaid)}
            tone="success"
            gauge={
              customer.summary.totalBilled > 0
                ? customer.summary.totalPaid / customer.summary.totalBilled
                : 0
            }
            hint={t('customerDetail.kpi.paidHint', {
              amount: fmt.money(customer.summary.totalBilled),
            })}
            icon={<HandCoins />}
          />
          <KpiCard
            label={t('customerDetail.kpi.onTime')}
            value={metrics.onTimeRate === null ? '—' : fmt.percent(metrics.onTimeRate)}
            gauge={metrics.onTimeRate ?? undefined}
            tone={metrics.onTimeRate !== null && metrics.onTimeRate < 0.5 ? 'danger' : 'default'}
            hint={
              metrics.evaluatedReceivables === 0
                ? t('risk.noHistory')
                : t('customerDetail.kpi.onTimeHint', { count: metrics.evaluatedReceivables })
            }
            icon={<CheckCircle2 />}
          />
          <KpiCard
            label={t('customerDetail.kpi.avgLate')}
            value={t('customerDetail.kpi.avgLateValue', {
              days: fmt.number(metrics.averageDaysOverdue),
            })}
            tone={metrics.currentOverdueCount > 0 ? 'danger' : 'default'}
            hint={t('customerDetail.kpi.avgLateHint', { count: metrics.currentOverdueCount })}
            icon={<Clock3 />}
          />
        </KpiRow>

        <Tabs
          label={customer.name}
          value={tab}
          onChange={setTab}
          items={[
            {
              value: 'receivables',
              label: t('customerDetail.tabs.receivables'),
              icon: <ReceiptText />,
              count: receivables.length,
            },
            {
              value: 'payments',
              label: t('customerDetail.tabs.payments'),
              icon: <HandCoins />,
              count: customer.payments.length,
            },
            {
              value: 'messages',
              label: t('customerDetail.tabs.messages'),
              icon: <MessageCircle />,
              count: messages.data?.meta.total,
            },
          ]}
        />
      </div>

      {tab === 'receivables' && (
        <DataTable
          columnsStorageKey="customer-receivables"
          columns={receivableColumns}
          rows={receivables}
          rowKey={(row) => row.id}
          rowActions={actions.render}
          empty={{
            title: t('receivables.empty'),
            description: t('receivables.emptyDescription'),
            action: (
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAddingReceivable(true)}>
                {t('customerDetail.newReceivable')}
              </Button>
            ),
          }}
        />
      )}
      {tab === 'payments' && (
        <DataTable
          columns={paymentColumns}
          rows={customer.payments}
          rowKey={(row) => row.id}
          empty={{ title: t('customerDetail.payments.empty') }}
        />
      )}
      {tab === 'messages' && (
        <DataTable
          columns={messageColumns}
          rows={messages.data?.data}
          loading={messages.isLoading}
          rowKey={(row) => row.id}
          empty={{ title: t('customerDetail.messages.empty') }}
        />
      )}

      {actions.modals}
      <CustomerFormModal open={editing} customer={customer} onClose={() => setEditing(false)} />
      <ReceivableFormModal
        open={addingReceivable}
        customerId={customer.id}
        onClose={() => setAddingReceivable(false)}
      />
    </Page>
  );
}
