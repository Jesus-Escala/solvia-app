import {
  AlertTriangle,
  FileBarChart2,
  Landmark,
  PieChart,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router';
import {
  Button,
  Card,
  DonutChart,
  EmptyState,
  KpiCard,
  KpiRow,
  RankingBars,
  Skeleton,
  Stat,
  useFeedback,
} from '@/ui';
import { useAuth } from '../../auth/AuthContext';
import { AgingStrip } from '../../components/charts/AgingStrip';
import { useGenerateMonthlyReport } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { DashboardSummary, MonthlyReport, ReceivableStatus, RiskLevel } from '../../lib/types';
import { ConcentrationCard } from './ConcentrationCard';
import { RISK_COLORS, STATUS_COLORS, tileMoney } from './metrics';

function MonthlyReportCard({ report }: { report: MonthlyReport | null }) {
  const { t, fmt } = useI18n();
  const { isAdmin } = useAuth();
  const { toast } = useFeedback();
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
                onError: (error) => toast.apiError(error),
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

/** Open receivables by status: how many, their total and what is still owed. */
function StatusTable({ summary }: { summary: DashboardSummary }) {
  const { t, fmt } = useI18n();
  const statuses: ReceivableStatus[] = ['pending', 'partial', 'overdue', 'paid'];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs sm:text-sm">
        <thead className="text-[11px] tracking-wide text-muted uppercase">
          <tr>
            <th className="pb-2 text-left font-semibold">{t('receivables.columns.status')}</th>
            <th className="pb-2 text-right font-semibold">
              {t('dashboard.portfolio.table.count')}
            </th>
            <th className="pb-2 text-right font-semibold max-sm:hidden">
              {t('dashboard.portfolio.table.total')}
            </th>
            <th className="pb-2 text-right font-semibold">
              {t('receivables.columns.outstanding')}
            </th>
          </tr>
        </thead>
        <tbody>
          {statuses.map((status) => {
            const row = summary.byStatus[status];
            return (
              <tr key={status} className="border-t border-line">
                <td className="py-2.5">
                  <Link
                    to={`/receivables?status=${status}`}
                    className="inline-flex items-center gap-2 hover:underline"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: STATUS_COLORS[status] }}
                      aria-hidden="true"
                    />
                    {t(`status.${status}`)}
                  </Link>
                </td>
                <td className="py-2.5 text-right tabular-nums">{fmt.number(row.count)}</td>
                <td className="py-2.5 text-right tabular-nums max-sm:hidden">
                  {fmt.money(row.totalAmount)}
                </td>
                <td className="py-2.5 text-right font-semibold tabular-nums">
                  {fmt.money(row.outstandingAmount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PortfolioView({
  summary,
  refreshing,
}: {
  summary?: DashboardSummary;
  refreshing: boolean;
}) {
  const { t, fmt } = useI18n();
  if (!summary) {
    return (
      <>
        <KpiRow>
          {Array.from({ length: 5 }, (_, index) => (
            <KpiCard key={index} label="" value="" loading />
          ))}
        </KpiRow>
        <Skeleton className="h-64 w-full" />
      </>
    );
  }
  const { totals, byStatus, riskDistribution, topDebtors, aging } = summary;
  const openCount = byStatus.pending.count + byStatus.partial.count + byStatus.overdue.count;
  // Concentration: share of the portfolio owed by the 5 largest debtors.
  const top5 = topDebtors.slice(0, 5).reduce((sum, debtor) => sum + debtor.outstanding, 0);
  const concentration = totals.outstanding > 0 ? top5 / totals.outstanding : 0;
  const rated = riskDistribution.low + riskDistribution.medium + riskDistribution.high;
  const averageDebt = openCount > 0 ? totals.outstanding / openCount : 0;
  const over90 = aging.find((bucket) => bucket.key === 'days90plus');

  return (
    <>
      <KpiRow>
        <KpiCard
          fetching={refreshing}
          label={t('dashboard.portfolio.total')}
          value={tileMoney(fmt, totals.outstanding)}
          valueTitle={fmt.money(totals.outstanding)}
          hint={t('dashboard.kpi.outstandingHint', { count: openCount })}
          icon={<Wallet />}
        />
        <KpiCard
          fetching={refreshing}
          label={t('dashboard.kpi.overdue')}
          value={tileMoney(fmt, totals.overdue)}
          valueTitle={fmt.money(totals.overdue)}
          tone={totals.overdue > 0 ? 'danger' : 'default'}
          gauge={totals.overdueRate}
          hint={t('dashboard.kpi.overdueHint', {
            rate: fmt.percent(totals.overdueRate),
            count: byStatus.overdue.count,
          })}
          icon={<AlertTriangle />}
        />
        <KpiCard
          fetching={refreshing}
          label={t('dashboard.portfolio.over90')}
          value={tileMoney(fmt, over90?.amount ?? 0)}
          valueTitle={fmt.money(over90?.amount ?? 0)}
          tone={(over90?.amount ?? 0) > 0 ? 'danger' : 'default'}
          hint={t('dashboard.aging.count', { count: over90?.count ?? 0 })}
          icon={<ShieldAlert />}
        />
        <KpiCard
          fetching={refreshing}
          label={t('dashboard.portfolio.concentration')}
          value={fmt.percent(concentration)}
          gauge={concentration}
          tone={concentration > 0.5 ? 'warning' : 'default'}
          hint={t('dashboard.portfolio.concentrationHint', { amount: fmt.money(top5) })}
          icon={<PieChart />}
        />
        <KpiCard
          fetching={refreshing}
          label={t('dashboard.portfolio.averageDebt')}
          value={tileMoney(fmt, averageDebt)}
          valueTitle={fmt.money(averageDebt)}
          hint={t('dashboard.portfolio.averageDebtHint')}
          icon={<Landmark />}
        />
      </KpiRow>

      <Card
        loading={refreshing}
        title={t('dashboard.aging.title')}
        subtitle={t('dashboard.aging.subtitle')}
      >
        <AgingStrip
          formatValue={fmt.money}
          formatCount={(count) => t('dashboard.aging.count', { count })}
          segments={aging.map((bucket, index) => ({
            key: bucket.key,
            label: t(`dashboard.aging.${bucket.key}`),
            amount: bucket.amount,
            count: bucket.count,
            color: `var(--aging-${index})`,
          }))}
        />
      </Card>

      <ConcentrationCard />

      <div className="grid gap-4 lg:grid-cols-12">
        <Card
          loading={refreshing}
          className="lg:col-span-4"
          title={t('dashboard.statusMix.title')}
          subtitle={t('dashboard.statusMix.subtitle')}
        >
          <DonutChart
            centerLabel={t('dashboard.statusMix.total')}
            formatValue={fmt.number}
            slices={(['pending', 'partial', 'overdue', 'paid'] as ReceivableStatus[]).map(
              (status) => ({
                key: status,
                label: t(`status.${status}`),
                value: byStatus[status].count,
                color: STATUS_COLORS[status],
              }),
            )}
          />
        </Card>
        <Card
          loading={refreshing}
          className="lg:col-span-4"
          title={t('dashboard.portfolio.risk.title')}
          subtitle={t('dashboard.portfolio.risk.subtitle')}
          actions={
            <Link
              to="/customers?risk=high"
              className="text-xs font-medium text-primary-ink hover:underline"
            >
              {t('dashboard.portfolio.risk.viewHigh')}
            </Link>
          }
        >
          {rated === 0 ? (
            <EmptyState compact title={t('dashboard.portfolio.risk.empty')} />
          ) : (
            <DonutChart
              centerLabel={t('dashboard.portfolio.risk.center')}
              formatValue={fmt.number}
              slices={(['low', 'medium', 'high'] as RiskLevel[]).map((risk) => ({
                key: risk,
                label: t(`risk.${risk}`),
                value: riskDistribution[risk],
                color: RISK_COLORS[risk],
              }))}
            />
          )}
        </Card>
        <Card
          loading={refreshing}
          data-tour="debtors"
          className="lg:col-span-4"
          title={t('dashboard.debtors.title')}
          subtitle={t('dashboard.debtors.subtitle')}
        >
          {topDebtors.length === 0 ? (
            <EmptyState compact title={t('dashboard.debtors.empty')} />
          ) : (
            <RankingBars
              formatValue={fmt.money}
              highlightLabel={t('dashboard.debtors.overdue')}
              baseLabel={t('dashboard.debtors.current')}
              items={topDebtors.map((debtor) => ({
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
          title={t('dashboard.portfolio.table.title')}
          subtitle={t('dashboard.portfolio.table.subtitle')}
        >
          <StatusTable summary={summary} />
        </Card>
        <MonthlyReportCard report={summary.latestMonthlyReport} />
      </div>
    </>
  );
}
