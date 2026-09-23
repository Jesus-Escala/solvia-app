import { FilePlus2, HandCoins, ReceiptText, Target, Timer, UserPlus } from 'lucide-react';
import { useState } from 'react';
import {
  Alert,
  Card,
  cx,
  DonutChart,
  EmptyState,
  KpiCard,
  KpiRow,
  RankingBars,
  SegmentedControl,
  Skeleton,
  useChartColors,
  useErrorText,
} from '@/ui';
import { PeriodChart } from '../../components/charts/PeriodChart';
import { WeekdayBars } from '../../components/charts/WeekdayBars';
import type { Granularity, PeriodRange } from '../../components/dashboard/period';
import { PeriodPicker } from '../../components/dashboard/PeriodPicker';
import { useDashboardAnalytics } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { DashboardAnalytics } from '../../lib/types';
import { change, METHOD_COLORS, pointsChange, tileMoney, formatPoints } from './metrics';
import { Section } from './parts';

/** Period KPIs, each compared with the previous period of the same length. */
function PeriodKpis({
  analytics,
  loading,
  fetching,
}: {
  analytics?: DashboardAnalytics;
  loading: boolean;
  fetching: boolean;
}) {
  const { t, fmt } = useI18n();
  if (loading || !analytics) {
    return (
      <KpiRow>
        {Array.from({ length: 6 }, (_, index) => (
          <KpiCard key={index} label="" value="" loading />
        ))}
      </KpiRow>
    );
  }
  const { kpis, snapshot } = analytics;
  const vs = t('dashboard.analytics.kpi.vsPrevious');
  const rate = kpis.collectionRate;
  // Rates compare in percentage points (62% → 70% = +8 pts), not as a relative change.
  const rateDelta = pointsChange(rate);
  const days = kpis.averageDaysToPay;

  return (
    <KpiRow>
      <KpiCard
        fetching={fetching}
        label={t('dashboard.analytics.kpi.collected')}
        value={tileMoney(fmt, kpis.collected.value ?? 0)}
        valueTitle={fmt.money(kpis.collected.value ?? 0)}
        tone="success"
        delta={change(kpis.collected)}
        deltaLabel={vs}
        formatPercent={fmt.percent}
        hint={t('dashboard.analytics.kpi.collectedHint', {
          count: fmt.number(kpis.payments.value ?? 0),
          average: fmt.money(kpis.averagePayment.value ?? 0),
        })}
        icon={<HandCoins />}
      />
      <KpiCard
        fetching={fetching}
        label={t('dashboard.analytics.kpi.issued')}
        value={tileMoney(fmt, kpis.issued.value ?? 0)}
        valueTitle={fmt.money(kpis.issued.value ?? 0)}
        delta={change(kpis.issued)}
        formatPercent={fmt.percent}
        hint={t('dashboard.analytics.kpi.issuedHint', {
          count: fmt.number(kpis.receivablesIssued.value ?? 0),
        })}
        icon={<FilePlus2 />}
      />
      <KpiCard
        fetching={fetching}
        label={t('dashboard.analytics.kpi.collectionRate')}
        value={rate.value === null ? '—' : fmt.percent(rate.value)}
        gauge={rate.value ?? 0}
        tone={
          rate.value === null
            ? 'default'
            : rate.value >= 0.8
              ? 'success'
              : rate.value < 0.5
                ? 'danger'
                : 'warning'
        }
        delta={rateDelta}
        formatPercent={formatPoints}
        hint={
          rate.value === null
            ? t('dashboard.analytics.kpi.collectionRateEmpty')
            : t('dashboard.analytics.kpi.collectionRateHint', {
                amount: fmt.money(kpis.dueInPeriod.value ?? 0),
              })
        }
        icon={<Target />}
      />
      <KpiCard
        fetching={fetching}
        label={t('dashboard.analytics.kpi.daysToPay')}
        value={
          days.value === null
            ? '—'
            : t('dashboard.analytics.kpi.daysToPayValue', { days: Math.round(days.value) })
        }
        delta={change(days)}
        higherIsBetter={false}
        formatPercent={fmt.percent}
        hint={t('dashboard.analytics.kpi.daysToPayHint')}
        icon={<Timer />}
      />
      <KpiCard
        fetching={fetching}
        label={t('dashboard.analytics.series.payments')}
        value={fmt.number(kpis.payments.value ?? 0)}
        delta={change(kpis.payments)}
        formatPercent={fmt.percent}
        hint={t('dashboard.analytics.kpi.collectedHint', {
          count: fmt.number(kpis.payments.value ?? 0),
          average: fmt.money(kpis.averagePayment.value ?? 0),
        })}
        icon={<ReceiptText />}
      />
      <KpiCard
        fetching={fetching}
        label={t('dashboard.analytics.kpi.newCustomers')}
        value={fmt.number(kpis.newCustomers.value ?? 0)}
        delta={change(kpis.newCustomers)}
        formatPercent={fmt.percent}
        hint={t('dashboard.analytics.kpi.newCustomersHint', {
          total: fmt.number(snapshot.customers),
        })}
        icon={<UserPlus />}
      />
    </KpiRow>
  );
}

