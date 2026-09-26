import { useQueryClient } from '@tanstack/react-query';
import { CalendarRange, ShoppingCart, TrendingUp, Wallet, Warehouse } from 'lucide-react';
import type { ReactNode } from 'react';
import { Alert, Page, Tabs, useErrorText, useUrlState } from '@/ui';
import {
  allowedGranularities,
  autoGranularity,
  isValidRange,
  presetRange,
  type Granularity,
} from '../../components/dashboard/period';
import { useDashboardSummary } from '../../hooks/queries';
import { useModules } from '../../hooks/useModules';
import { useI18n } from '../../i18n/I18nProvider';
import type { PaymentMethod } from '../../lib/types';
import { CollectionView, type CollectionFilters } from './CollectionView';
import { DashboardHeader } from './parts';
import { PortfolioView } from './PortfolioView';
import { ProjectionView } from './ProjectionView';
import { PurchasesView } from './PurchasesView';
import { SalesView } from './SalesView';

type View = 'sales' | 'purchases' | 'collection' | 'portfolio' | 'projection';

const ICONS: Record<View, ReactNode> = {
  sales: <ShoppingCart />,
  purchases: <Warehouse />,
  collection: <TrendingUp />,
  portfolio: <Wallet />,
  projection: <CalendarRange />,
};

// Everything the dashboard shows is in the URL (?view=&from=&to=&g=&method=&customer=&weekday=):
// shareable and reload-safe.
const DEFAULTS = {
  view: '',
  from: '',
  to: '',
  g: '',
  method: '',
  customer: '',
  weekday: '',
};
const METHODS: PaymentMethod[] = ['yape', 'plin', 'cash', 'bank_transfer'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Dashboard (charts), one view per question, each opening with one plain sentence answering it:
 * what you sold (best products and customers, how and when) and what you bought (Ventas and
 * Inventario modules), and with Cobranza what you collected (any period vs the previous one),
 * what you are owed and its risk, and what you expect to collect. "Today" lives on the Home page.
 */
export function DashboardPage() {
  const { t } = useI18n();
  const errors = useErrorText();
  const queryClient = useQueryClient();
  const modules = useModules();
  const [state, update] = useUrlState(DEFAULTS);
  // Only the views of the modules the business has, sales first.
  const views: View[] = [
    ...(modules.sales ? (['sales'] as const) : []),
    ...(modules.inventory ? (['purchases'] as const) : []),
    ...(modules.collections ? (['collection', 'portfolio', 'projection'] as const) : []),
  ];
  const view: View | null = views.includes(state.view as View)
    ? (state.view as View)
    : (views[0] ?? null);

  const summary = useDashboardSummary(modules.collections);
  const refreshing = summary.isFetching && !summary.isLoading;

  const urlRange = { from: state.from, to: state.to };
  const range = isValidRange(urlRange) ? urlRange : presetRange('thisMonth');
  const allowed = allowedGranularities(range);
  const granularity: Granularity = allowed.includes(state.g as Granularity)
    ? (state.g as Granularity)
    : allowed.includes(autoGranularity(range))
      ? autoGranularity(range)
      : allowed[0]!;

  // Invalid values in a hand-edited URL are ignored instead of failing the request.
  const weekday = Number(state.weekday);
  const filters: CollectionFilters = {
    method: METHODS.includes(state.method as PaymentMethod)
      ? (state.method as PaymentMethod)
      : null,
    customerId: UUID.test(state.customer) ? state.customer : null,
    weekday: Number.isInteger(weekday) && weekday >= 1 && weekday <= 7 ? weekday : null,
  };

  if (view === null) return <Page>{null}</Page>;

  return (
    <Page>
      <DashboardHeader
        generatedAt={summary.data?.generatedAt}
        refreshing={summary.isFetching}
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['dashboard'] })}
      />

      <Tabs
        stretch
        label={t('dashboard.tabs.label')}
        value={view}
        onChange={(next) => update({ view: next })}
        items={views.map((item) => ({
          value: item,
          label: t(`dashboard.tabs.${item}`),
          icon: ICONS[item],
        }))}
      />
      <p className="-mt-2 text-sm text-muted">{t(`dashboard.tabs.hints.${view}`)}</p>

      {summary.error && modules.collections && (
        <Alert tone="danger">{errors.message(summary.error)}</Alert>
      )}

      <div key={view} className="animate-page-in space-y-5">
        {view === 'sales' && (
          <SalesView
            range={range}
            onRangeChange={(next) => update({ from: next.from, to: next.to, g: '' })}
          />
        )}
        {view === 'purchases' && (
          <PurchasesView
            range={range}
            onRangeChange={(next) => update({ from: next.from, to: next.to, g: '' })}
          />
        )}
        {view === 'collection' && (
          <CollectionView
            range={range}
            granularity={granularity}
            onRangeChange={(next) => update({ from: next.from, to: next.to, g: '' })}
            onGranularityChange={(g) => update({ g })}
            filters={filters}
            onFiltersChange={(changes) =>
              update({
                ...('method' in changes && { method: changes.method ?? '' }),
                ...('customerId' in changes && { customer: changes.customerId ?? '' }),
                ...('weekday' in changes && {
                  weekday: changes.weekday ? String(changes.weekday) : '',
                }),
              })
            }
          />
        )}
        {view === 'portfolio' && <PortfolioView summary={summary.data} refreshing={refreshing} />}
        {view === 'projection' && <ProjectionView summary={summary.data} refreshing={refreshing} />}
      </div>
    </Page>
  );
}
