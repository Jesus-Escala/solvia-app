import { HandCoins, Link2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useDeleteReceivable, usePaymentLink, useSendReminder } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import { Button, IconButton, MenuItems, Popover, useFeedback, WhatsAppIcon } from '@/ui';
import type { Receivable } from '../../lib/types';
import { PaymentFormModal } from './PaymentFormModal';
import { ReceivableFormModal } from './ReceivableFormModal';

/**
 * Everything needed to act on receivables from any table: the row actions (visible "Paid me"
 * and "WhatsApp" buttons + overflow menu) and the modals they open. Usage:
 *
 *   const actions = useReceivableActions();
 *   <DataTable rowActions={actions.render} ... />
 *   {actions.modals}
 */
export function useReceivableActions() {
  const { t, fmt } = useI18n();
  const { isAdmin } = useAuth();
  const { toast, confirm } = useFeedback();
  const [paying, setPaying] = useState<Receivable | null>(null);
  const [editing, setEditing] = useState<Receivable | null>(null);
  const remind = useSendReminder();
  const paymentLink = usePaymentLink();
  const remove = useDeleteReceivable();

  const run = (action: () => Promise<void>) =>
    void action().catch((error: unknown) => toast.apiError(error));

  const sendReminder = (receivable: Receivable) =>
    run(async () => {
      const notification = await remind.mutateAsync(receivable.id);
      if (notification.whatsappUrl) {
        // No automatic sending (or the month's automatic messages ran out): open WhatsApp with
        // the message ready to send from the user's own phone.
        window.open(notification.whatsappUrl, '_blank', 'noopener');
        if (notification.limitReached) {
          toast.warning(t('plan.limitReachedTitle'), t('plan.limitReachedBody'));
        } else {
          toast.info(t('receivables.reminderOpened', { name: receivable.customer?.name ?? '' }));
        }
      } else if (notification.status === 'sent') {
        toast.success(t('receivables.reminderSent', { name: receivable.customer?.name ?? '' }));
      } else {
        toast.warning(t('receivables.reminderFailed'));
      }
    });

  const copyPaymentLink = (receivable: Receivable) =>
    run(async () => {
      const link = await paymentLink.mutateAsync(receivable.id);
      try {
        await navigator.clipboard.writeText(link.url);
        toast.success(t('receivables.linkCopied', { amount: fmt.money(link.amount) }));
      } catch {
        toast.info(t('receivables.linkReady', { url: link.url }));
      }
    });

  const deleteReceivable = (receivable: Receivable) =>
    run(async () => {
      const confirmed = await confirm({
        title: t('receivables.confirmDeleteTitle'),
        message: t('receivables.confirmDeleteMessage', { description: receivable.description }),
        confirmLabel: t('common.delete'),
        cancelLabel: t('common.cancel'),
      });
      if (!confirmed) return;
      await remove.mutateAsync(receivable.id);
      toast.success(t('receivables.deleted'));
    });

  const render = (receivable: Receivable) => {
    const open = receivable.status !== 'paid';
    return (
      <>
        {open && (
          <>
            <Button
              size="sm"
              variant="soft"
              icon={<HandCoins className="h-3.5 w-3.5" />}
              onClick={() => setPaying(receivable)}
            >
              {t('receivables.actions.payShort')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<WhatsAppIcon className="h-3.5 w-3.5" />}
              loading={remind.isPending && remind.variables === receivable.id}
              onClick={() => sendReminder(receivable)}
            >
              {t('receivables.actions.remindShort')}
            </Button>
          </>
        )}
        <Popover
          trigger={({ toggle, ref, open: menuOpen }) => (
            <IconButton
              ref={ref}
              size="sm"
              label={t('common.moreActions')}
              aria-expanded={menuOpen}
              onClick={toggle}
            >
              <MoreHorizontal className="h-4 w-4" />
            </IconButton>
          )}
        >
          {(close) => (
            <MenuItems
              close={close}
              items={[
                {
                  label: t('receivables.actions.payLink'),
                  icon: <Link2 />,
                  onSelect: () => copyPaymentLink(receivable),
                  hidden: !open,
                },
                {
                  label: t('receivables.actions.edit'),
                  icon: <Pencil />,
                  onSelect: () => setEditing(receivable),
                },
                {
                  label: t('receivables.actions.delete'),
                  icon: <Trash2 />,
                  danger: true,
                  hidden: !isAdmin,
                  onSelect: () => deleteReceivable(receivable),
                },
              ]}
            />
          )}
        </Popover>
      </>
    );
  };

  const modals = (
    <>
      <PaymentFormModal
        open={paying !== null}
        receivable={paying}
        onClose={() => setPaying(null)}
      />
      <ReceivableFormModal
        open={editing !== null}
        receivable={editing ?? undefined}
        onClose={() => setEditing(null)}
      />
    </>
  );

  return {
    render,
    modals,
    /** Table shortcuts: right-click edits, double-click deletes (admins, with confirmation). */
    shortcuts: {
      onRowEdit: (receivable: Receivable) => setEditing(receivable),
      ...(isAdmin && { onRowDelete: (receivable: Receivable) => deleteReceivable(receivable) }),
    },
  };
}
