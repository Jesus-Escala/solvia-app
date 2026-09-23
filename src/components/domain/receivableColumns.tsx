import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import type { Receivable } from '../../lib/types';
import { cx, ProgressBar, type DataTableColumn } from '@/ui';
import { StatusBadge } from './Badges';
import { dueLabel } from './dueLabel';

/** Column definitions shared by the receivables page and the customer detail page. */
export function useReceivableColumns({ showCustomer = true } = {}): Array<
  DataTableColumn<Receivable>
> {
  const { t, fmt } = useI18n();
  const columns: Array<DataTableColumn<Receivable>> = [
    {
      id: 'description',
      header: t('receivables.columns.description'),
      sortable: true,
      minWidth: 200,
      hideable: false,
      mobile: 'title',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.description}</p>
          <p className="text-xs text-subtle">
            {t('receivables.issued', { date: fmt.date(row.issueDate) })}
          </p>
        </div>
      ),
    },
    {
      id: 'dueDate',
      header: t('receivables.columns.dueDate'),
      sortable: true,
      minWidth: 150,
      cell: (row) => {
        const relative = dueLabel(row.dueDate, row.status, t);
        return (
          <div>
            <p className="tabular-nums">{fmt.date(row.dueDate)}</p>
            {relative && (
              <p
                className={cx(
                  'text-xs',
                  relative.urgent ? 'font-medium text-danger-ink' : 'text-subtle',
                )}
              >
                {relative.text}
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: 'totalAmount',
      header: t('receivables.columns.total'),
      sortable: true,
      align: 'right',
      cell: (row) => fmt.money(row.totalAmount),
    },
    {
      id: 'outstanding',
      header: t('receivables.columns.outstanding'),
      align: 'right',
      minWidth: 140,
      mobile: 'aside',
      cell: (row) => {
        const paidShare = row.totalAmount > 0 ? row.paidAmount / row.totalAmount : 0;
        return (
          <div className="ml-auto w-full max-w-36">
            <p className="font-semibold">{fmt.money(row.outstandingAmount)}</p>
            {row.status !== 'paid' && row.paidAmount > 0 && (
              <div
                className="mt-1"
                title={t('receivables.paidPercent', { percent: fmt.percent(paidShare) })}
              >
                <ProgressBar
                  value={paidShare}
                  tone="success"
                  label={t('receivables.paidPercent', { percent: fmt.percent(paidShare) })}
                />
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'status',
      header: t('receivables.columns.status'),
      sortable: true,
      hideable: false,
      mobile: 'aside',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'issueDate',
      header: t('receivables.columns.issueDate'),
      sortable: true,
      defaultHidden: true,
      cell: (row) => fmt.date(row.issueDate),
    },
  ];
  if (showCustomer) {
    columns.unshift({
      id: 'customer',
      header: t('receivables.columns.customer'),
      sortable: true,
      minWidth: 170,
      mobile: 'subtitle',
      cell: (row) => (
        <Link
          to={`/customers/${row.customerId}`}
          onClick={(event) => event.stopPropagation()}
          className="font-medium text-ink hover:text-primary-ink hover:underline"
        >
          {row.customer?.name}
        </Link>
      ),
    });
  }
  return columns;
}
