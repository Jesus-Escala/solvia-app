import {
  AlertTriangle,
  CalendarClock,
  Clock,
  FileBarChart2,
  HandCoins,
  PiggyBank,
  RefreshCw,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { AgingStrip } from '../components/charts/AgingStrip';
import { CashFlowChart } from '../components/charts/CashFlowChart';
import {
  DonutChart,
  RankingBars,
  Alert,
  Button,
  Card,
  DataTable,
  EmptyState,
  KpiCard,
  KpiRow,
  Page,
  SegmentedControl,
  Skeleton,
  Stat,
  useFeedback,
  type DataTableColumn,
  useErrorText,
} from '@/ui';
import { TrendChart } from '../components/charts/TrendChart';
import { StatusBadge } from '../components/domain/Badges';
import {
  useCashFlow,
  useDashboardSummary,
  useGenerateMonthlyReport,
  useMe,
} from '../hooks/queries';
import { useI18n } from '../i18n/I18nProvider';
import type { DashboardSummary, MonthlyReport, ReceivableStatus } from '../lib/types';

const STATUS_COLORS: Record<ReceivableStatus, string> = {
  pending: 'var(--chart-neutral)',
  partial: 'var(--warning)',
  overdue: 'var(--danger)',
  paid: 'var(--success)',
};

function useMinutesSince(iso: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  return iso ? Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000)) : 0;
}

function greetingKey() {
  const hour = new Date().getHours();
  if (hour < 12) return 'dashboard.greetingMorning' as const;
  if (hour < 19) return 'dashboard.greetingAfternoon' as const;
  return 'dashboard.greetingEvening' as const;
}

function DashboardHeader({
  summary,
  onRefresh,
  refreshing,
}: {
  summary?: DashboardSummary;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: me } = useMe();
  const minutes = useMinutesSince(summary?.generatedAt);
  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t(greetingKey(), { name: firstName })}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {t('dashboard.subtitle', { business: me?.tenant.name ?? '' })}
        </p>
      </div>
      <div className="inline-flex items-center gap-1 self-start rounded-full border border-line bg-surface py-1 pr-1 pl-3 text-xs text-muted shadow-card sm:self-auto">
        <Clock className="h-3.5 w-3.5" />
        <span className="tabular-nums">
          {minutes < 1 ? t('common.updatedJustNow') : t('common.updatedMinutesAgo', { minutes })}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="ml-1 rounded-full p-1.5 transition hover:bg-surface-3 hover:text-ink"
          aria-label={t('common.refresh')}
          title={t('common.refresh')}
        >
          <RefreshCw className={refreshing ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
        </button>
      </div>
    </div>
  );
}

