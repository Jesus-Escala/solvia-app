import { AlertTriangle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { Alert, Button, cx, EmptyState, Modal, Skeleton, useErrorText } from '@/ui';
import { useProductMovements } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { Product } from '../../lib/types';

/**
 * Kardex of a product: every stock change, newest first, with the stock it left and a warning
 * on the ones sold without stock — to explain a difference between the count and the system.
 */
export function KardexModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={product !== null}
      size="lg"
      title={product ? t('kardex.title', { name: product.name }) : ''}
      description={t('kardex.subtitle')}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {product && <Kardex product={product} />}
    </Modal>
  );
}

function Kardex({ product }: { product: Product }) {
  const { t, fmt } = useI18n();
  const errors = useErrorText();
  const [page, setPage] = useState(1);
  const query = useProductMovements(product.id, page);
  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  if (query.error) return <Alert tone="danger">{errors.message(query.error)}</Alert>;
  if (query.isLoading) return <Skeleton className="h-48 w-full" />;
  if (rows.length === 0) return <EmptyState compact title={t('kardex.empty')} />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t('kardex.now', { count: fmt.number(product.stock) })}</p>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {rows.map((movement) => {
          const entered = movement.quantity > 0;
          return (
            <li key={movement.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <span
                className={cx(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  entered ? 'bg-success-soft text-success-ink' : 'bg-surface-3 text-muted',
                )}
              >
                {entered ? (
                  <ArrowDownLeft className="h-4 w-4" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">
                  {t(`kardex.types.${movement.type}`)}
                  {movement.sale && (
                    <span className="text-muted">
                      {' '}
                      · {t('sales.number', { number: movement.sale.number })}
                    </span>
                  )}
                </span>
                <span className="block text-xs text-muted">{fmt.dateTime(movement.createdAt)}</span>
                {movement.shortage > 0 && (
                  <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-warning-ink">
                    <AlertTriangle className="h-3 w-3" />
                    {t('kardex.shortage', { count: fmt.number(movement.shortage) })}
                  </span>
                )}
              </span>
              <span
                className={cx(
                  'w-16 text-right font-semibold tabular-nums',
                  entered ? 'text-success-ink' : 'text-ink',
                )}
              >
                {entered ? '+' : ''}
                {fmt.number(movement.quantity)}
              </span>
              <span className="w-20 text-right tabular-nums">
                <span className="block text-[10px] text-subtle uppercase">
                  {t('kardex.balance')}
                </span>
                <span
                  className={cx(
                    'font-semibold',
                    (movement.balanceAfter ?? 0) < 0 && 'text-warning-ink',
                  )}
                >
                  {movement.balanceAfter === null ? '—' : fmt.number(movement.balanceAfter)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            {t('kardex.newer')}
          </Button>
          <span className="text-muted tabular-nums">
            {page} / {meta.totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t('kardex.older')}
          </Button>
        </div>
      )}
    </div>
  );
}
