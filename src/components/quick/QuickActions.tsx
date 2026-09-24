import { ArrowLeft, HandCoins, Plus, ReceiptText, UserPlus } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Button, cx, EmptyState, Modal, Popover, Skeleton } from '@/ui';
import { useReceivables } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { Receivable } from '../../lib/types';
import { CustomerFormModal } from '../domain/CustomerFormModal';
import { CustomerPicker, type PickedCustomer } from '../domain/CustomerPicker';
import { dueLabel } from '../domain/dueLabel';
import { PaymentForm } from '../domain/PaymentFormModal';
import { ReceivableFormModal } from '../domain/ReceivableFormModal';
import {
  QuickActionsContext,
  useQuickActions,
  type QuickAction,
  type QuickActionsValue,
} from './quickActionsContext';

/** Owns the global "note a sale on credit / record a payment / new customer" forms. */
export function QuickActionsProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [state, setState] = useState<{ action: QuickAction; customer?: PickedCustomer } | null>(
    null,
  );
  const value = useMemo<QuickActionsValue>(
    () => ({ open: (action, customer) => setState({ action, customer }) }),
    [],
  );
  const close = () => setState(null);

  return (
    <QuickActionsContext.Provider value={value}>
      {children}
      <ReceivableFormModal
        open={state?.action === 'receivable'}
        customer={state?.customer}
        onClose={close}
      />
      <QuickPaymentModal
        open={state?.action === 'payment'}
        customer={state?.customer}
        onClose={close}
      />
      <CustomerFormModal
        open={state?.action === 'customer'}
        onClose={close}
        onSaved={(customer) => navigate(`/customers/${customer.id}`)}
      />
    </QuickActionsContext.Provider>
  );
}

/**
 * "Registrar pago" from anywhere: pick the customer, then the debt (the oldest first), then the
 * usual payment form. A customer with a single open debt skips the second step.
 */
function QuickPaymentModal({
  open,
  customer: preset,
  onClose,
}: {
  open: boolean;
  customer?: PickedCustomer;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      title={t('quick.payment.title')}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {open && <QuickPayment preset={preset} onClose={onClose} />}
    </Modal>
  );
}

function QuickPayment({ preset, onClose }: { preset?: PickedCustomer; onClose: () => void }) {
  const { t, fmt } = useI18n();
  const [customer, setCustomer] = useState<PickedCustomer | null>(preset ?? null);
  const [chosen, setChosen] = useState<Receivable | null>(null);
  const debts = useReceivables({
    customerId: customer?.id,
    status: 'pending,partial,overdue',
    page: 1,
    pageSize: 50,
    sortBy: 'dueDate',
    sortDir: 'asc',
  });
  const open = customer ? (debts.data?.data ?? []) : [];
  // A single open debt: nothing to choose.
  const receivable = chosen ?? (customer && debts.data && open.length === 1 ? open[0]! : null);

  if (receivable) {
    return (
      <div className="space-y-3">
        {(chosen || !preset) && (
          <button
            type="button"
            onClick={() => (chosen ? setChosen(null) : setCustomer(null))}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-ink hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('quick.payment.back')}
          </button>
        )}
        <PaymentForm receivable={receivable} onClose={onClose} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="label">{t('quick.payment.who')}</p>
        <CustomerPicker value={customer} onChange={setCustomer} autoFocus />
      </div>
      {customer && (
        <div>
          <p className="label">{t('quick.payment.which')}</p>
          {debts.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : open.length === 0 ? (
            <EmptyState compact title={t('quick.payment.nothingOwed', { name: customer.name })} />
          ) : (
            <ul className="space-y-2">
              {open.map((debt) => {
                const due = dueLabel(debt.dueDate, debt.status, t);
                return (
                  <li key={debt.id}>
                    <button
                      type="button"
                      onClick={() => setChosen(debt)}
                      className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left transition hover:border-primary/50 hover:bg-surface-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {debt.description}
                        </span>
                        {due && (
                          <span
                            className={cx(
                              'block text-xs',
                              due.urgent ? 'text-danger-ink' : 'text-muted',
                            )}
                          >
                            {due.text}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {fmt.money(debt.outstandingAmount)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The "+ Anotar" button with the three everyday actions. `variant="fab"` is the round button in
 * the middle of the mobile bottom bar.
 */
export function QuickAddMenu({ variant = 'button' }: { variant?: 'button' | 'fab' }) {
  const { t } = useI18n();
  const { open } = useQuickActions();
  const items: Array<{ action: QuickAction; icon: ReactNode; label: string; hint: string }> = [
    {
      action: 'receivable',
      icon: <ReceiptText />,
      label: t('quick.receivable'),
      hint: t('quick.receivableHint'),
    },
    {
      action: 'payment',
      icon: <HandCoins />,
      label: t('quick.payment.label'),
      hint: t('quick.paymentHint'),
    },
    {
      action: 'customer',
      icon: <UserPlus />,
      label: t('quick.customer'),
      hint: t('quick.customerHint'),
    },
  ];

  return (
    <Popover
      align={variant === 'fab' ? 'center' : 'end'}
      width={296}
      trigger={({ toggle, ref, open: menuOpen }) =>
        variant === 'fab' ? (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            aria-expanded={menuOpen}
            data-tour="quick-add"
            className="flex flex-col items-center gap-1 py-1 text-[11px] font-semibold text-primary-ink"
          >
            <span
              className={cx(
                'flex h-11 w-11 items-center justify-center rounded-full bg-primary text-on-primary shadow-pop transition',
                menuOpen && 'rotate-45',
              )}
            >
              <Plus className="h-6 w-6" />
            </span>
            {t('quick.button')}
          </button>
        ) : (
          <Button
            ref={ref}
            onClick={toggle}
            aria-expanded={menuOpen}
            data-tour="quick-add"
            icon={<Plus className="h-4 w-4" />}
          >
            {t('quick.button')}
          </Button>
        )
      }
    >
      {(close) => (
        <ul className="space-y-1 p-1">
          {items.map((item) => (
            <li key={item.action}>
              <button
                type="button"
                onClick={() => {
                  close();
                  open(item.action);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-surface-2"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-ink [&>svg]:h-[18px] [&>svg]:w-[18px]">
                  {item.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="block text-xs text-muted">{item.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Popover>
  );
}
