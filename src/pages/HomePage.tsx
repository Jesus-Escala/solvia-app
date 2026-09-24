import { BarChart3, ChevronRight, HandCoins, ReceiptText, UserPlus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Button, Card, cx, EmptyState, Mascot, Page, Skeleton } from '@/ui';
import { useAuth } from '../auth/AuthContext';
import { addDaysIso, dueLabel, todayIso } from '../components/domain/dueLabel';
import { useReceivableActions } from '../components/domain/useReceivableActions';
import { useQuickActions } from '../components/quick/quickActionsContext';
import { useDashboardAnalytics, useDashboardSummary, useReceivables } from '../hooks/queries';
import { useI18n } from '../i18n/I18nProvider';
import { presetRange } from '../components/dashboard/period';

/** A big, labelled button for one of the everyday actions. */
function ActionTile({
  icon,
  label,
  hint,
  onClick,
  primary = false,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'group flex items-center gap-3 rounded-2xl border p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-pop sm:flex-col sm:items-start sm:gap-3 sm:p-5',
        primary
          ? 'border-primary bg-primary text-on-primary'
          : 'border-line bg-surface text-ink hover:border-primary/40',
      )}
    >
      <span
        className={cx(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl [&>svg]:h-6 [&>svg]:w-6',
          primary ? 'bg-white/15' : 'bg-primary-soft text-primary-ink',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-lg leading-tight font-semibold">{label}</span>
        <span className={cx('block text-sm', primary ? 'text-on-primary/80' : 'text-muted')}>
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
      <Link
        to={to}
        className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-primary-ink hover:underline"
      >
        {linkLabel}
        <ChevronRight className="h-4 w-4" />
      </Link>
    </Card>
  );
}

/**
 * Home: what to do today, in plain words. Three big actions, how much you are owed and were paid
 * this month, and who to collect from now (late or due in the next days), each with "Me pagó"
 * and "WhatsApp" at hand. The charts live in Reportes.
 */
export function HomePage() {
  const { t, fmt } = useI18n();
  const { user } = useAuth();
  const quick = useQuickActions();
  const actions = useReceivableActions();
  const summary = useDashboardSummary();
  const month = useDashboardAnalytics({ ...presetRange('thisMonth'), granularity: 'day' });
  const today = todayIso();
  // Late ones first (oldest due date), then the ones due in the next 3 days.
  const toCollect = useReceivables({
    status: 'pending,partial,overdue',
    dueTo: addDaysIso(today, 3),
    page: 1,
    pageSize: 8,
    sortBy: 'dueDate',
    sortDir: 'asc',
  });
  const firstName = user?.name.split(' ')[0] ?? '';
  const totals = summary.data?.totals;
  const openCount = summary.data
    ? summary.data.byStatus.pending.count +
      summary.data.byStatus.partial.count +
      summary.data.byStatus.overdue.count
    : 0;
  const hasAnyDebt = summary.data ? openCount + summary.data.byStatus.paid.count > 0 : true;
  const rows = toCollect.data?.data ?? [];
  const more = (toCollect.data?.meta.total ?? 0) - rows.length;

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

      <div className="grid gap-3 sm:grid-cols-3" data-tour="home-actions">
        <ActionTile
          primary
          icon={<ReceiptText />}
          label={t('quick.receivable')}
          hint={t('quick.receivableHint')}
          onClick={() => quick.open('receivable')}
        />
        <ActionTile
          icon={<HandCoins />}
          label={t('quick.payment.label')}
          hint={t('quick.paymentHint')}
          onClick={() => quick.open('payment')}
        />
        <ActionTile
          icon={<UserPlus />}
          label={t('quick.customer')}
          hint={t('quick.customerHint')}
          onClick={() => quick.open('customer')}
        />
      </div>

      {!hasAnyDebt ? (
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
              to="/receivables"
              linkLabel={t('home.owedLink')}
            />
            <Figure
              label={t('home.paidMonth')}
              value={fmt.money(month.data?.kpis.collected.value ?? 0)}
              loading={!month.data}
              tone="success"
              hint={t('home.paidMonthCount', { count: month.data?.kpis.payments.value ?? 0 })}
              to="/reports?view=collection"
              linkLabel={t('home.paidLink')}
            />
          </div>

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
                      <span className="font-display text-lg font-semibold tabular-nums sm:w-32 sm:text-right">
                        {fmt.money(row.outstandingAmount)}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {actions.render(row)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {more > 0 && (
              <Link
                to="/receivables"
                className="flex items-center justify-center gap-1 border-t border-line px-5 py-3 text-sm font-semibold text-primary-ink hover:bg-surface-2"
              >
                {t('home.today.more', { count: more })}
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </Card>

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
        </>
      )}
      {actions.modals}
    </Page>
  );
}