function Kpis({
  summary,
  loading,
  fetching,
}: {
  summary?: DashboardSummary;
  loading: boolean;
  fetching: boolean;
}) {
  const { t, fmt } = useI18n();
  if (loading || !summary) {
    return (
      <KpiRow>
        {Array.from({ length: 6 }, (_, index) => (
          <KpiCard key={index} label="" value="" loading />
        ))}
      </KpiRow>
    );
  }
  const { totals, byStatus, riskDistribution } = summary;
  const openCount = byStatus.pending.count + byStatus.partial.count + byStatus.overdue.count;
  const delta =
    totals.collectedLastMonthToDate > 0
      ? (totals.collectedThisMonth - totals.collectedLastMonthToDate) /
        totals.collectedLastMonthToDate
      : null;

  return (
    <KpiRow data-tour="kpis">
      <KpiCard
        fetching={fetching}
        label={t('dashboard.kpi.outstanding')}
        value={fmt.money(totals.outstanding)}
        hint={t('dashboard.kpi.outstandingHint', { count: openCount })}
        icon={<Wallet />}
      />
      <KpiCard
        fetching={fetching}
        label={t('dashboard.kpi.overdue')}
        value={fmt.money(totals.overdue)}
        tone={totals.overdue > 0 ? 'danger' : 'default'}
        gauge={totals.overdueRate}
        hint={t('dashboard.kpi.overdueHint', {
          rate: fmt.percent(totals.overdueRate),
          count: byStatus.overdue.count,
        })}
        icon={<AlertTriangle />}
      />
      <KpiCard
        fetching={fetching}
        label={t('dashboard.kpi.collectedMonth')}
        value={fmt.money(totals.collectedThisMonth)}
        tone="success"
        delta={delta}
        deltaLabel={delta !== null ? t('dashboard.kpi.vsLastMonth') : undefined}
        formatPercent={fmt.percent}
        icon={<HandCoins />}
      />
      <KpiCard
        fetching={fetching}
        label={t('dashboard.kpi.dueSoon')}
        value={fmt.money(totals.dueNext7Days.amount)}
        tone="warning"
        hint={t('dashboard.kpi.dueSoonHint', { count: totals.dueNext7Days.count })}
        icon={<CalendarClock />}
      />
      <KpiCard
        fetching={fetching}
        label={t('dashboard.kpi.highRisk')}
        value={fmt.number(riskDistribution.high)}
        tone={riskDistribution.high > 0 ? 'danger' : 'default'}
        gauge={totals.customers > 0 ? riskDistribution.high / totals.customers : 0}
        hint={t('dashboard.kpi.highRiskHint', { total: totals.customers })}
        icon={<ShieldAlert />}
      />
      <KpiCard
        fetching={fetching}
        label={t('dashboard.kpi.collectedAll')}
        value={fmt.money(totals.collectedAllTime)}
        hint={t('dashboard.kpi.collectedAllHint', { count: byStatus.paid.count })}
        icon={<PiggyBank />}
      />
    </KpiRow>
  );
}

