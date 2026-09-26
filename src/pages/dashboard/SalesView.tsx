import { Link } from 'react-router';
import { Alert, KpiCard, KpiRow, useErrorText } from '@/ui';
import type { PeriodRange } from '../../components/dashboard/period';
import { PeriodPicker } from '../../components/dashboard/PeriodPicker';
import { PaymentMethodMark } from '../../components/domain/PaymentMethods';
import { useSalesDashboard } from '../../hooks/queries';
import { useI18n, type TranslationKey } from '../../i18n/I18nProvider';
import { fillDays, tileMoney } from './metrics';
import { Answer } from './parts';
import { DayBars, HourBars, InsightCard, RankedList } from './insightParts';

const relative = (value: number, previous: number) =>
  previous === 0 ? null : (value - previous) / Math.abs(previous);

/**
 * "Ventas": what was sold in a range and how it compares with the range before, per day, the
 * best-selling products and the best customers, how it was paid, by category and by hour.
 */
export function SalesView({
  range,
  onRangeChange,
}: {
  range: PeriodRange;
  onRangeChange: (range: PeriodRange) => void;
}) {
  const { t, fmt } = useI18n();
  const errors = useErrorText();
  const query = useSalesDashboard(range);
  const data = query.data;
  const loading = query.isLoading;
  const totals = data?.totals;
  const unit = (value: string) => t(`products.unitsShort.${value}` as TranslationKey);

  const days = data
    ? fillDays(data.byDay, data.period.from, data.period.to, (date) => ({
        date,
        sales: 0,
        total: 0,
        cash: 0,
        credit: 0,
      }))
    : [];

  return (
    <>
      <PeriodPicker
        range={range}
        granularity={null}
        onRangeChange={onRangeChange}
        onGranularityChange={null}
        {...(data && { previous: data.previousPeriod })}
      />
      {query.error && <Alert tone="danger">{errors.message(query.error)}</Alert>}
      <Answer
        loading={loading}
        text={
          totals && totals.sales > 0
            ? t('dashboard.sales.answer', {
                total: fmt.money(totals.total),
                sales: totals.sales,
                average: fmt.money(totals.average),
              })
            : t('dashboard.sales.answerEmpty')
        }
      />
      <KpiRow>
        <KpiCard
          label={t('dashboard.sales.kpis.sold')}
          value={tileMoney(fmt, totals?.total ?? 0)}
          tone="success"
          delta={data ? relative(data.totals.total, data.previous.total) : null}
          deltaLabel={t('dashboard.sales.vsPrevious')}
          loading={loading}
        />
        <KpiCard
          label={t('dashboard.sales.kpis.sales')}
          value={fmt.number(totals?.sales ?? 0)}
          delta={data ? relative(data.totals.sales, data.previous.sales) : null}
          deltaLabel={t('dashboard.sales.vsPrevious')}
          loading={loading}
        />
        <KpiCard
          label={t('dashboard.sales.kpis.average')}
          value={fmt.money(totals?.average ?? 0)}
          delta={data ? relative(data.totals.average, data.previous.average) : null}
          deltaLabel={t('dashboard.sales.vsPrevious')}
          loading={loading}
        />
        <KpiCard
          label={t('dashboard.sales.kpis.profit')}
          value={tileMoney(fmt, totals?.profit ?? 0)}
          hint={t('dashboard.sales.kpis.profitHint')}
          loading={loading}
        />
        <KpiCard
          label={t('dashboard.sales.kpis.credit')}
          value={tileMoney(fmt, totals?.credit ?? 0)}
          tone="warning"
          loading={loading}
        />
      </KpiRow>

      <InsightCard
        title={t('dashboard.sales.byDay')}
        hint={t('dashboard.sales.byDayHint')}
        loading={loading}
      >
        <DayBars
          days={days}
          series={[
            { key: 'cash', label: t('sales.types.cash'), color: 'series3' },
            { key: 'credit', label: t('sales.types.credit'), color: 'warning' },
          ]}
        />
      </InsightCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <InsightCard
          title={t('dashboard.sales.topProducts')}
          hint={t('dashboard.sales.topProductsHint')}
          loading={loading}
        >
          <RankedList
            empty={t('dashboard.sales.empty')}
            items={(data?.topProducts ?? []).map((row) => ({
              key: row.productId ?? row.name,
              label: row.name,
              detail: `${fmt.number(row.quantity)} ${unit(row.unit)} · ${t('dashboard.sales.inSales', { count: row.sales })}`,
              value: row.revenue,
            }))}
          />
        </InsightCard>
        <InsightCard
          title={t('dashboard.sales.topCustomers')}
          hint={t('dashboard.sales.topCustomersHint')}
          loading={loading}
        >
          <RankedList
            empty={t('dashboard.sales.noCustomers')}
            color="var(--chart-1)"
            items={(data?.topCustomers ?? []).map((row) => ({
              key: row.customerId ?? 'walk-in',
              label: row.customerId ? (
                <Link to={`/customers/${row.customerId}`} className="hover:underline">
                  {row.name}
                </Link>
              ) : (
                row.name
              ),
              detail: t('dashboard.sales.purchases', { count: row.sales }),
              value: row.total,
            }))}
          />
          {data?.walkIn && (
            <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
              {t('dashboard.sales.walkIn', {
                count: data.walkIn.sales,
                amount: fmt.money(data.walkIn.total),
              })}
            </p>
          )}
        </InsightCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <InsightCard
          title={t('dashboard.sales.methods')}
          hint={t('dashboard.sales.methodsHint')}
          loading={loading}
        >
          <RankedList
            empty={t('dashboard.sales.empty')}
            color="var(--chart-3)"
            items={(data?.byMethod ?? []).map((row) => ({
              key: row.method ?? 'credit',
              label: row.method ? t(`methods.${row.method}`) : t('sales.types.credit'),
              mark: row.method ? (
                <PaymentMethodMark method={row.method} size="sm" />
              ) : (
                <span className="h-5 w-5 shrink-0 rounded-md bg-warning-soft" />
              ),
              detail: t('dashboard.sales.inSales', { count: row.sales }),
              value: row.amount,
            }))}
          />
        </InsightCard>
        <InsightCard
          title={t('dashboard.sales.categories')}
          hint={t('dashboard.sales.categoriesHint')}
          loading={loading}
        >
          <RankedList
            empty={t('dashboard.sales.empty')}
            color="var(--chart-4)"
            items={(data?.byCategory ?? []).map((row) => ({
              key: row.categoryId ?? 'none',
              label: row.name ?? t('categories.none'),
              value: row.revenue,
            }))}
          />
        </InsightCard>
        <InsightCard
          title={t('dashboard.sales.hours')}
          hint={t('dashboard.sales.hoursHint')}
          loading={loading}
        >
          {data && data.byHour.length > 0 ? (
            <HourBars hours={data.byHour} />
          ) : (
            <p className="py-8 text-center text-sm text-muted">{t('dashboard.sales.empty')}</p>
          )}
        </InsightCard>
      </div>
    </>
  );
}
