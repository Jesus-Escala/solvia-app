import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  HandCoins,
  PackageSearch,
  ReceiptText,
  ShoppingBag,
  Tags,
  Truck,
  UserRound,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import {
  Alert,
  Badge,
  Button,
  cx,
  DataTable,
  KpiCard,
  KpiRow,
  Page,
  PageHeader,
  useErrorText,
  useUrlState,
  type DataTableColumn,
} from '@/ui';
import { isValidRange, presetRange, type PeriodRange } from '../components/dashboard/period';
import { PeriodPicker } from '../components/dashboard/PeriodPicker';
import { FileViewer, type ViewerKind, type ViewerRequest } from '../components/files/FileViewer';
import { useInsightTable, useReport } from '../hooks/queries';
import { api } from '../lib/api';
import { type Modules, useModules } from '../hooks/useModules';
import { useI18n, type TranslationKey } from '../i18n/I18nProvider';
import type {
  CollectionsByCustomerRow,
  InsightCell,
  InsightReportId,
  InsightTable,
  ReportId,
  ReportTypes,
  SalesByCustomerRow,
  SalesByProductRow,
  ShortageReportRow,
  StockReportRow,
  StockStatus,
} from '../lib/types';

type AnyReportId = ReportId | InsightReportId;

interface ReportDef {
  id: AnyReportId;
  icon: ReactNode;
  /** Business module the report needs. */
  module: 'sales' | 'catalog' | 'collections' | 'inventory';
  /** The stock report is a snapshot of today: no date range. */
  dated: boolean;
  /** Its columns, rows and figures come from the API (`/reports/:report/table`). */
  generic?: boolean;
}

/** The reports, in the order and groups the page shows them. */
const GROUPS: Array<{ title: TranslationKey; reports: ReportDef[] }> = [
  {
    title: 'reports.groups.sales',
    reports: [
      { id: 'sales-detail', icon: <ReceiptText />, module: 'sales', dated: true, generic: true },
      { id: 'sales-by-day', icon: <CalendarDays />, module: 'sales', dated: true, generic: true },
      { id: 'sales-by-product', icon: <ShoppingBag />, module: 'sales', dated: true },
      { id: 'sales-by-customer', icon: <UserRound />, module: 'sales', dated: true },
      { id: 'sales-by-category', icon: <Tags />, module: 'sales', dated: true, generic: true },
      { id: 'sales-by-method', icon: <Wallet />, module: 'sales', dated: true, generic: true },
      { id: 'sales-by-seller', icon: <Users />, module: 'sales', dated: true, generic: true },
    ],
  },
  {
    title: 'reports.groups.purchases',
    reports: [
      {
        id: 'purchases-detail',
        icon: <Warehouse />,
        module: 'inventory',
        dated: true,
        generic: true,
      },
      {
        id: 'purchases-by-supplier',
        icon: <Truck />,
        module: 'inventory',
        dated: true,
        generic: true,
      },
      {
        id: 'purchases-by-product',
        icon: <PackageSearch />,
        module: 'inventory',
        dated: true,
        generic: true,
      },
    ],
  },
  {
    title: 'reports.groups.collections',
    reports: [
      { id: 'collections-by-customer', icon: <HandCoins />, module: 'collections', dated: true },
    ],
  },
  {
    title: 'reports.groups.inventory',
    reports: [
      { id: 'stock', icon: <Boxes />, module: 'catalog', dated: false },
      { id: 'shortages', icon: <AlertTriangle />, module: 'sales', dated: true },
    ],
  },
];

const DASHBOARD_VIEWS = ['collection', 'portfolio', 'projection', 'summary'];
const DEFAULTS = { report: '', from: '', to: '' };

function availableGroups(modules: Modules) {
  return GROUPS.map((group) => ({
    ...group,
    reports: group.reports.filter((report) => modules[report.module]),
  })).filter((group) => group.reports.length > 0);
}

