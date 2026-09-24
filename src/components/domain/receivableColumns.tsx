import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider';
import type { Receivable } from '../../lib/types';
import { cx, ProgressBar, type DataTableColumn } from '@/ui';
import { StatusBadge } from './Badges';
import { PaymentMethodLabel, PaymentMethodMark } from './PaymentMethods';
import { dueLabel } from './dueLabel';

/** Column definitions shared by the receivables page and the customer detail page. */
export function useReceivableColumns({ showCustomer = true } = {}): Array<
  DataTableColumn<Receivable>
> {
  const { t, fmt } = useI18n();
  const columns: Array<DataTableColumn<Receivable>> = [
    {
      id: 'description',
      sortValue: (row) => row.description,
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
      sortValue: (row) => row.dueDate,
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
      sortValue: (row) => row.totalAmount,
      header: t('receivables.columns.total'),
      sortable: true,
      align: 'right',
      cell: (row) => fmt.money(row.totalAmount),
    },
    {
      id: 'outstanding',
      sortValue: (row) => row.outstandingAmount,
      sortable: true,
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
      sortValue: (row) => t(`status.${row.status}`),
      header: t('receivables.columns.status'),
      sortable: true,
      hideable: false,
      mobile: 'aside',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'paymentMethod',
      sortValue: (row) => (row.paymentMethods?.[0] ? t(`methods.${row.paymentMethods[0]}`) : null),
      sortable: true,
      header: t('receivables.columns.paymentMethod'),
      cell: (row) => {
        const methods = row.paymentMethods ?? [];
        if (methods.length === 0) return <span className="text-subtle">—</span>;
        // One method: mark + name. Several (partial payments): the marks, most recent first.
        return methods.length === 1 ? (
          <PaymentMethodLabel method={methods[0]!} />
        ) : (
          <span
            className="inline-flex items-center gap-1"
            title={methods.map((method) => t(`methods.${method}`)).join(' · ')}
          >
            {methods.map((method) => (
              <PaymentMethodMark key={method} method={method} size="sm" />
            ))}
            <span className="ml-0.5 text-xs text-muted">
              {t('receivables.methodsCount', { count: methods.length })}
            </span>
          </span>
        );
      },
    },
    {
      id: 'issueDate',
      sortValue: (row) => row.issueDate,
      header: t('receivables.columns.issueDate'),
      sortable: true,
      defaultHidden: true,
      cell: (row) => fmt.date(row.issueDate),
    },
  ];
  if (showCustomer) {
    columns.unshift({
      id: 'customer',
      sortValue: (row) => row.customer?.name,
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
