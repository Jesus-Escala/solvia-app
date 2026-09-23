import {
  AlertTriangle,
  CalendarClock,
  CalendarX2,
  ChevronRight,
  HandCoins,
  ShieldAlert,
  Target,
  Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button, Card, cx, DataTable, KpiCard, KpiRow, Skeleton, type DataTableColumn } from '@/ui';
import { PeriodChart } from '../../components/charts/PeriodChart';
import { presetRange } from '../../components/dashboard/period';
import { StatusBadge } from '../../components/domain/Badges';
import { useDashboardAnalytics } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { DashboardSummary } from '../../lib/types';
import { change, pointsChange, tileMoney, formatPoints } from './metrics';

/** One actionable line of the "today" panel. */
function TodayItem({
  icon,
  tone,
  label,
  amount,
  count,
  to,
}: {
  icon: ReactNode;
  tone: 'danger' | 'warning' | 'info';
  label: string;
  amount?: string;
  count: string;
  to: string;
}) {
  const tones = {
    danger: 'bg-danger-soft text-danger-ink',
    warning: 'bg-warning-soft text-warning-ink',
    info: 'bg-info-soft text-info-ink',
  };
  return (
    <li>
      <Link
        to={to}
        className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface-2"
      >
        <span
          className={cx(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&>svg]:h-4 [&>svg]:w-4',
            tones[tone],
          )}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{label}</span>
          <span className="block text-xs text-muted">{count}</span>
        </span>
        {amount && <span className="shrink-0 text-sm font-semibold tabular-nums">{amount}</span>}
        <ChevronRight className="h-4 w-4 shrink-0 text-subtle transition group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}

export function SummaryView({
  summary,
  loading,
  refreshing,
}: {
  summary?: DashboardSummary;
  loading: boolean;
  refreshing: boolean;
}) {
  const { t, fmt } = useI18n();
  const navigate = useNavigate();
  const month = useDashboardAnalytics({ ...presetRange('thisMonth'), granularity: 'day' });
  const trend = useDashboardAnalytics({ ...presetRange('last6Months'), granularity: 'month' });
  const monthData = month.data;
  const monthFetching = month.isFetching && !month.isLoading;
  const snapshot = monthData?.snapshot;

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

  const rate = monthData?.kpis.collectionRate;

  return (
    <>
      {loading || !summary ? (
        <KpiRow>
          {Array.from({ length: 4 }, (_, index) => (
            <KpiCard key={index} label="" value="" loading />
          ))}
        </KpiRow>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-tour="kpis">
          <KpiCard
            fetching={refreshing}
            label={t('dashboard.kpi.outstanding')}
            value={tileMoney(fmt, summary.totals.outstanding)}
            valueTitle={fmt.money(summary.totals.outstanding)}
            hint={t('dashboard.kpi.outstandingHint', {
              count:
                summary.byStatus.pending.count +
                summary.byStatus.partial.count +
                summary.byStatus.overdue.count,
            })}
            icon={<Wallet />}
          />
          <KpiCard
            fetching={refreshing}
            label={t('dashboard.kpi.overdue')}
            value={tileMoney(fmt, summary.totals.overdue)}
            valueTitle={fmt.money(summary.totals.overdue)}
            tone={summary.totals.overdue > 0 ? 'danger' : 'default'}
            gauge={summary.totals.overdueRate}
            hint={t('dashboard.kpi.overdueHint', {
              rate: fmt.percent(summary.totals.overdueRate),
              count: summary.byStatus.overdue.count,
            })}
            icon={<AlertTriangle />}
          />
          <KpiCard
            fetching={monthFetching}
            loading={month.isLoading}
            label={t('dashboard.summary.collectedMonth')}
            value={tileMoney(fmt, monthData?.kpis.collected.value ?? 0)}
            valueTitle={fmt.money(monthData?.kpis.collected.value ?? 0)}
            tone="success"
            delta={change(monthData?.kpis.collected)}
            deltaLabel={t('dashboard.summary.vsSamePeriod')}
            formatPercent={fmt.percent}
            icon={<HandCoins />}
          />
          <KpiCard
            fetching={monthFetching}
            loading={month.isLoading}
            label={t('dashboard.summary.rateMonth')}
            value={rate?.value == null ? '—' : fmt.percent(rate.value)}
            gauge={rate?.value ?? 0}
            delta={pointsChange(rate)}
            deltaLabel={t('dashboard.summary.vsSamePeriod')}
            formatPercent={formatPoints}
            icon={<Target />}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <Card
          loading={monthFetching || refreshing}
          className="lg:col-span-5"
          title={t('dashboard.today.title')}
          subtitle={t('dashboard.today.subtitle')}
          padded={false}
        >
          {!summary || !snapshot ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <ul className="px-3 pb-3">
              <TodayItem
                icon={<CalendarClock />}
                tone="warning"
                label={t('dashboard.today.dueToday')}
                amount={fmt.money(snapshot.dueToday?.amount ?? 0)}
                count={t('dashboard.today.receivables', { count: snapshot.dueToday?.count ?? 0 })}
                to="/receivables?status=pending&sortBy=dueDate&sortDir=asc"
              />
              <TodayItem
                icon={<CalendarClock />}
                tone="info"
                label={t('dashboard.today.dueWeek')}
                amount={fmt.money(summary.totals.dueNext7Days.amount)}
                count={t('dashboard.today.receivables', {
                  count: summary.totals.dueNext7Days.count,
                })}
                to="/receivables?status=pending&sortBy=dueDate&sortDir=asc"
              />
              <TodayItem
                icon={<CalendarX2 />}
                tone="danger"
                label={t('dashboard.today.overdue30')}
                amount={fmt.money(snapshot.overdueOver30Days?.amount ?? 0)}
                count={t('dashboard.today.receivables', {
                  count: snapshot.overdueOver30Days?.count ?? 0,
                })}
                to="/receivables?status=overdue&sortBy=dueDate&sortDir=asc"
              />
              <TodayItem
                icon={<ShieldAlert />}
                tone="danger"
                label={t('dashboard.today.highRisk')}
                count={t('dashboard.today.customers', {
                  count: summary.riskDistribution.high,
                })}
                to="/customers?risk=high"
              />
            </ul>
          )}
        </Card>
        <Card
          loading={trend.isFetching && !trend.isLoading}
          className="lg:col-span-7"
          title={t('dashboard.summary.trendTitle')}
          subtitle={t('dashboard.summary.trendSubtitle')}
        >
          {trend.data ? (
            <PeriodChart series={trend.data.series} granularity="month" view="chart" />
          ) : (
            <Skeleton className="h-[300px] w-full" />
          )}
        </Card>
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
        rows={summary?.overdueAlerts}
        loading={loading}
        fetching={refreshing}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/customers/${row.customerId}`)}
        empty={{
          title: t('dashboard.alerts.empty'),
          description: t('dashboard.alerts.emptyDescription'),
        }}
      />
    </>
  );
}
