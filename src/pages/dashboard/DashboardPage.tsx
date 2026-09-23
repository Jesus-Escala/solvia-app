import { useQueryClient } from '@tanstack/react-query';
import { CalendarRange, LayoutDashboard, TrendingUp, Wallet } from 'lucide-react';
import { Alert, Page, Tabs, useErrorText, useUrlState } from '@/ui';
import {
  allowedGranularities,
  autoGranularity,
  isValidRange,
  presetRange,
  type Granularity,
} from '../../components/dashboard/period';
import { useDashboardSummary } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import { CollectionView } from './CollectionView';
import { DashboardHeader } from './parts';
import { PortfolioView } from './PortfolioView';
import { ProjectionView } from './ProjectionView';
import { SummaryView } from './SummaryView';

type View = 'summary' | 'collection' | 'portfolio' | 'projection';
const VIEWS: View[] = ['summary', 'collection', 'portfolio', 'projection'];

// Everything the dashboard shows is in the URL (?view=&from=&to=&g=): shareable and reload-safe.
const DEFAULTS = { view: 'summary', from: '', to: '', g: '' };

/**
 * Business dashboard, split into four views with a single purpose each:
 * summary (today), collection (any period vs the previous one), portfolio (what you are owed
 * and its risk) and projection (what you expect to collect).
 */
export function DashboardPage() {
  const { t } = useI18n();
  const errors = useErrorText();
  const queryClient = useQueryClient();
  const [state, update] = useUrlState(DEFAULTS);
  const view: View = VIEWS.includes(state.view as View) ? (state.view as View) : 'summary';

  const summary = useDashboardSummary();
  const refreshing = summary.isFetching && !summary.isLoading;

  const urlRange = { from: state.from, to: state.to };
  const range = isValidRange(urlRange) ? urlRange : presetRange('thisMonth');
  const allowed = allowedGranularities(range);
  const granularity: Granularity = allowed.includes(state.g as Granularity)
    ? (state.g as Granularity)
    : allowed.includes(autoGranularity(range))
      ? autoGranularity(range)
      : allowed[0]!;

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
        items={[
          { value: 'summary', label: t('dashboard.tabs.summary'), icon: <LayoutDashboard /> },
          { value: 'collection', label: t('dashboard.tabs.collection'), icon: <TrendingUp /> },
          { value: 'portfolio', label: t('dashboard.tabs.portfolio'), icon: <Wallet /> },
          { value: 'projection', label: t('dashboard.tabs.projection'), icon: <CalendarRange /> },
        ]}
      />
      <p className="-mt-2 text-sm text-muted">{t(`dashboard.tabs.hints.${view}`)}</p>

      {summary.error && <Alert tone="danger">{errors.message(summary.error)}</Alert>}

      <div key={view} className="animate-page-in space-y-5">
        {view === 'summary' && (
          <SummaryView summary={summary.data} loading={summary.isLoading} refreshing={refreshing} />
        )}
        {view === 'collection' && (
          <CollectionView
            range={range}
            granularity={granularity}
            onRangeChange={(next) => update({ from: next.from, to: next.to, g: '' })}
            onGranularityChange={(g) => update({ g })}
          />
        )}
        {view === 'portfolio' && <PortfolioView summary={summary.data} refreshing={refreshing} />}
        {view === 'projection' && <ProjectionView summary={summary.data} refreshing={refreshing} />}
      </div>
    </Page>
  );
}
