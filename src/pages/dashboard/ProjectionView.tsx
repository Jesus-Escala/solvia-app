import {
  BarChart3,
  Calendar,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Table2,
  Undo2,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  Card,
  DataTable,
  KpiCard,
  KpiRow,
  SegmentedControl,
  Skeleton,
  type DataTableColumn,
} from '@/ui';
import { CashFlowChart } from '../../components/charts/CashFlowChart';
import { presetRange } from '../../components/dashboard/period';
import { useCashFlow, useDashboardAnalytics, useReceivables } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import { tileMoney } from './metrics';
import type { DashboardSummary, Receivable } from '../../lib/types';

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
      className="lg:col-span-12"
      title={t('dashboard.cashFlow.title')}
      subtitle={t('dashboard.cashFlow.subtitle')}
      actions={
        <>
          <SegmentedControl
            label={t('dashboard.cashFlow.title')}
            value={groupBy}
            onChange={setGroupBy}
            options={[
              { value: 'week', label: t('dashboard.cashFlow.weekly'), icon: <CalendarDays /> },
              { value: 'month', label: t('dashboard.cashFlow.monthly'), icon: <Calendar /> },
            ]}
          />
          <SegmentedControl
            label={t('dashboard.cashFlow.table')}
            value={view}
            onChange={setView}
            options={[
              { value: 'chart', label: t('dashboard.cashFlow.chart'), icon: <BarChart3 /> },
              { value: 'table', label: t('dashboard.cashFlow.table'), icon: <Table2 /> },
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

/** Pending receivables that fall due next, soonest first. */
function UpcomingTable() {
  const { t, fmt } = useI18n();
  const navigate = useNavigate();
  const upcoming = useReceivables({
    status: 'pending',
    page: 1,
    pageSize: 10,
    sortBy: 'dueDate',
    sortDir: 'asc',
  });
  const columns: Array<DataTableColumn<Receivable>> = [
    {
      id: 'customer',
      sortValue: (row) => row.customer?.name,
      header: t('receivables.columns.customer'),
      cell: (row) => <span className="font-medium">{row.customer?.name}</span>,
      mobile: 'title',
    },
    {
      id: 'description',
      sortValue: (row) => row.description,
      header: t('receivables.columns.description'),
      cell: (row) => row.description,
      mobile: 'subtitle',
    },
    {
      id: 'dueDate',
      sortValue: (row) => row.dueDate,
      header: t('receivables.columns.dueDate'),
      cell: (row) => fmt.date(row.dueDate),
    },
    {
      id: 'outstanding',
      sortValue: (row) => row.outstandingAmount,
      header: t('receivables.columns.outstanding'),
      align: 'right',
      cell: (row) => <span className="font-semibold">{fmt.money(row.outstandingAmount)}</span>,
      mobile: 'aside',
    },
  ];
  return (
    <DataTable
      fill={false}
      maxHeight={380}
      caption={t('dashboard.projection.upcoming.title')}
      toolbar={
        <div>
          <h2 className="text-sm font-semibold">{t('dashboard.projection.upcoming.title')}</h2>
          <p className="text-xs text-muted">{t('dashboard.projection.upcoming.subtitle')}</p>
        </div>
      }
      toolbarEnd={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/receivables?status=pending&sortBy=dueDate&sortDir=asc')}
        >
          {t('dashboard.projection.upcoming.viewAll')}
        </Button>
      }
      columns={columns}
      rows={upcoming.data?.data}
      loading={upcoming.isLoading}
      fetching={upcoming.isFetching && !upcoming.isLoading}
      rowKey={(row) => row.id}
      onRowClick={(row) => navigate(`/customers/${row.customerId}`)}
      empty={{ title: t('dashboard.projection.upcoming.empty') }}
    />
  );
}

export function ProjectionView({
  summary,
  refreshing,
}: {
  summary?: DashboardSummary;
  refreshing: boolean;
}) {
  const { t, fmt } = useI18n();
  const month = useDashboardAnalytics({ ...presetRange('thisMonth'), granularity: 'day' });
  const snapshot = month.data?.snapshot;
  const fetching = refreshing || (month.isFetching && !month.isLoading);
  const ready = summary && snapshot;

  return (
    <>
      {!ready ? (
        <KpiRow>
          {Array.from({ length: 4 }, (_, index) => (
            <KpiCard key={index} label="" value="" loading />
          ))}
        </KpiRow>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            fetching={fetching}
            label={t('dashboard.today.dueToday')}
            value={tileMoney(fmt, snapshot.dueToday?.amount ?? 0)}
            valueTitle={fmt.money(snapshot.dueToday?.amount ?? 0)}
            tone="warning"
            hint={t('dashboard.today.receivables', { count: snapshot.dueToday?.count ?? 0 })}
            icon={<CalendarClock />}
          />
          <KpiCard
            fetching={fetching}
            label={t('dashboard.kpi.dueSoon')}
            value={tileMoney(fmt, summary.totals.dueNext7Days.amount)}
            valueTitle={fmt.money(summary.totals.dueNext7Days.amount)}
            hint={t('dashboard.kpi.dueSoonHint', { count: summary.totals.dueNext7Days.count })}
            icon={<CalendarDays />}
          />
          <KpiCard
            fetching={fetching}
            label={t('dashboard.projection.next30')}
            value={tileMoney(fmt, snapshot.dueNext30Days?.amount ?? 0)}
            valueTitle={fmt.money(snapshot.dueNext30Days?.amount ?? 0)}
            hint={t('dashboard.today.receivables', { count: snapshot.dueNext30Days?.count ?? 0 })}
            icon={<CalendarRange />}
          />
          <KpiCard
            fetching={fetching}
            label={t('dashboard.projection.toRecover')}
            value={tileMoney(fmt, summary.totals.overdue)}
            valueTitle={fmt.money(summary.totals.overdue)}
            tone={summary.totals.overdue > 0 ? 'danger' : 'default'}
            hint={t('dashboard.projection.toRecoverHint', {
              count: summary.byStatus.overdue.count,
            })}
            icon={<Undo2 />}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <CashFlowCard />
      </div>

      <UpcomingTable />
    </>
  );
}
