import { Alert, KpiCard, KpiRow, useErrorText } from '@/ui';
import type { PeriodRange } from '../../components/dashboard/period';
import { PeriodPicker } from '../../components/dashboard/PeriodPicker';
import { PaymentMethodMark } from '../../components/domain/PaymentMethods';
import { usePurchasesDashboard } from '../../hooks/queries';
import { useI18n, type TranslationKey } from '../../i18n/I18nProvider';
import { fillDays, tileMoney } from './metrics';
import { Answer } from './parts';
import { DayBars, InsightCard, RankedList } from './insightParts';

const relative = (value: number, previous: number) =>
  previous === 0 ? null : (value - previous) / Math.abs(previous);

/**
 * "Compras": what the business bought in a range and how it compares with the range before, per
 * day, from which suppliers, which products and how it was paid.
 */
export function PurchasesView({
  range,
  onRangeChange,
}: {
  range: PeriodRange;
  onRangeChange: (range: PeriodRange) => void;
}) {
  const { t, fmt } = useI18n();
  const errors = useErrorText();
  const query = usePurchasesDashboard(range);
  const data = query.data;
  const loading = query.isLoading;
  const totals = data?.totals;
  const unit = (value: string) => t(`products.unitsShort.${value}` as TranslationKey);
  const days = data
    ? fillDays(data.byDay, data.period.from, data.period.to, (date) => ({
        date,
        purchases: 0,
        total: 0,
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
          totals && totals.purchases > 0
            ? t('dashboard.purchases.answer', {
                total: fmt.money(totals.total),
                purchases: totals.purchases,
              })
            : t('dashboard.purchases.answerEmpty')
        }
      />
      <KpiRow>
        <KpiCard
          label={t('dashboard.purchases.kpis.bought')}
          value={tileMoney(fmt, totals?.total ?? 0)}
          tone="warning"
          delta={data ? relative(data.totals.total, data.previous.total) : null}
          deltaLabel={t('dashboard.sales.vsPrevious')}
          higherIsBetter={false}
          loading={loading}
        />
        <KpiCard
          label={t('dashboard.purchases.kpis.purchases')}
          value={fmt.number(totals?.purchases ?? 0)}
          delta={data ? relative(data.totals.purchases, data.previous.purchases) : null}
          deltaLabel={t('dashboard.sales.vsPrevious')}
          loading={loading}
        />
        <KpiCard
          label={t('dashboard.purchases.kpis.average')}
          value={fmt.money(totals?.average ?? 0)}
          loading={loading}
        />
        <KpiCard
          label={t('dashboard.purchases.kpis.suppliers')}
          value={fmt.number(totals?.suppliers ?? 0)}
          loading={loading}
        />
      </KpiRow>

      <InsightCard
        title={t('dashboard.purchases.byDay')}
        hint={t('dashboard.purchases.byDayHint')}
        loading={loading}
      >
        <DayBars
          days={days}
          series={[{ key: 'total', label: t('dashboard.purchases.kpis.bought'), color: 'series2' }]}
        />
      </InsightCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <InsightCard
          title={t('dashboard.purchases.suppliers')}
          hint={t('dashboard.purchases.suppliersHint')}
          loading={loading}
        >
          <RankedList
            empty={t('dashboard.purchases.empty')}
            color="var(--chart-2)"
            items={(data?.topSuppliers ?? []).map((row) => ({
              key: row.supplierId ?? 'none',
              label: row.name ?? t('purchases.noSupplier'),
              detail: t('dashboard.purchases.count', { count: row.purchases }),
              value: row.total,
            }))}
          />
        </InsightCard>
        <InsightCard
          title={t('dashboard.purchases.products')}
          hint={t('dashboard.purchases.productsHint')}
          loading={loading}
        >
          <RankedList
            empty={t('dashboard.purchases.empty')}
            color="var(--chart-1)"
            items={(data?.topProducts ?? []).map((row) => ({
              key: row.productId,
              label: row.name,
              detail: `${fmt.number(row.quantity)} ${unit(row.unit)}`,
              value: row.total,
            }))}
          />
        </InsightCard>
        <InsightCard
          title={t('dashboard.purchases.methods')}
          hint={t('dashboard.purchases.methodsHint')}
          loading={loading}
        >
          <RankedList
            empty={t('dashboard.purchases.noMethods')}
            color="var(--chart-3)"
            items={(data?.byMethod ?? []).map((row) => ({
              key: row.method,
              label: t(`methods.${row.method}`),
              mark: <PaymentMethodMark method={row.method} size="sm" />,
              detail: t('dashboard.purchases.count', { count: row.purchases }),
              value: row.amount,
            }))}
          />
        </InsightCard>
      </div>
    </>
  );
}
