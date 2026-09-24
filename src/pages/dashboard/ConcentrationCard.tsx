import { useQueryClient } from '@tanstack/react-query';
import { BarChart3, Download, Table2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import {
  Alert,
  Card,
  cx,
  downloadCsv,
  EmptyState,
  IconButton,
  SegmentedControl,
  Skeleton,
  useErrorText,
  useFeedback,
} from '@/ui';
import { ConcentrationChart } from '../../components/charts/ConcentrationChart';
import { ALL_DEBTORS, concentrationQuery, useDebtConcentration } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { ConcentrationClass, DebtConcentration } from '../../lib/types';

/** One hue, less weight from A to C; the letter always carries the class (never color alone). */
const CLASS_STYLES: Record<ConcentrationClass, string> = {
  A: 'bg-primary text-on-primary',
  B: 'bg-primary-soft text-primary-ink',
  C: 'bg-surface-3 text-muted',
};

function ClassBadge({ value }: { value: ConcentrationClass }) {
  return (
    <span
      className={cx(
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold',
        CLASS_STYLES[value],
      )}
    >
      {value}
    </span>
  );
}

function ClassCards({ data }: { data: DebtConcentration }) {
  const { t, fmt } = useI18n();
  return (
    <ul className="grid gap-2.5">
      {data.classes.map((item) => (
        <li key={item.key} className="rounded-xl border border-line bg-surface-2 p-3">
          <div className="flex items-center gap-2.5">
            <ClassBadge value={item.key} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {t('dashboard.concentration.classLabel', { key: item.key })}
              </p>
              <p className="truncate text-xs text-muted">
                {t(`dashboard.concentration.classes.${item.key}`)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-base font-semibold tabular-nums">
                {fmt.money(item.outstanding)}
              </p>
              <p className="text-xs text-muted tabular-nums">
                {t('dashboard.concentration.classShare', { share: fmt.percent(item.share) })}
              </p>
            </div>
          </div>
          <div
            className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-3"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${item.share * 100}%`, opacity: 1 - 0.3 * 'ABC'.indexOf(item.key) }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted tabular-nums">
            {t('dashboard.concentration.classDebtors', {
              count: item.debtors,
              share: fmt.percent(item.debtorShare),
            })}
          </p>
        </li>
      ))}
    </ul>
  );
}

function DebtorsTable({ data }: { data: DebtConcentration }) {
  const { t, fmt } = useI18n();
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">
        {t('dashboard.concentration.tableNote', { count: data.debtors.length })}
      </p>
      <div className="max-h-[340px] overflow-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface-2 text-[11px] tracking-wide text-muted uppercase">
            <tr>
              <th className="px-3 py-2 text-right font-semibold">
                {t('dashboard.concentration.table.rank')}
              </th>
              <th className="px-3 py-2 text-left font-semibold">
                {t('dashboard.concentration.table.customer')}
              </th>
              <th className="px-3 py-2 text-center font-semibold">
                {t('dashboard.concentration.table.class')}
              </th>
              <th className="px-3 py-2 text-right font-semibold">
                {t('dashboard.concentration.table.outstanding')}
              </th>
              <th className="px-3 py-2 text-right font-semibold max-sm:hidden">
                {t('dashboard.concentration.table.overdue')}
              </th>
              <th className="px-3 py-2 text-right font-semibold max-md:hidden">
                {t('dashboard.concentration.table.share')}
              </th>
              <th className="px-3 py-2 text-right font-semibold max-sm:hidden">
                {t('dashboard.concentration.table.cumulative')}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.debtors.map((debtor) => (
              <tr key={debtor.customerId} className="border-t border-line">
                <td className="px-3 py-2 text-right text-subtle tabular-nums">{debtor.rank}</td>
                <td className="max-w-[16rem] px-3 py-2">
                  <Link
                    to={`/customers/${debtor.customerId}`}
                    className="block truncate font-medium hover:underline"
                  >
                    {debtor.name}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <span className="flex justify-center">
                    <ClassBadge value={debtor.class} />
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">
                  {fmt.money(debtor.outstanding)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums max-sm:hidden">
                  {fmt.money(debtor.overdue)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums max-md:hidden">
                  {fmt.percent(debtor.share)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums max-sm:hidden">
                  {fmt.percent(debtor.cumulativeShare)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Pareto / ABC of the debtors: the concentration curve with classes A, B and C, or the ranked
 * list of the largest debtors. The export downloads every debtor, not only the ones listed.
 */
export function ConcentrationCard() {
  const { t, fmt } = useI18n();
  const errors = useErrorText();
  const { toast } = useFeedback();
  const queryClient = useQueryClient();
  const concentration = useDebtConcentration();
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [exporting, setExporting] = useState(false);
  const { data } = concentration;
  const classA = data?.classes.find((item) => item.key === 'A');

  const exportAll = async () => {
    setExporting(true);
    try {
      const all = await queryClient.fetchQuery(concentrationQuery(ALL_DEBTORS));
      downloadCsv(
        `solvia-deudores-abc-${all.generatedAt.slice(0, 10)}`,
        (
          [
            'rank',
            'customer',
            'class',
            'outstanding',
            'overdue',
            'receivables',
            'share',
            'cumulative',
          ] as const
        ).map((column) => t(`dashboard.concentration.table.${column}`)),
        all.debtors.map((debtor) => [
          debtor.rank,
          debtor.name,
          debtor.class,
          debtor.outstanding,
          debtor.overdue,
          debtor.receivables,
          fmt.percent(debtor.share),
          fmt.percent(debtor.cumulativeShare),
        ]),
      );
    } catch (error) {
      toast.apiError(error);
    } finally {
      setExporting(false);
    }
  };

  const hasDebt = !!data && data.totals.debtors > 0;

  return (
    <Card
      loading={concentration.isFetching && !concentration.isLoading}
      expandable
      info={t('dashboard.concentration.info')}
      title={t('dashboard.concentration.title')}
      subtitle={
        hasDebt && classA
          ? t('dashboard.concentration.headline', {
              share: fmt.percent(classA.debtorShare),
              count: fmt.number(classA.debtors),
              total: fmt.number(data.totals.debtors),
              threshold: fmt.percent(classA.share),
            })
          : t('dashboard.concentration.subtitle')
      }
      actions={
        hasDebt && (
          <>
            <SegmentedControl
              label={t('dashboard.analytics.view')}
              value={view}
              onChange={setView}
              options={[
                { value: 'chart', label: t('dashboard.analytics.chart'), icon: <BarChart3 /> },
                { value: 'table', label: t('dashboard.analytics.table'), icon: <Table2 /> },
              ]}
            />
            <IconButton
              label={t('dashboard.concentration.export')}
              onClick={() => void exportAll()}
              disabled={exporting}
            >
              <Download className={cx('h-4 w-4', exporting && 'animate-pulse')} />
            </IconButton>
          </>
        )
      }
    >
      {concentration.error ? (
        <Alert tone="danger">{errors.message(concentration.error)}</Alert>
      ) : !data ? (
        <Skeleton className="h-[260px] w-full" />
      ) : !hasDebt ? (
        <EmptyState compact title={t('dashboard.concentration.empty')} />
      ) : view === 'table' ? (
        <DebtorsTable data={data} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-7 xl:col-span-8">
            <ConcentrationChart data={data} />
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded bg-chart-1" aria-hidden="true" />
                {t('dashboard.concentration.curve')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="w-4 border-t-[1.5px] border-dashed"
                  style={{ borderColor: 'var(--chart-neutral)' }}
                  aria-hidden="true"
                />
                {t('dashboard.concentration.equal')}
              </span>
            </div>
          </div>
          <div className="lg:col-span-5 xl:col-span-4">
            <ClassCards data={data} />
          </div>
        </div>
      )}
    </Card>
  );
}
