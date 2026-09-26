import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  HandCoins,
  ReceiptText,
  ShoppingCart,
  UserPlus,
  Warehouse,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Button, Card, cx, EmptyState, Mascot, Page, Skeleton, smallButtonClass } from '@/ui';
import { useAuth } from '../auth/AuthContext';
import { ModulesOffer } from '../components/modules/ModulesOffer';
import { PlanLimitNotice } from '../components/plan/PlanUsage';
import { addDaysIso, dueLabel, todayIso } from '../components/domain/dueLabel';
import { useReceivableActions } from '../components/domain/useReceivableActions';
import { useQuickActions } from '../components/quick/quickActionsContext';
import {
  useDashboardAnalytics,
  useDashboardSummary,
  useProducts,
  useReceivables,
  useReport,
} from '../hooks/queries';
import { useModules } from '../hooks/useModules';
import { useI18n } from '../i18n/I18nProvider';
import { presetRange } from '../components/dashboard/period';

/** Products running low (inventory module), with a link to them. */
function LowStockNotice({ count }: { count: number }) {
  const { t } = useI18n();
  return (
    <Link
      to="/products?status=low"
      className="flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning-soft px-5 py-3.5 text-sm transition hover:brightness-95"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-warning-ink" />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-warning-ink">
          {t('home.lowStock', { count })}
        </span>
        <span className="block text-muted">{t('home.lowStockHint')}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-warning-ink" />
    </Link>
  );
}

/** The way to the reports, at the end of the page. */
function ReportsLink() {
  const { t } = useI18n();
  return (
    <Link
      to="/reports"
      className="flex items-center gap-3 rounded-2xl border border-dashed border-line-strong px-5 py-4 text-sm transition hover:border-primary/50 hover:bg-surface"
    >
      <BarChart3 className="h-5 w-5 shrink-0 text-primary-ink" />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{t('home.reports.title')}</span>
        <span className="block text-muted">{t('home.reports.hint')}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-subtle" />
    </Link>
  );
}

/** A big, labelled button for one of the everyday actions. */
function ActionTile({
  icon,
  label,
  hint,
  onClick,
  primary = false,
  wide = false,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  primary?: boolean;
  /** Takes the whole row on phones (the first of an odd number of tiles). */
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        // Phones: compact tiles in a 2-column grid; wider screens: roomier cards.
        'group flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-pop sm:gap-3 sm:p-5',
        wide && 'col-span-2 sm:col-span-1',
        primary
          ? 'border-primary bg-primary text-on-primary'
          : 'border-line bg-surface text-ink hover:border-primary/40',
      )}
    >
      <span
        className={cx(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6',
          primary ? 'bg-white/15' : 'bg-primary-soft text-primary-ink',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-base leading-tight font-semibold sm:text-lg">
          {label}
        </span>
        <span
          className={cx(
            'block text-xs leading-snug sm:text-sm',
            primary ? 'text-on-primary/80' : 'text-muted',
          )}
        >
          {hint}
        </span>
      </span>
    </button>
  );
}

/** One figure in plain words with a link to the list behind it. */
function Figure({
  label,
  value,
  hint,
  to,
  linkLabel,
  tone = 'default',
  loading = false,
}: {
  label: string;
  value: string;
  hint?: string;
  to: string;
  linkLabel: string;
  tone?: 'default' | 'success';
  loading?: boolean;
}) {
  return (
    <Card className="flex flex-col">
      <p className="text-sm font-medium text-muted">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-9 w-40" />
      ) : (
        <p
          className={cx(
            'mt-1 font-display text-3xl font-semibold tabular-nums sm:text-4xl',
            tone === 'success' && 'text-success-ink',
          )}
        >
          {value}
        </p>
      )}
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <Link to={to} className={smallButtonClass('sm', 'mt-auto self-start')}>
        {linkLabel}
        <ChevronRight className="h-4 w-4" />
      </Link>
    </Card>
  );
}

/**
 * Home: what to do today, in plain words. The big actions of the business's modules; with
 * Cobranza, how much you are owed and were paid this month and who to collect from now (late or
 * due in the next days), each with "Me pagó" and "WhatsApp" at hand; without it, what you sold
 * this month and what your stock is worth. The charts live in Resultados.
 */
