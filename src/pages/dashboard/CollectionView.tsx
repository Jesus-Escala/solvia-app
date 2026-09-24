import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  FilePlus2,
  Filter,
  Undo2,
  HandCoins,
  MousePointerClick,
  Table2,
  Target,
  Timer,
  X,
} from 'lucide-react';
import { useState } from 'react';
import {
  Alert,
  Button,
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
import {
  fromIso,
  toIso,
  type Granularity,
  type PeriodRange,
} from '../../components/dashboard/period';
import { PeriodPicker } from '../../components/dashboard/PeriodPicker';
import { CustomerPicker } from '../../components/domain/CustomerPicker';
import { useDashboardAnalytics } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { DashboardAnalytics, PaymentMethod } from '../../lib/types';
import { change, METHOD_COLORS, pointsChange, tileMoney, formatPoints } from './metrics';
import { Answer, Section } from './parts';

/** Cross-filters of the collection view (null = not filtering by that dimension). */
export interface CollectionFilters {
  method: PaymentMethod | null;
  customerId: string | null;
  weekday: number | null;
}

const METHODS: PaymentMethod[] = ['yape', 'plin', 'cash', 'bank_transfer'];
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * The filters, always in the same place and order, as plain dropdowns: payment method, customer
 * and weekday. Clicking a slice, a day or a payer in the charts below sets the same filters.
 * Method and weekday only apply to payments, which the note says when one is active.
 */
function FilterBar({
  filters,
  customerName,
  weekdayName,
  onChange,
}: {
  filters: CollectionFilters;
  customerName: string;
  weekdayName: (weekday: number) => string;
  onChange: (changes: Partial<CollectionFilters>) => void;
}) {
  const { t } = useI18n();
  const count = [filters.method, filters.customerId, filters.weekday].filter(Boolean).length;
  const active = count > 0;
  // Phones: the three fields fold behind one "Filtrar" button to keep the answer and the KPIs in
  // view; wider screens always show them.
  const [expanded, setExpanded] = useState(false);
  const selectClass = (on: boolean) =>
    cx('input h-10 min-w-0', on && 'border-primary bg-primary-soft/50 font-medium');

  return (
    <div
      className={cx(
        'rounded-xl border p-3 transition',
        active ? 'border-primary/30 bg-primary-soft/30' : 'border-line bg-surface',
      )}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-2 text-left text-sm font-semibold sm:hidden"
      >
        <Filter className="h-4 w-4 text-primary-ink" />
        <span className="flex-1">{t('dashboard.filters.toggle')}</span>
        {active && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-on-primary">
            {count}
          </span>
        )}
        <ChevronDown className={cx('h-4 w-4 text-muted transition', expanded && 'rotate-180')} />
      </button>
      <div
        className={cx(
          'grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.4fr_1fr_auto] lg:items-end',
          expanded ? 'max-sm:mt-3' : 'max-sm:hidden',
        )}
      >
        <label className="block min-w-0">
          <span className="label flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            {t('dashboard.filters.method')}
          </span>
          <select
            className={selectClass(!!filters.method)}
            value={filters.method ?? ''}
            onChange={(event) =>
              onChange({ method: (event.target.value || null) as PaymentMethod | null })
            }
          >
            <option value="">{t('dashboard.filters.allMethods')}</option>
            {METHODS.map((method) => (
              <option key={method} value={method}>
                {t(`methods.${method}`)}
              </option>
            ))}
          </select>
        </label>
        <div className="min-w-0">
          <span className="label">{t('dashboard.filters.customer')}</span>
          <CustomerPicker
            value={
              filters.customerId
                ? { id: filters.customerId, name: customerName, phone: null, outstanding: null }
                : null
            }
            onChange={(customer) => onChange({ customerId: customer?.id ?? null })}
          />
        </div>
        <label className="block min-w-0">
          <span className="label">{t('dashboard.filters.weekday')}</span>
          <select
            className={selectClass(!!filters.weekday)}
            value={filters.weekday ?? ''}
            onChange={(event) => onChange({ weekday: Number(event.target.value) || null })}
          >
            <option value="">{t('dashboard.filters.allDays')}</option>
            {WEEKDAYS.map((weekday) => (
              <option key={weekday} value={weekday}>
                {capitalize(weekdayName(weekday))}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="ghost"
          icon={<X className="h-4 w-4" />}
          disabled={!active}
          onClick={() => onChange({ method: null, customerId: null, weekday: null })}
        >
          {t('dashboard.filters.clear')}
        </Button>
      </div>
      <p
        className={cx(
          'mt-2 flex items-start gap-1.5 text-xs text-muted',
          !expanded && 'max-sm:hidden',
        )}
      >
        <MousePointerClick className="mt-px h-3.5 w-3.5 shrink-0" />
        {filters.method || filters.weekday
          ? t('dashboard.filters.scopeNote')
          : t('dashboard.filters.hint')}
      </p>
    </div>
  );
}

/** Period KPIs, each compared with the previous period of the same length. */
function PeriodKpis({
  analytics,
  loading,
  fetching,
  filters,
}: {
  analytics?: DashboardAnalytics;
  loading: boolean;
  fetching: boolean;
  filters: CollectionFilters;
}) {
  const { t, fmt } = useI18n();
  // Receivable KPIs ignore the payment-only filters.
  const paymentOnly = !!(filters.method || filters.weekday);
  const notFiltered = t('dashboard.filters.notFiltered');
  // Receivable KPIs still follow the customer filter.
  const receivableNote = filters.customerId ? t('dashboard.filters.customerOnly') : notFiltered;
  if (loading || !analytics) {
    return (
      <KpiRow>
        {Array.from({ length: 4 }, (_, index) => (
          <KpiCard key={index} label="" value="" loading />
        ))}
      </KpiRow>
    );
  }
  const { kpis } = analytics;
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
        info={t('dashboard.analytics.info.collected')}
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
        info={t('dashboard.analytics.info.issued')}
        value={tileMoney(fmt, kpis.issued.value ?? 0)}
        valueTitle={fmt.money(kpis.issued.value ?? 0)}
        delta={change(kpis.issued)}
        formatPercent={fmt.percent}
        hint={
          paymentOnly
            ? receivableNote
            : t('dashboard.analytics.kpi.issuedHint', {
                count: fmt.number(kpis.receivablesIssued.value ?? 0),
              })
        }
        icon={<FilePlus2 />}
      />
      <KpiCard
        fetching={fetching}
        label={t('dashboard.analytics.kpi.collectionRate')}
        info={t('dashboard.analytics.info.collectionRate')}
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
          paymentOnly
            ? receivableNote
            : rate.value === null
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
        info={t('dashboard.analytics.info.daysToPay')}
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
    </KpiRow>
  );
}

export function CollectionView({
  range,
  granularity,
  onRangeChange,
  onGranularityChange,
  filters,
  onFiltersChange,
}: {
  range: PeriodRange;
  granularity: Granularity;
  onRangeChange: (range: PeriodRange) => void;
  onGranularityChange: (granularity: Granularity) => void;
  filters: CollectionFilters;
  onFiltersChange: (changes: Partial<CollectionFilters>) => void;
}) {
  const { t, fmt, locale } = useI18n();
  const colors = useChartColors();
  const errors = useErrorText();
  const [view, setView] = useState<'chart' | 'table'>('chart');
  // Drill-down trail: the ranges we zoomed in from. Only valid while the current range is the
  // one we drilled into (picking another period from the picker leaves the trail behind).
  const [trail, setTrail] = useState<{ stack: PeriodRange[]; at: PeriodRange } | null>(null);
  const activeTrail =
    trail && trail.at.from === range.from && trail.at.to === range.to ? trail.stack : [];
  const drillInto = (bucket: string) => {
    if (granularity === 'day') return;
    const start = fromIso(bucket);
    const end =
      granularity === 'month'
        ? new Date(start.getFullYear(), start.getMonth() + 1, 0)
        : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    const today = new Date();
    const next = { from: toIso(start), to: toIso(end > today ? today : end) };
    setTrail({ stack: [...activeTrail, range], at: next });
    onRangeChange(next);
  };
  const drillBack = (index: number) => {
    const target = activeTrail[index]!;
    const stack = activeTrail.slice(0, index);
    setTrail(stack.length > 0 ? { stack, at: target } : null);
    onRangeChange(target);
  };
  const rangeLabel = (value: PeriodRange) =>
    value.from === value.to
      ? fmt.date(value.from)
      : `${fmt.shortDate(value.from)} – ${fmt.shortDate(value.to)}`;
  const analytics = useDashboardAnalytics({
    ...range,
    granularity,
    method: filters.method ?? undefined,
    customerId: filters.customerId ?? undefined,
    weekday: filters.weekday ?? undefined,
  });
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
  // The view's answer in one sentence: how much, how many payments and the change vs before.
  const collectedMetric = data?.kpis.collected;
  const delta = change(collectedMetric);
  const answer = data
    ? [
        t('dashboard.answers.collected', {
          from: fmt.shortDate(data.period.from),
          to: fmt.shortDate(data.period.to),
          amount: fmt.money(collectedMetric?.value ?? 0),
          count: data.kpis.payments.value ?? 0,
        }),
        delta === null
          ? ''
          : t(delta >= 0 ? 'dashboard.answers.more' : 'dashboard.answers.less', {
              percent: fmt.percent(Math.abs(delta)),
            }),
      ]
        .filter(Boolean)
        .join(' ')
    : '';
  // Clicking the selected option again removes that filter.
  const toggle = <K extends keyof CollectionFilters>(key: K, value: CollectionFilters[K]) =>
    onFiltersChange({ [key]: filters[key] === value ? null : value });
  const customerName =
    data?.filters.customer?.name ??
    data?.topPayers.find((payer) => payer.customerId === filters.customerId)?.name ??
    t('dashboard.filters.customer');

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
      <Answer loading={!data} text={answer} />
      <FilterBar
        filters={filters}
        customerName={customerName}
        weekdayName={weekdayName}
        onChange={onFiltersChange}
      />
      <PeriodKpis analytics={data} loading={loading} fetching={fetching} filters={filters} />

      <div className="grid gap-4 lg:grid-cols-12">
        <Card
          loading={fetching}
          expandable
          info={t('dashboard.analytics.info.chart')}
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
                { value: 'chart', label: t('dashboard.analytics.chart'), icon: <BarChart3 /> },
                { value: 'table', label: t('dashboard.analytics.table'), icon: <Table2 /> },
              ]}
            />
          }
        >
          {activeTrail.length > 0 && (
            <nav
              aria-label={t('dashboard.analytics.drillTrail')}
              className="mb-3 flex flex-wrap items-center gap-1 text-xs"
            >
              <button
                type="button"
                onClick={() => drillBack(activeTrail.length - 1)}
                className="mr-1 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 font-semibold text-primary-ink transition hover:bg-primary hover:text-on-primary"
              >
                <Undo2 className="h-3.5 w-3.5" />
                {t('dashboard.analytics.drillBack')}
              </button>
              {activeTrail.map((step, index) => (
                <span key={index} className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => drillBack(index)}
                    className="rounded-md px-1.5 py-0.5 text-muted hover:bg-surface-3 hover:text-ink"
                  >
                    {rangeLabel(step)}
                  </button>
                  <ChevronRight className="h-3 w-3 text-subtle" />
                </span>
              ))}
              <span className="rounded-md bg-surface-3 px-1.5 py-0.5 font-semibold text-ink">
                {rangeLabel(range)}
              </span>
            </nav>
          )}
          {data ? (
            <PeriodChart
              series={data.series}
              granularity={data.period.granularity}
              view={view}
              onBucketClick={data.period.granularity === 'day' ? undefined : drillInto}
              exportName={`solvia-cobranza-${range.from}-${range.to}`}
            />
          ) : (
            <Skeleton className="h-[300px] w-full" />
          )}
        </Card>
        <Card
          loading={fetching}
          className="lg:col-span-4"
          expandable
          info={t('dashboard.analytics.info.methods')}
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
              selectedKey={filters.method}
              onSelect={(key) => toggle('method', key as PaymentMethod)}
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
          expandable
          info={t('dashboard.analytics.info.weekday')}
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
            <WeekdayBars
              days={data.byWeekday}
              selected={filters.weekday}
              onSelect={(weekday) => toggle('weekday', weekday)}
            />
          )}
        </Card>
        <Card
          loading={fetching}
          className="lg:col-span-7"
          expandable
          info={t('dashboard.analytics.info.payers')}
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
              selectedId={filters.customerId}
              onSelect={(id) => toggle('customerId', id)}
              openLabel={t('dashboard.filters.openCustomer')}
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
  const failed = reminders.failed.value ?? 0;
  const paid = effectiveness === null ? 0 : Math.round(sent * effectiveness);
  const funnel = [
    { key: 'attempted', value: sent + failed, tone: 'bg-primary/35' },
    { key: 'delivered', value: sent, tone: 'bg-primary/70' },
    { key: 'paid', value: paid, tone: 'bg-success' },
  ] as const;

  return (
    <Card
      loading={loading}
      title={t('dashboard.analytics.reminders.title')}
      subtitle={t('dashboard.analytics.reminders.subtitle')}
      info={t('dashboard.analytics.info.reminders')}
    >
      {/* Funnel: every step is a subset of the previous one */}
      <ol className="mb-5 space-y-1.5" aria-label={t('dashboard.analytics.reminders.funnel')}>
        {funnel.map((step, index) => {
          const base = funnel[0].value || 1;
          const share = step.value / base;
          return (
            <li key={step.key} className="flex items-center gap-3 text-sm">
              <span className="w-40 shrink-0 truncate text-muted">
                {t(`dashboard.analytics.reminders.steps.${step.key}`)}
              </span>
              <div className="flex h-7 flex-1 items-center">
                <div
                  className={cx(
                    'flex h-full items-center justify-end rounded-lg px-2 text-xs font-semibold text-ink transition-[width] duration-700',
                    step.tone,
                    index === 2 && 'text-white',
                  )}
                  style={{ width: `${Math.max(share * 100, 6)}%` }}
                >
                  {fmt.number(step.value)}
                </div>
              </div>
              <span className="w-12 shrink-0 text-right text-xs text-subtle tabular-nums">
                {index === 0 ? '' : fmt.percent(share)}
              </span>
            </li>
          );
        })}
      </ol>
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