function CashFlowCard() {
  const { t, fmt } = useI18n();
  const [groupBy, setGroupBy] = useState<'week' | 'month'>('week');
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const periods = groupBy === 'week' ? 8 : 6;
  const { data, isLoading, isFetching } = useCashFlow(groupBy, periods);
  const expected = data?.buckets.reduce((sum, bucket) => sum + bucket.amount, 0) ?? 0;

  return (
    <Card
      data-tour="cash-flow"
      loading={isFetching && !isLoading}
      className="lg:col-span-8"
      title={t('dashboard.cashFlow.title')}
      subtitle={t('dashboard.cashFlow.subtitle')}
      actions={
        <>
          <SegmentedControl
            label={t('dashboard.cashFlow.title')}
            value={groupBy}
            onChange={setGroupBy}
            options={[
              { value: 'week', label: t('dashboard.cashFlow.weekly') },
              { value: 'month', label: t('dashboard.cashFlow.monthly') },
            ]}
          />
          <SegmentedControl
            label={t('dashboard.cashFlow.table')}
            value={view}
            onChange={setView}
            options={[
              { value: 'chart', label: t('dashboard.cashFlow.chart') },
              { value: 'table', label: t('dashboard.cashFlow.table') },
            ]}
          />
        </>
      }
    >
      {isLoading || !data ? (
        <Skeleton className="h-[260px] w-full" />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            {t('dashboard.cashFlow.expected', {
              amount: fmt.money(expected),
              count: periods,
              unit:
                groupBy === 'week' ? t('dashboard.cashFlow.weeks') : t('dashboard.cashFlow.months'),
            })}
          </p>
          <CashFlowChart buckets={data.buckets} groupBy={groupBy} view={view} />
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
            <span>
              {t('dashboard.cashFlow.overdueNote', {
                amount: fmt.money(data.overdue.amount),
                count: data.overdue.count,
              })}
            </span>
            {data.later.count > 0 && (
              <span>{t('dashboard.cashFlow.later', { amount: fmt.money(data.later.amount) })}</span>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

function MonthlyReportCard({ report }: { report: MonthlyReport | null }) {
  const { t, fmt } = useI18n();
  const { isAdmin } = useAuth();
  const { toast } = useFeedback();
  const errors = useErrorText();
  const generate = useGenerateMonthlyReport();

  return (
    <Card
      className="lg:col-span-5"
      title={t('dashboard.report.title')}
      subtitle={
        report
          ? t('dashboard.report.generatedAt', { date: fmt.dateTime(report.generatedAt) })
          : t('dashboard.report.subtitle')
      }
      actions={
        isAdmin && (
          <Button
            variant="secondary"
            size="sm"
            icon={<FileBarChart2 className="h-3.5 w-3.5" />}
            loading={generate.isPending}
            onClick={() =>
              generate.mutate(undefined, {
                onSuccess: () => toast.success(t('dashboard.report.generated')),
                onError: (error) => toast.error(errors.message(error)),
              })
            }
          >
            {t('dashboard.report.generate')}
          </Button>
        )
      }
    >
      {!report ? (
        <EmptyState
          compact
          title={t('dashboard.report.empty')}
          description={t('dashboard.report.emptyDescription')}
        />
      ) : (
        <>
          <p className="mb-3 text-sm font-medium capitalize">{fmt.period(report.period)}</p>
          <dl className="grid grid-cols-2 gap-4">
            <Stat
              label={t('dashboard.report.collected')}
              value={fmt.money(report.totalCollected)}
            />
            <Stat label={t('dashboard.report.pending')} value={fmt.money(report.totalPending)} />
          </dl>
          <h3 className="mt-5 mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">
            {t('dashboard.report.topOverdue')}
          </h3>
          {report.topOverdueCustomers.length === 0 ? (
            <p className="text-sm text-muted">{t('dashboard.report.noOverdue')}</p>
          ) : (
            <ol className="space-y-1.5">
              {report.topOverdueCustomers.map((customer, index) => (
                <li
                  key={customer.customerId}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <Link
                    to={`/customers/${customer.customerId}`}
                    className="min-w-0 truncate hover:underline"
                  >
                    <span className="mr-2 text-subtle tabular-nums">{index + 1}.</span>
                    {customer.name}
                  </Link>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {fmt.money(customer.overdueAmount)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </Card>
  );
}

export function DashboardPage() {
  const { t, fmt } = useI18n();
  const navigate = useNavigate();
  const errors = useErrorText();
  const summary = useDashboardSummary();
  const cashFlowRefresh = useCashFlow('week', 8);
  const data = summary.data;
  // Background refresh (after saving something, or the refresh button): shown on each card.
  const refreshing = summary.isFetching && !summary.isLoading;

  const alertColumns: Array<DataTableColumn<DashboardSummary['overdueAlerts'][number]>> = [
    {
      id: 'customer',
      header: t('receivables.columns.customer'),
      cell: (row) => <span className="font-medium">{row.customer?.name}</span>,
      mobile: 'title',
    },
    {
      id: 'description',
      header: t('receivables.columns.description'),
      cell: (row) => row.description,
      mobile: 'subtitle',
    },
    {
      id: 'dueDate',
      header: t('receivables.columns.dueDate'),
      cell: (row) => fmt.date(row.dueDate),
    },
    {
      id: 'days',
      header: t('dashboard.alerts.daysOverdue'),
      align: 'right',
      cell: (row) => <span className="font-medium text-danger-ink">{row.daysOverdue}</span>,
    },
    {
      id: 'outstanding',
      header: t('receivables.columns.outstanding'),
      align: 'right',
      cell: (row) => <span className="font-semibold">{fmt.money(row.outstandingAmount)}</span>,
      mobile: 'aside',
    },
    {
      id: 'status',
      header: t('receivables.columns.status'),
      cell: (row) => <StatusBadge status={row.status} />,
      hideable: false,
    },
  ];

  return (
    <Page>
      <DashboardHeader
        summary={data}
        refreshing={summary.isFetching}
        onRefresh={() => {
          void summary.refetch();
          void cashFlowRefresh.refetch();
        }}
      />

      {summary.error && <Alert tone="danger">{errors.message(summary.error)}</Alert>}

      <Kpis summary={data} loading={summary.isLoading} fetching={refreshing} />

      <div className="grid gap-4 lg:grid-cols-12">
        <Card
          loading={refreshing}
          className="lg:col-span-8"
          title={t('dashboard.trend.title')}
          subtitle={t('dashboard.trend.subtitle')}
        >
          {data ? (
            <TrendChart points={data.collectionTrend} />
          ) : (
            <Skeleton className="h-[260px] w-full" />
          )}
        </Card>
        <Card
          loading={refreshing}
          className="lg:col-span-4"
          title={t('dashboard.statusMix.title')}
          subtitle={t('dashboard.statusMix.subtitle')}
        >
          {data ? (
            <DonutChart
              centerLabel={t('dashboard.statusMix.total')}
              formatValue={fmt.number}
              slices={(['pending', 'partial', 'overdue', 'paid'] as ReceivableStatus[]).map(
                (status) => ({
                  key: status,
                  label: t(`status.${status}`),
                  value: data.byStatus[status].count,
                  color: STATUS_COLORS[status],
                }),
              )}
            />
          ) : (
            <Skeleton className="h-[180px] w-full" />
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <CashFlowCard />
        <Card
          loading={refreshing}
          data-tour="debtors"
          className="lg:col-span-4"
          title={t('dashboard.debtors.title')}
          subtitle={t('dashboard.debtors.subtitle')}
        >
          {!data ? (
            <Skeleton className="h-[240px] w-full" />
          ) : data.topDebtors.length === 0 ? (
            <EmptyState compact title={t('dashboard.debtors.empty')} />
          ) : (
            <RankingBars
              formatValue={fmt.money}
              highlightLabel={t('dashboard.debtors.overdue')}
              baseLabel={t('dashboard.debtors.current')}
              items={data.topDebtors.map((debtor) => ({
                id: debtor.customerId,
                label: debtor.name,
                href: `/customers/${debtor.customerId}`,
                value: debtor.outstanding,
                highlighted: debtor.overdue,
              }))}
            />
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card
          loading={refreshing}
          className="lg:col-span-7"
          title={t('dashboard.aging.title')}
          subtitle={t('dashboard.aging.subtitle')}
        >
          {data ? (
            <AgingStrip
              formatValue={fmt.money}
              formatCount={(count) => t('dashboard.aging.count', { count })}
              segments={data.aging.map((bucket, index) => ({
                key: bucket.key,
                label: t(`dashboard.aging.${bucket.key}`),
                amount: bucket.amount,
                count: bucket.count,
                color: `var(--aging-${index})`,
              }))}
            />
          ) : (
            <Skeleton className="h-24 w-full" />
          )}
        </Card>
        {data ? (
          <MonthlyReportCard report={data.latestMonthlyReport} />
        ) : (
          <Skeleton className="h-64 w-full lg:col-span-5" />
        )}
      </div>

      <DataTable
        fill={false}
        maxHeight={380}
        caption={t('dashboard.alerts.title')}
        toolbar={
          <div>
            <h2 className="text-sm font-semibold">{t('dashboard.alerts.title')}</h2>
            <p className="text-xs text-muted">{t('dashboard.alerts.subtitle')}</p>
          </div>
        }
        toolbarEnd={
          <Button variant="ghost" size="sm" onClick={() => navigate('/receivables?status=overdue')}>
            {t('dashboard.alerts.viewAll')}
          </Button>
        }
        columns={alertColumns}
        rows={data?.overdueAlerts}
        loading={summary.isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/customers/${row.customerId}`)}
        empty={{
          title: t('dashboard.alerts.empty'),
          description: t('dashboard.alerts.emptyDescription'),
        }}
      />
    </Page>
  );
}