export function CollectionView({
  range,
  granularity,
  onRangeChange,
  onGranularityChange,
}: {
  range: PeriodRange;
  granularity: Granularity;
  onRangeChange: (range: PeriodRange) => void;
  onGranularityChange: (granularity: Granularity) => void;
}) {
  const { t, fmt, locale } = useI18n();
  const colors = useChartColors();
  const errors = useErrorText();
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const analytics = useDashboardAnalytics({ ...range, granularity });
  const data = analytics.data;
  const loading = analytics.isLoading;
  // Changing the period keeps the previous numbers on screen and shows the spinners over them.
  const fetching = analytics.isFetching && !analytics.isLoading;
  const collected = data?.kpis.collected.value ?? 0;
  const bestDay = data?.byWeekday.reduce(
    (top, day) => (day.amount > top.amount ? day : top),
    data.byWeekday[0]!,
  );
  const reminders = data?.reminders;
  const weekdayName = (weekday: number) =>
    new Intl.DateTimeFormat(locale === 'es' ? 'es-PE' : 'en-US', { weekday: 'long' }).format(
      new Date(2024, 0, weekday),
    );

  return (
    <Section
      title={t('dashboard.sections.period')}
      hint={t('dashboard.sections.periodHint')}
      data-tour="period"
      actions={
        <PeriodPicker
          range={range}
          granularity={granularity}
          onRangeChange={onRangeChange}
          onGranularityChange={onGranularityChange}
          previous={data?.period.previous}
        />
      }
    >
      {analytics.error && <Alert tone="danger">{errors.message(analytics.error)}</Alert>}
      <PeriodKpis analytics={data} loading={loading} fetching={fetching} />

      <div className="grid gap-4 lg:grid-cols-12">
        <Card
          loading={fetching}
          className="lg:col-span-8"
          title={t('dashboard.analytics.chartTitle')}
          subtitle={t('dashboard.analytics.chartSubtitle', {
            unit: t(`dashboard.period.granularities.${granularity}`).toLowerCase(),
          })}
          actions={
            <SegmentedControl
              label={t('dashboard.analytics.view')}
              value={view}
              onChange={setView}
              options={[
                { value: 'chart', label: t('dashboard.analytics.chart') },
                { value: 'table', label: t('dashboard.analytics.table') },
              ]}
            />
          }
        >
          {data ? (
            <PeriodChart series={data.series} granularity={data.period.granularity} view={view} />
          ) : (
            <Skeleton className="h-[300px] w-full" />
          )}
        </Card>
        <Card
          loading={fetching}
          className="lg:col-span-4"
          title={t('dashboard.analytics.methods.title')}
          subtitle={t('dashboard.analytics.methods.subtitle')}
        >
          {!data ? (
            <Skeleton className="h-[200px] w-full" />
          ) : collected === 0 ? (
            <EmptyState compact title={t('dashboard.analytics.methods.empty')} />
          ) : (
            <DonutChart
              centerLabel={t('dashboard.analytics.methods.center')}
              formatValue={fmt.compactMoney}
              slices={data.byMethod.map((item) => ({
                key: item.method,
                label: t(`methods.${item.method}`),
                value: item.amount,
                color: colors[METHOD_COLORS[item.method]],
              }))}
            />
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card
          loading={fetching}
          className="lg:col-span-5"
          title={t('dashboard.analytics.weekday.title')}
          subtitle={
            data && collected > 0 && bestDay
              ? t('dashboard.analytics.weekday.best', { day: weekdayName(bestDay.weekday) })
              : t('dashboard.analytics.weekday.subtitle')
          }
        >
          {!data ? (
            <Skeleton className="h-[210px] w-full" />
          ) : collected === 0 ? (
            <EmptyState compact title={t('dashboard.analytics.weekday.empty')} />
          ) : (
            <WeekdayBars days={data.byWeekday} />
          )}
        </Card>
        <Card
          loading={fetching}
          className="lg:col-span-7"
          title={t('dashboard.analytics.payers.title')}
          subtitle={t('dashboard.analytics.payers.subtitle')}
        >
          {!data ? (
            <Skeleton className="h-[210px] w-full" />
          ) : data.topPayers.length === 0 ? (
            <EmptyState compact title={t('dashboard.analytics.payers.empty')} />
          ) : (
            <RankingBars
              formatValue={fmt.money}
              baseLabel={t('dashboard.analytics.payers.base')}
              highlightLabel=""
              items={data.topPayers.map((payer) => ({
                id: payer.customerId,
                label: payer.name,
                href: `/customers/${payer.customerId}`,
                value: payer.amount,
              }))}
            />
          )}
        </Card>
      </div>

      {reminders && <RemindersCard reminders={reminders} loading={fetching} />}
    </Section>
  );
}

/** Reminders sent in the period, failures, effectiveness and a breakdown by template type. */
function RemindersCard({
  reminders,
  loading,
}: {
  reminders: NonNullable<DashboardAnalytics['reminders']>;
  loading: boolean;
}) {
  const { t, fmt } = useI18n();
  const sent = reminders.sent.value ?? 0;
  const effectiveness = reminders.paidAfterReminder.value;
  const maxType = Math.max(...reminders.byType.map((item) => item.sent + item.failed), 1);

  return (
    <Card
      loading={loading}
      title={t('dashboard.analytics.reminders.title')}
      subtitle={t('dashboard.analytics.reminders.subtitle')}
    >
      <div className="grid gap-5 lg:grid-cols-12">
        <dl className="grid grid-cols-3 gap-3 lg:col-span-5">
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="text-[11px] text-muted">{t('dashboard.analytics.reminders.sent')}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{fmt.number(sent)}</dd>
            <DeltaText value={change(reminders.sent)} />
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="text-[11px] text-muted">{t('dashboard.analytics.reminders.failed')}</dt>
            <dd
              className={cx(
                'mt-1 text-lg font-semibold tabular-nums',
                (reminders.failed.value ?? 0) > 0 && 'text-danger-ink',
              )}
            >
              {fmt.number(reminders.failed.value ?? 0)}
            </dd>
            <DeltaText value={change(reminders.failed)} higherIsBetter={false} />
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <dt className="text-[11px] text-muted">
              {t('dashboard.analytics.reminders.effectiveness')}
            </dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">
              {effectiveness === null ? '—' : fmt.percent(effectiveness)}
            </dd>
            <p className="text-[10px] leading-tight text-subtle">
              {t('dashboard.analytics.reminders.effectivenessHint')}
            </p>
          </div>
        </dl>
        <ul
          className="space-y-2.5 lg:col-span-7"
          aria-label={t('dashboard.analytics.reminders.byType')}
        >
          {reminders.byType.map((item) => (
            <li key={item.type} className="text-sm">
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="truncate">{t(`templateTypes.${item.type}.title`)}</span>
                <span className="shrink-0 text-xs text-muted tabular-nums">
                  {fmt.number(item.sent)}
                  {item.failed > 0 && (
                    <span className="ml-1.5 text-danger-ink">
                      {t('dashboard.analytics.reminders.failedCount', { count: item.failed })}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-surface-3">
                <div className="bg-primary" style={{ width: `${(item.sent / maxType) * 100}%` }} />
                <div className="bg-danger" style={{ width: `${(item.failed / maxType) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/** Small "+12% vs previous period" line under a figure. */
function DeltaText({
  value,
  higherIsBetter = true,
}: {
  value: number | null;
  higherIsBetter?: boolean;
}) {
  const { t, fmt } = useI18n();
  if (value === null) return <p className="text-[10px] text-subtle">&nbsp;</p>;
  const good = value >= 0 ? higherIsBetter : !higherIsBetter;
  return (
    <p
      className={cx(
        'text-[10px] font-medium tabular-nums',
        good ? 'text-success-ink' : 'text-danger-ink',
      )}
    >
      {value >= 0 ? '+' : ''}
      {fmt.percent(value)} {t('dashboard.analytics.kpi.vsPrevious')}
    </p>
  );
}