/** Report chooser: small labelled groups of buttons, all visible at once (they wrap on phones). */
function ReportChooser({
  groups,
  value,
  onChange,
}: {
  groups: ReturnType<typeof availableGroups>;
  value: AnyReportId;
  onChange: (report: AnyReportId) => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="flex flex-wrap gap-x-6 gap-y-2.5"
      role="radiogroup"
      aria-label={t('reports.choose')}
    >
      {groups.map((group) => (
        <div key={group.title} className="min-w-0">
          <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-subtle uppercase">
            {t(group.title)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {group.reports.map((report) => {
              const active = report.id === value;
              return (
                <button
                  key={report.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange(report.id)}
                  className={cx(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition sm:px-3 sm:py-1.5 sm:text-sm [&>svg]:h-3.5 [&>svg]:w-3.5 sm:[&>svg]:h-4 sm:[&>svg]:w-4',
                    active
                      ? 'border-primary bg-primary text-on-primary shadow-sm shadow-primary/30'
                      : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
                  )}
                >
                  {report.icon}
                  {t(`reports.names.${report.id}`)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Reports: plain tables to answer "who bought / paid how much", "what sold", "what stock do I
 * have" and "when did I sell without stock", for any date range; each one can be seen and
 * downloaded as PDF or Excel without leaving the page.
 * The charts live in the dashboard.
 */
export function ReportsPage() {
  const location = useLocation();
  const { t } = useI18n();
  const modules = useModules();
  const [state, update] = useUrlState(DEFAULTS);

  // Old links to the dashboard (/reports?view=…) keep working.
  const view = new URLSearchParams(location.search).get('view');
  if (view && DASHBOARD_VIEWS.includes(view)) {
    return <Navigate to={`/dashboard${location.search}`} replace />;
  }

  const groups = availableGroups(modules);
  const all = groups.flatMap((group) => group.reports);
  const current = all.find((report) => report.id === state.report) ?? all[0]!;

  const urlRange = { from: state.from, to: state.to };
  const range: PeriodRange = isValidRange(urlRange) ? urlRange : presetRange('thisMonth');

  return (
    <Page fill>
      <PageHeader title={t('reports.title')} description={t('reports.subtitle')} />
      {!modules.loading && (
        <>
          <ReportChooser
            groups={groups}
            value={current.id}
            onChange={(report) => update({ report })}
          />
          <ReportView
            key={current.id}
            report={current}
            range={range}
            onRangeChange={(value) => update({ from: value.from, to: value.to })}
          />
        </>
      )}
    </Page>
  );
}

function ReportView(props: {
  report: ReportDef;
  range: PeriodRange;
  onRangeChange: (range: PeriodRange) => void;
}) {
  return props.report.generic ? <InsightReportView {...props} /> : <TypedReportView {...props} />;
}

/** Dates, "Ver PDF" and "Ver Excel" of a report (the file opens in the in-page viewer). */
function ReportToolbar({
  report,
  range,
  onRangeChange,
  ready,
}: {
  report: ReportDef;
  range: PeriodRange;
  onRangeChange: (range: PeriodRange) => void;
  ready: boolean;
}) {
  const { t } = useI18n();
  const [viewing, setViewing] = useState<ViewerRequest | null>(null);
  const closeViewer = useCallback(() => setViewing(null), []);
  const view = (kind: ViewerKind) =>
    setViewing({
      kind,
      title: t(`reports.names.${report.id}`),
      fileName: `solvia-${report.id}.${kind}`,
      load: () =>
        api.file(`/reports/${report.id}/export`, {
          format: kind,
          ...(report.dated && { from: range.from, to: range.to }),
        }),
    });
  return (
    <>
      <p className="-mt-1 text-sm text-muted">{t(`reports.hints.${report.id}`)}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {report.dated ? (
          <PeriodPicker
            range={range}
            granularity={null}
            onRangeChange={onRangeChange}
            onGranularityChange={null}
          />
        ) : (
          <span />
        )}
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            variant="secondary"
            icon={<FileText className="h-4 w-4 text-danger-ink" />}
            disabled={!ready}
            onClick={() => view('pdf')}
          >
            {t('reports.viewPdf')}
          </Button>
          <Button
            variant="secondary"
            icon={<FileSpreadsheet className="h-4 w-4 text-success-ink" />}
            disabled={!ready}
            onClick={() => view('xlsx')}
          >
            {t('reports.viewExcel')}
          </Button>
        </div>
      </div>
      <FileViewer request={viewing} onClose={closeViewer} />
    </>
  );
}

interface InsightRow {
  key: string;
  cells: InsightCell[];
}

/**
 * A report whose columns come from the API: each column is text, an amount, a number or a
 * date, formatted here (amounts and numbers on the right). Its totals line is the last row.
 */
function InsightReportView({
  report,
  range,
  onRangeChange,
}: {
  report: ReportDef;
  range: PeriodRange;
  onRangeChange: (range: PeriodRange) => void;
}) {
  const { t, fmt } = useI18n();
  const errors = useErrorText();
  const query = useInsightTable(report.id as InsightReportId, range);
  const data: InsightTable | undefined = query.data;
  const format = (value: InsightCell, kind: InsightTable['columns'][number]['kind']) => {
    if (value === null || value === '') return <span className="text-subtle">—</span>;
    if (kind === 'money') return fmt.money(Number(value));
    if (kind === 'number') return fmt.number(Number(value));
    if (kind === 'date') return fmt.date(String(value));
    return String(value);
  };
  // The main amount (or the first one): bold, and on the right of each row on phones.
  const mainIndex = data?.columns.findIndex((column) => column.main) ?? -1;
  const firstAmount =
    mainIndex >= 0
      ? mainIndex
      : (data?.columns.findIndex((column) => column.kind === 'money') ?? -1);
  const columns: Array<DataTableColumn<InsightRow>> = (data?.columns ?? []).map(
    (column, index) => ({
      id: `c${index}`,
      header: column.header,
      ...(column.kind !== 'text' && { align: 'right' as const }),
      ...(index === 0 && { mobile: 'title' as const }),
      ...(index === firstAmount && { mobile: 'aside' as const }),
      ...(column.weight >= 4 && { minWidth: 240, maxWidth: 420 }),
      cell: (row) => {
        const content = format(row.cells[index] ?? null, column.kind);
        return row.key === 'totals' || index === firstAmount ? (
          <span className="font-semibold tabular-nums">{content}</span>
        ) : (
          content
        );
      },
      sortValue: (row) => row.cells[index] ?? null,
    }),
  );
  const rows: InsightRow[] | undefined = data && [
    ...data.rows.map((cells, index) => ({ key: String(index), cells })),
    ...(data.totals && data.rows.length > 0 ? [{ key: 'totals', cells: data.totals }] : []),
  ];

  return (
    <>
      <ReportToolbar
        report={report}
        range={range}
        onRangeChange={onRangeChange}
        ready={Boolean(data)}
      />
      <KpiRow>
        {(data?.kpis ?? [{ label: '', value: 0, kind: 'money', tone: 'default' }]).map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.kind === 'money' ? fmt.money(kpi.value) : fmt.number(kpi.value)}
            tone={kpi.tone}
            loading={query.isLoading}
          />
        ))}
      </KpiRow>
      <DataTable
        caption={t(`reports.names.${report.id}`)}
        columnsStorageKey={`report-${report.id}`}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.key}
        loading={query.isLoading}
        fetching={query.isFetching && !query.isLoading}
        error={query.error ? <Alert tone="danger">{errors.message(query.error)}</Alert> : undefined}
        empty={{ title: t('reports.empty'), description: data?.empty ?? '' }}
      />
    </>
  );
}

function TypedReportView({
  report,
  range,
  onRangeChange,
}: {
  report: ReportDef;
  range: PeriodRange;
  onRangeChange: (range: PeriodRange) => void;
}) {
  const { t } = useI18n();
  const errors = useErrorText();
  const id = report.id as ReportId;
  const query = useReport(id, report.dated ? range : null);
  const table = useReportTable(id, query.data);
  return (
    <>
      <ReportToolbar
        report={report}
        range={range}
        onRangeChange={onRangeChange}
        ready={Boolean(query.data)}
      />
      <KpiRow>
        {table.kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} loading={query.isLoading} />
        ))}
      </KpiRow>
      <DataTable
        caption={t(`reports.names.${report.id}`)}
        columnsStorageKey={`report-${report.id}`}
        columns={table.columns}
        rows={table.rows}
        rowKey={table.rowKey}
        loading={query.isLoading}
        fetching={query.isFetching && !query.isLoading}
        error={query.error ? <Alert tone="danger">{errors.message(query.error)}</Alert> : undefined}
        empty={{ title: t('reports.empty'), description: t(`reports.emptyHints.${id}`) }}
      />
    </>
  );
}

interface ReportTable {
  columns: Array<DataTableColumn<never>>;
  rows: never[] | undefined;
  rowKey: (row: never) => string;
  kpis: Array<{
    label: string;
    value: string;
    tone?: 'default' | 'danger' | 'success' | 'warning';
  }>;
}

/** Columns and headline figures of each report. */
function useReportTable<R extends ReportId>(
  report: R,
  data: ReportTypes[R] | undefined,
): ReportTable {
  const { t, fmt } = useI18n();
  const money = (value: number | null) => (value === null ? '—' : fmt.money(value));
  const qty = (value: number) => fmt.number(value);
  const walkIn = t('sales.walkIn');
  const unit = (value: string) => t(`products.unitsShort.${value}` as TranslationKey);

  const build = <Row,>(
    rows: Row[] | undefined,
    rowKey: (row: Row) => string,
    columns: Array<DataTableColumn<Row>>,
    kpis: ReportTable['kpis'],
  ): ReportTable => ({
    columns: columns as unknown as Array<DataTableColumn<never>>,
    rows: rows as never[] | undefined,
    rowKey: rowKey as (row: never) => string,
    kpis,
  });

  switch (report) {
    case 'sales-by-customer': {
      const d = data as ReportTypes['sales-by-customer'] | undefined;
      return build<SalesByCustomerRow>(
        d?.rows,
        (row) => row.customerId ?? 'walk-in',
        [
          {
            id: 'customer',
            header: t('reports.columns.customer'),
            mobile: 'title',
            minWidth: 180,
            cell: (row) => row.name ?? <span className="text-muted">{walkIn}</span>,
            sortValue: (row) => row.name ?? walkIn,
          },
          {
            id: 'total',
            header: t('reports.columns.sold'),
            align: 'right',
            mobile: 'aside',
            cell: (row) => <span className="font-semibold tabular-nums">{money(row.total)}</span>,
            sortValue: (row) => row.total,
          },
          {
            id: 'sales',
            header: t('reports.columns.sales'),
            align: 'right',
            cell: (row) => qty(row.sales),
            sortValue: (row) => row.sales,
          },
          {
            id: 'cash',
            header: t('reports.columns.cash'),
            align: 'right',
            cell: (row) => money(row.cash),
            sortValue: (row) => row.cash,
          },
          {
            id: 'credit',
            header: t('reports.columns.credit'),
            align: 'right',
            cell: (row) => money(row.credit),
            sortValue: (row) => row.credit,
          },
          {
            id: 'last',
            header: t('reports.columns.lastSale'),
            cell: (row) => fmt.date(row.lastSale),
            sortValue: (row) => row.lastSale,
          },
        ],
        [
          { label: t('reports.kpis.sold'), value: money(d?.totals.total ?? 0) },
          { label: t('reports.kpis.sales'), value: qty(d?.totals.sales ?? 0) },
          { label: t('reports.columns.cash'), value: money(d?.totals.cash ?? 0), tone: 'success' },
          {
            label: t('reports.columns.credit'),
            value: money(d?.totals.credit ?? 0),
            tone: 'warning',
          },
        ],
      );
    }
    case 'collections-by-customer': {
      const d = data as ReportTypes['collections-by-customer'] | undefined;
      const method = (
        key: 'yape' | 'plin' | 'cash' | 'bankTransfer',
        label: TranslationKey,
      ): DataTableColumn<CollectionsByCustomerRow> => ({
        id: key,
        header: t(label),
        align: 'right',
        cell: (row) => (row[key] ? money(row[key]) : <span className="text-subtle">—</span>),
        sortValue: (row) => row[key],
      });
      return build<CollectionsByCustomerRow>(
        d?.rows,
        (row) => row.customerId,
        [
          {
            id: 'customer',
            header: t('reports.columns.customer'),
            mobile: 'title',
            minWidth: 180,
            cell: (row) => row.name,
            sortValue: (row) => row.name,
          },
          {
            id: 'amount',
            header: t('reports.columns.collected'),
            align: 'right',
            mobile: 'aside',
            cell: (row) => <span className="font-semibold tabular-nums">{money(row.amount)}</span>,
            sortValue: (row) => row.amount,
          },
          {
            id: 'payments',
            header: t('reports.columns.payments'),
            align: 'right',
            cell: (row) => qty(row.payments),
            sortValue: (row) => row.payments,
          },
          method('yape', 'methods.yape'),
          method('plin', 'methods.plin'),
          method('cash', 'methods.cash'),
          method('bankTransfer', 'methods.bank_transfer'),
          {
            id: 'last',
            header: t('reports.columns.lastPayment'),
            cell: (row) => fmt.date(row.lastPayment),
            sortValue: (row) => row.lastPayment,
          },
        ],
        [
          {
            label: t('reports.kpis.collected'),
            value: money(d?.totals.amount ?? 0),
            tone: 'success',
          },
          { label: t('reports.kpis.payments'), value: qty(d?.totals.payments ?? 0) },
          { label: t('reports.kpis.customers'), value: qty(d?.rows.length ?? 0) },
        ],
      );
    }
    case 'sales-by-product': {
      const d = data as ReportTypes['sales-by-product'] | undefined;
      return build<SalesByProductRow>(
        d?.rows,
        (row) => row.productId,
        [
          {
            id: 'product',
            header: t('reports.columns.product'),
            mobile: 'title',
            minWidth: 200,
            cell: (row) => row.name,
            sortValue: (row) => row.name,
          },
          {
            id: 'revenue',
            header: t('reports.columns.sold'),
            align: 'right',
            mobile: 'aside',
            cell: (row) => <span className="font-semibold tabular-nums">{money(row.revenue)}</span>,
            sortValue: (row) => row.revenue,
          },
          {
            id: 'quantity',
            header: t('reports.columns.quantity'),
            align: 'right',
            cell: (row) => `${qty(row.quantity)} ${unit(row.unit)}`,
            sortValue: (row) => row.quantity,
          },
          {
            id: 'cost',
            header: t('reports.columns.cost'),
            align: 'right',
            cell: (row) => money(row.cost),
            sortValue: (row) => row.cost,
          },
          {
            id: 'profit',
            header: t('reports.columns.profit'),
            align: 'right',
            cell: (row) => (
              <span
                className={cx(
                  'tabular-nums',
                  row.profit !== null && row.profit < 0 && 'text-danger-ink',
                )}
              >
                {money(row.profit)}
              </span>
            ),
            sortValue: (row) => row.profit,
          },
          {
            id: 'sales',
            header: t('reports.columns.inSales'),
            align: 'right',
            cell: (row) => qty(row.sales),
            sortValue: (row) => row.sales,
          },
        ],
        [
          { label: t('reports.kpis.sold'), value: money(d?.totals.revenue ?? 0) },
          { label: t('reports.kpis.cost'), value: money(d?.totals.cost ?? 0) },
          { label: t('reports.kpis.profit'), value: money(d?.totals.profit ?? 0), tone: 'success' },
        ],
      );
    }
    case 'stock': {
      const d = data as ReportTypes['stock'] | undefined;
      const tones: Record<StockStatus, 'danger' | 'warning' | 'success'> = {
        out: 'danger',
        low: 'warning',
        ok: 'success',
      };
      return build<StockReportRow>(
        d?.rows,
        (row) => row.productId,
        [
          {
            id: 'product',
            header: t('reports.columns.product'),
            mobile: 'title',
            minWidth: 200,
            cell: (row) => (
              <span>
                {row.name}
                {row.code && <span className="ml-1.5 text-xs text-subtle">{row.code}</span>}
              </span>
            ),
            sortValue: (row) => row.name,
          },
          {
            id: 'status',
            header: t('reports.columns.status'),
            mobile: 'subtitle',
            cell: (row) => (
              <Badge tone={tones[row.status]} dot>
                {t(`reports.stockStatus.${row.status}`)}
              </Badge>
            ),
            // Out of stock first when sorting ascending.
            sortValue: (row) => ({ out: 0, low: 1, ok: 2 })[row.status],
          },
          {
            id: 'stock',
            header: t('reports.columns.stock'),
            align: 'right',
            mobile: 'aside',
            cell: (row) => (
              <span
                className={cx('font-semibold tabular-nums', row.stock < 0 && 'text-danger-ink')}
              >
                {qty(row.stock)} {unit(row.unit)}
              </span>
            ),
            sortValue: (row) => row.stock,
          },
          {
            id: 'minStock',
            header: t('reports.columns.minStock'),
            align: 'right',
            cell: (row) => (row.minStock === null ? '—' : qty(row.minStock)),
            sortValue: (row) => row.minStock,
          },
          {
            id: 'cost',
            header: t('reports.columns.unitCost'),
            align: 'right',
            cell: (row) => money(row.cost),
            sortValue: (row) => row.cost,
          },
          {
            id: 'value',
            header: t('reports.columns.value'),
            align: 'right',
            cell: (row) => money(row.value),
            sortValue: (row) => row.value,
          },
          {
            id: 'retail',
            header: t('reports.columns.retail'),
            align: 'right',
            cell: (row) => money(row.retail),
            sortValue: (row) => row.retail,
          },
        ],
        [
          { label: t('reports.kpis.value'), value: money(d?.totals.value ?? 0) },
          { label: t('reports.kpis.retail'), value: money(d?.totals.retail ?? 0), tone: 'success' },
          { label: t('reports.kpis.out'), value: qty(d?.totals.out ?? 0), tone: 'danger' },
          { label: t('reports.kpis.low'), value: qty(d?.totals.low ?? 0), tone: 'warning' },
        ],
      );
    }
    case 'shortages': {
      const d = data as ReportTypes['shortages'] | undefined;
      return build<ShortageReportRow>(
        d?.rows,
        (row) => row.movementId,
        [
          {
            id: 'at',
            header: t('reports.columns.when'),
            mobile: 'subtitle',
            minWidth: 150,
            cell: (row) => fmt.dateTime(row.at),
            sortValue: (row) => row.at,
          },
          {
            id: 'product',
            header: t('reports.columns.product'),
            mobile: 'title',
            minWidth: 180,
            cell: (row) => row.product,
            sortValue: (row) => row.product,
          },
          {
            id: 'shortage',
            header: t('reports.columns.missing'),
            align: 'right',
            mobile: 'aside',
            cell: (row) => (
              <span className="font-semibold text-danger-ink tabular-nums">
                {qty(row.shortage)}
              </span>
            ),
            sortValue: (row) => row.shortage,
          },
          {
            id: 'quantity',
            header: t('reports.columns.soldUnits'),
            align: 'right',
            cell: (row) => qty(row.quantity),
            sortValue: (row) => row.quantity,
          },
          {
            id: 'balance',
            header: t('reports.columns.balanceAfter'),
            align: 'right',
            cell: (row) =>
              row.balanceAfter === null ? (
                '—'
              ) : (
                <span className={cx('tabular-nums', row.balanceAfter < 0 && 'text-danger-ink')}>
                  {qty(row.balanceAfter)}
                </span>
              ),
            sortValue: (row) => row.balanceAfter,
          },
          {
            id: 'sale',
            header: t('reports.columns.sale'),
            cell: (row) => (
              <span className="inline-flex items-center gap-1.5">
                {t('sales.number', { number: row.sale.number })}
                {row.sale.status === 'voided' && (
                  <Badge tone="neutral">{t('reports.voided')}</Badge>
                )}
              </span>
            ),
            sortValue: (row) => row.sale.number,
          },
          {
            id: 'customer',
            header: t('reports.columns.customer'),
            cell: (row) => row.customer ?? <span className="text-muted">{walkIn}</span>,
            sortValue: (row) => row.customer ?? walkIn,
          },
        ],
        [
          { label: t('reports.kpis.lines'), value: qty(d?.totals.lines ?? 0), tone: 'warning' },
          { label: t('reports.kpis.units'), value: qty(d?.totals.units ?? 0), tone: 'danger' },
        ],
      );
    }
  }
  throw new Error(`Unknown report ${report as string}`);
}