export function HomePage() {
  const { t, fmt } = useI18n();
  const { user, isAdmin } = useAuth();
  const quick = useQuickActions();
  const modules = useModules();
  const actions = useReceivableActions();
  const collections = modules.collections;
  const summary = useDashboardSummary(collections);
  const thisMonth = presetRange('thisMonth');
  const month = useDashboardAnalytics({ ...thisMonth, granularity: 'day' }, collections);
  const today = todayIso();
  // Late ones first (oldest due date), then the ones due in the next 3 days.
  const toCollect = useReceivables(
    {
      status: 'pending,partial,overdue',
      dueTo: addDaysIso(today, 3),
      page: 1,
      pageSize: 8,
      sortBy: 'dueDate',
      sortDir: 'asc',
    },
    collections,
  );
  // Without Cobranza the figures come from the sales and stock reports.
  const salesMonth = useReport('sales-by-customer', thisMonth, modules.sales && !collections);
  const stock = useReport('stock', null, modules.inventory && !collections);
  const firstName = user?.name.split(' ')[0] ?? '';
  const totals = summary.data?.totals;
  const openCount = summary.data
    ? summary.data.byStatus.pending.count +
      summary.data.byStatus.partial.count +
      summary.data.byStatus.overdue.count
    : 0;
  const hasAnyDebt = summary.data ? openCount + summary.data.byStatus.paid.count > 0 : true;
  const rows = toCollect.data?.data ?? [];
  // Running low (inventory module): only the count, one tiny request.
  const low = useProducts({ page: 1, pageSize: 1, lowStock: true }, modules.inventory);
  const lowCount = modules.inventory ? (low.data?.meta.total ?? 0) : 0;
  const more = (toCollect.data?.meta.total ?? 0) - rows.length;
  const tiles: Array<{
    key: string;
    icon: ReactNode;
    label: string;
    hint: string;
    open: () => void;
  }> = [
    ...(modules.sales
      ? [
          {
            key: 'sale',
            icon: <ShoppingCart />,
            label: t('quick.sale'),
            hint: t('quick.saleHint'),
            open: () => quick.open('sale'),
          },
        ]
      : []),
    ...(collections
      ? [
          {
            key: 'receivable',
            icon: <ReceiptText />,
            label: t('quick.receivable'),
            hint: t('quick.receivableHint'),
            open: () => quick.open('receivable'),
          },
          {
            key: 'payment',
            icon: <HandCoins />,
            label: t('quick.payment.label'),
            hint: t('quick.paymentHint'),
            open: () => quick.open('payment'),
          },
        ]
      : []),
    ...(modules.inventory && !(modules.sales && collections)
      ? [
          {
            key: 'purchase',
            icon: <Warehouse />,
            label: t('quick.purchase'),
            hint: t('quick.purchaseHint'),
            open: () => quick.open('purchase'),
          },
        ]
      : []),
    ...(modules.customers
      ? [
          {
            key: 'customer',
            icon: <UserPlus />,
            label: t('quick.customer'),
            hint: t('quick.customerHint'),
            open: () => quick.open('customer'),
          },
        ]
      : []),
  ];

  return (
    <Page>
      <div className="flex items-center gap-3">
        <Mascot size={56} mood="wave" className="hidden shrink-0 sm:block" />
        <div>
          <h1 className="text-[1.75rem] leading-tight font-semibold sm:text-[2.1rem]">
            {t('home.greeting', { name: firstName })}
          </h1>
          <p className="mt-0.5 text-sm text-muted">{t('home.subtitle')}</p>
        </div>
      </div>

      <div
        className={cx(
          'grid grid-cols-2 gap-3',
          tiles.length === 4 && 'lg:grid-cols-4',
          tiles.length === 3 && 'sm:grid-cols-3',
        )}
        data-tour="home-actions"
      >
        {tiles.map((tile, index) => (
          <ActionTile
            key={tile.key}
            primary={index === 0}
            // An odd number of tiles: the first one takes the whole row on phones.
            wide={index === 0 && tiles.length % 2 === 1}
            icon={tile.icon}
            label={tile.label}
            hint={tile.hint}
            onClick={tile.open}
          />
        ))}
      </div>

      {!collections ? (
        <>
          {(modules.sales || modules.inventory) && (
            <div
              className={cx('grid gap-3', modules.sales && modules.inventory && 'sm:grid-cols-2')}
            >
              {modules.sales && (
                <Figure
                  label={t('home.salesMonth')}
                  value={fmt.money(salesMonth.data?.totals.total ?? 0)}
                  loading={!salesMonth.data}
                  tone="success"
                  hint={t('home.salesMonthCount', { count: salesMonth.data?.totals.sales ?? 0 })}
                  to="/sales"
                  linkLabel={t('home.salesLink')}
                />
              )}
              {modules.inventory && (
                <Figure
                  label={t('home.stockValue')}
                  value={fmt.money(stock.data?.totals.value ?? 0)}
                  loading={!stock.data}
                  hint={t('home.stockValueHint', { count: stock.data?.totals.products ?? 0 })}
                  to="/products"
                  linkLabel={t('home.stockLink')}
                />
              )}
            </div>
          )}
          {isAdmin && <PlanLimitNotice />}
          {lowCount > 0 && <LowStockNotice count={lowCount} />}
          {isAdmin && <ModulesOffer />}
          <ReportsLink />
        </>
      ) : !hasAnyDebt ? (
        <Card>
          <EmptyState
            icon={<Mascot size={44} mood="happy" />}
            title={t('home.empty.title')}
            description={t('home.empty.description')}
            action={
              <Button
                icon={<ReceiptText className="h-4 w-4" />}
                onClick={() => quick.open('receivable')}
              >
                {t('quick.receivable')}
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Figure
              label={t('home.owed')}
              value={fmt.money(totals?.outstanding ?? 0)}
              loading={!totals}
              hint={
                totals && totals.overdue > 0
                  ? t('home.owedLate', { amount: fmt.money(totals.overdue) })
                  : t('home.owedCount', { count: openCount })
              }
              to="/receivables?status=open"
              linkLabel={t('home.owedLink')}
            />
            <Figure
              label={t('home.paidMonth')}
              value={fmt.money(month.data?.kpis.collected.value ?? 0)}
              loading={!month.data}
              tone="success"
              hint={t('home.paidMonthCount', { count: month.data?.kpis.payments.value ?? 0 })}
              to="/dashboard?view=collection"
              linkLabel={t('home.paidLink')}
            />
          </div>

          {isAdmin && <PlanLimitNotice />}

          {lowCount > 0 && <LowStockNotice count={lowCount} />}

          <Card
            data-tour="home-today"
            title={t('home.today.title')}
            subtitle={t('home.today.subtitle')}
            padded={false}
            loading={toCollect.isFetching && !toCollect.isLoading}
          >
            {toCollect.isLoading ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                compact
                icon={<Mascot size={40} mood="happy" />}
                title={t('home.today.empty')}
                description={t('home.today.emptyDescription')}
              />
            ) : (
              <ul className="divide-y divide-line">
                {rows.map((row) => {
                  const due = dueLabel(row.dueDate, row.status, t);
                  return (
                    <li
                      key={row.id}
                      className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:gap-4"
                    >
                      <Link to={`/customers/${row.customerId}`} className="group min-w-0 flex-1">
                        <span className="block truncate font-semibold group-hover:underline">
                          {row.customer?.name}
                        </span>
                        <span className="block truncate text-sm text-muted">
                          {row.description}
                          {due && (
                            <>
                              {' · '}
                              <span className={due.urgent ? 'font-medium text-danger-ink' : ''}>
                                {due.text}
                              </span>
                            </>
                          )}
                        </span>
                      </Link>
                      {/* Phones: amount and buttons share one line; wider screens: one row for all. */}
                      <div className="flex items-center justify-between gap-2 sm:contents">
                        <span className="font-display text-lg font-semibold tabular-nums sm:w-32 sm:text-right">
                          {fmt.money(row.outstandingAmount)}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {actions.render(row)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {more > 0 && (
              <Link
                to="/receivables?status=open"
                className="flex items-center justify-center gap-1 border-t border-line px-5 py-3 text-sm font-semibold text-primary-ink hover:bg-surface-2"
              >
                {t('home.today.more', { count: more })}
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </Card>

          {isAdmin && <ModulesOffer />}
          <ReportsLink />
        </>
      )}
      {actions.modals}
    </Page>
  );
}
