import {
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  FileText,
  HandCoins,
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
import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { RiskBadge } from '../components/domain/Badges';
import { PaymentMethodLabel } from '../components/domain/PaymentMethods';
import { CustomerFormModal } from '../components/domain/CustomerFormModal';
import { FileViewer, type ViewerRequest } from '../components/files/FileViewer';
import { useReceivableColumns } from '../components/domain/receivableColumns';
import { ReceivableFormModal } from '../components/domain/ReceivableFormModal';
import { useReceivableActions } from '../components/domain/useReceivableActions';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
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
  WhatsAppIcon,
  smallButtonClass,
} from '@/ui';
import {
  useCustomer,
  useDeleteCustomer,
  useNotifications,
  useSendStatement,
} from '../hooks/queries';
import { useModules } from '../hooks/useModules';
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
  const { data: customer, isLoading, isFetching, error } = useCustomer(id);
  const refreshing = isFetching && !isLoading;
  const [tab, setTab] = useState<TabKey>('receivables');
  const [editing, setEditing] = useState(false);
  const [addingReceivable, setAddingReceivable] = useState(false);
  const [statement, setStatement] = useState<ViewerRequest | null>(null);
  const closeStatement = useCallback(() => setStatement(null), []);
  const sendStatement = useSendStatement();
  const deleteCustomer = useDeleteCustomer();
  const actions = useReceivableActions();
  const receivableColumns = useReceivableColumns({ showCustomer: false });
  const modules = useModules();
  // Without Cobranza a customer is who bought (Ventas): no debts, statements or reminders.
  const collections = modules.collections;
  const messages = useNotifications({ page: 1, pageSize: 100, customerId: id }, collections);

  if (isLoading) return <LoadingState label={t('common.loading')} />;
  if (error || !customer) {
    return (
      <Page>
        <Alert tone="danger">{errors.message(error)}</Alert>
        <Link to="/customers" className={smallButtonClass('sm')}>
          <ArrowLeft className="h-4 w-4" /> {t('customerDetail.back')}
        </Link>
      </Page>
    );
  }

  // The statement opens in the in-page viewer (works on phones too) with its download button.
  const openStatement = () =>
    setStatement({
      kind: 'pdf',
      title: t('customerDetail.viewStatement'),
      fileName: 'solvia-statement.pdf',
      load: () => api.file(`/customers/${customer.id}/statement`),
    });

  const sendStatementNow = async () => {
    try {
      const result = await sendStatement.mutateAsync(customer.id);
      // No WhatsApp provider configured: open the chat with the message ready to send.
      if (result.whatsappUrl) {
        window.open(result.whatsappUrl, '_blank', 'noopener');
        toast.info(t('customerDetail.statementChat'), t('customerDetail.statementChatHint'));
      } else if (result.notification.status === 'sent')
        toast.success(t('customerDetail.statementSent', { phone: customer.phone }));
      else toast.warning(t('customerDetail.statementFailed'));
    } catch (err) {
      toast.apiError(err);
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
      toast.apiError(err);
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
      sortValue: (row) => row.date,
      header: t('customerDetail.payments.date'),
      mobile: 'subtitle',
      cell: (row) => fmt.date(row.date),
    },
    {
      id: 'receivable',
      sortValue: (row) => row.receivableDescription,
      header: t('customerDetail.payments.receivable'),
      mobile: 'title',
      cell: (row) => row.receivableDescription,
    },
    {
      id: 'method',
      sortValue: (row) => t(`methods.${row.method}`),
      header: t('customerDetail.payments.method'),
      cell: (row) => <PaymentMethodLabel method={row.method} />,
    },
    {
      id: 'proof',
      sortValue: (row) => (row.proofUrl ? 1 : 0),
      header: t('customerDetail.payments.proof'),
      cell: (row) =>
        row.proofUrl ? (
          <a
            href={row.proofUrl}
            target="_blank"
            rel="noreferrer"
            className={smallButtonClass('xs')}
          >
            <FileText className="h-3.5 w-3.5" /> {t('customerDetail.payments.viewProof')}
          </a>
        ) : (
          <span className="text-subtle">—</span>
        ),
    },
    {
      id: 'amount',
      sortValue: (row) => row.amount,
      header: t('customerDetail.payments.amount'),
      align: 'right',
      mobile: 'aside',
      cell: (row) => <span className="font-semibold">{fmt.money(row.amount)}</span>,
    },
  ];

  const messageColumns: Array<DataTableColumn<NotificationLogItem>> = [
    {
      id: 'date',
      sortValue: (row) => row.sentAt,
      header: t('customerDetail.messages.date'),
      minWidth: 150,
      mobile: 'subtitle',
      cell: (row) => fmt.dateTime(row.sentAt),
    },
    {
      id: 'type',
      sortValue: (row) => (row.templateType ? t(`templateTypes.${row.templateType}.title`) : null),
      header: t('customerDetail.messages.type'),
      mobile: 'title',
      cell: (row) => (row.templateType ? t(`templateTypes.${row.templateType}.title`) : '—'),
    },
    {
      id: 'status',
      sortValue: (row) => row.status,
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
      sortValue: (row) => row.sentContent,
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
                <h1 className="truncate text-2xl font-semibold sm:text-[2rem]">{customer.name}</h1>
                {collections && <RiskBadge risk={customer.risk} />}
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
            {collections && (
              <>
                <Button
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => setAddingReceivable(true)}
                >
                  {t('customerDetail.newReceivable')}
                </Button>
                <Button
                  variant="secondary"
                  icon={<FileText className="h-4 w-4" />}
                  onClick={openStatement}
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
              </>
            )}
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

        {!collections && (
          <Card>
            <p className="font-semibold">{t('customerDetail.noCollections.title')}</p>
            <p className="text-sm text-muted">{t('customerDetail.noCollections.description')}</p>
            <Link
              to={`/sales?search=${encodeURIComponent(customer.name)}`}
              className={smallButtonClass('sm', 'mt-3')}
            >
              {t('customerDetail.noCollections.link')}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Card>
        )}

        {collections && (
          <KpiRow>
            <KpiCard
              fetching={refreshing}
              label={t('customerDetail.kpi.outstanding')}
              value={fmt.money(customer.summary.totalOutstanding)}
              hint={t('customerDetail.kpi.outstandingHint', {
                count: customer.summary.openReceivables,
              })}
              icon={<Wallet />}
            />
            <KpiCard
              fetching={refreshing}
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
              fetching={refreshing}
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
              fetching={refreshing}
              label={t('customerDetail.kpi.avgLate')}
              value={t('customerDetail.kpi.avgLateValue', {
                days: fmt.number(metrics.averageDaysOverdue),
              })}
              tone={metrics.currentOverdueCount > 0 ? 'danger' : 'default'}
              hint={t('customerDetail.kpi.avgLateHint', { count: metrics.currentOverdueCount })}
              icon={<Clock3 />}
            />
          </KpiRow>
        )}

        {collections && (
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
                icon: <WhatsAppIcon />,
                count: messages.data?.meta.total,
              },
            ]}
          />
        )}
      </div>

      {collections && tab === 'receivables' && (
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
      {collections && tab === 'payments' && (
        <DataTable
          columns={paymentColumns}
          rows={customer.payments}
          rowKey={(row) => row.id}
          empty={{ title: t('customerDetail.payments.empty') }}
        />
      )}
      {collections && tab === 'messages' && (
        <DataTable
          columns={messageColumns}
          rows={messages.data?.data}
          loading={messages.isLoading}
          rowKey={(row) => row.id}
          empty={{ title: t('customerDetail.messages.empty') }}
        />
      )}

      {actions.modals}
      <FileViewer request={statement} onClose={closeStatement} />
      <CustomerFormModal open={editing} customer={customer} onClose={() => setEditing(false)} />
      <ReceivableFormModal
        open={addingReceivable}
        customer={{
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          outstanding: customer.summary.totalOutstanding,
        }}
        onClose={() => setAddingReceivable(false)}
      />
    </Page>
  );
}
