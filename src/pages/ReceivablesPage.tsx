import { Layers, Plus } from 'lucide-react';
import { StatusIcon } from '../components/domain/Badges';
import { useState } from 'react';
import { ReceivableFormModal } from '../components/domain/ReceivableFormModal';
import { useReceivableColumns } from '../components/domain/receivableColumns';
import { useReceivableActions } from '../components/domain/useReceivableActions';
import {
  Alert,
  Button,
  DataTable,
  Page,
  PageHeader,
  SearchInput,
  SegmentedControl,
  useErrorText,
} from '@/ui';
import { useDashboardSummary, useReceivables, type ReceivableListParams } from '../hooks/queries';
import { useUrlState } from '@/ui';
import { useI18n } from '../i18n/I18nProvider';
import type { ReceivableStatus, SortDir } from '../lib/types';

const DEFAULTS = {
  status: '',
  search: '',
  page: '1',
  pageSize: '20',
  sortBy: 'dueDate',
  sortDir: 'asc',
};
const STATUSES: ReceivableStatus[] = ['pending', 'partial', 'overdue', 'paid'];

export function ReceivablesPage() {
  const { t } = useI18n();
  const errors = useErrorText();
  const [state, update] = useUrlState(DEFAULTS);
  const [creating, setCreating] = useState(false);
  const actions = useReceivableActions();
  const summary = useDashboardSummary();
  const columns = useReceivableColumns();

  const params: ReceivableListParams = {
    status: state.status as ReceivableStatus | '',
    search: state.search || undefined,
    page: Number(state.page) || 1,
    pageSize: Number(state.pageSize) || 20,
    sortBy: state.sortBy as ReceivableListParams['sortBy'],
    sortDir: state.sortDir as SortDir,
  };
  const query = useReceivables(params);
  const counts = summary.data?.byStatus;

  return (
    <Page fill>
      <PageHeader
        title={t('receivables.title')}
        description={t('receivables.subtitle')}
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
            {t('receivables.new')}
          </Button>
        }
      />
      <DataTable
        data-tour="receivables-table"
        columnsStorageKey="receivables"
        caption={t('receivables.title')}
        toolbar={
          <>
            <SegmentedControl
              data-tour="status-filter"
              label={t('receivables.columns.status')}
              value={state.status}
              onChange={(status) => update({ status })}
              options={[
                { value: '', label: t('common.all'), icon: <Layers /> },
                ...STATUSES.map((status) => ({
                  value: status,
                  label: t(`status.${status}`),
                  icon: <StatusIcon status={status} />,
                  count: counts?.[status].count,
                })),
              ]}
            />
            <SearchInput
              value={state.search}
              onChange={(search) => update({ search })}
              placeholder={t('receivables.searchPlaceholder')}
            />
          </>
        }
        columns={columns}
        rows={query.data?.data}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        fetching={query.isFetching && !query.isLoading}
        error={query.error ? <Alert tone="danger">{errors.message(query.error)}</Alert> : undefined}
        rowActions={actions.render}
        sort={{ id: state.sortBy, dir: state.sortDir as SortDir }}
        onSortChange={(sort) => update({ sortBy: sort.id, sortDir: sort.dir })}
        pagination={
          query.data && {
            ...query.data.meta,
            onPageChange: (page) => update({ page: String(page) }),
            onPageSizeChange: (pageSize) => update({ pageSize: String(pageSize) }),
          }
        }
        empty={{
          title:
            state.status || state.search ? t('receivables.emptyFiltered') : t('receivables.empty'),
          description: state.status || state.search ? undefined : t('receivables.emptyDescription'),
          action:
            !state.status && !state.search ? (
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                {t('receivables.new')}
              </Button>
            ) : undefined,
        }}
      />
      {actions.modals}
      <ReceivableFormModal open={creating} onClose={() => setCreating(false)} />
    </Page>
  );
}
