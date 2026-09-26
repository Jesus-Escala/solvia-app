import { Download, Printer, ReceiptText } from 'lucide-react';
import { useState } from 'react';
import { Button, cx, useFeedback, WhatsAppIcon } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { Sale } from '../../lib/types';
import { FileViewer, type ViewerRequest } from '../files/FileViewer';
import { type CashGiven, useSaleTicket } from './saleTicket';

/**
 * What can be done with the ticket of a sale, right after selling or later from its detail: see
 * it (the 80 mm PDF inside the page), print it, send it by WhatsApp or download it.
 */
export function TicketActions({
  sale,
  cash = null,
  className,
}: {
  sale: Sale;
  /** What the customer handed over (only right after selling: printed as received / change). */
  cash?: CashGiven | null;
  className?: string;
}) {
  const { t } = useI18n();
  const { toast } = useFeedback();
  const ticket = useSaleTicket();
  const [viewing, setViewing] = useState<ViewerRequest | null>(null);
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      await ticket.download(sale);
    } catch (error) {
      toast.apiError(error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className={cx('grid grid-cols-2 gap-2 sm:grid-cols-4 [&>button]:px-2', className)}>
        <Button
          variant="secondary"
          icon={<ReceiptText className="h-4 w-4 shrink-0" />}
          onClick={() => setViewing(ticket.viewer(sale))}
        >
          {t('sales.ticket.view')}
        </Button>
        <Button
          variant="secondary"
          icon={<Printer className="h-4 w-4 shrink-0" />}
          onClick={() => ticket.print(sale, cash)}
        >
          {t('sales.ticket.print')}
        </Button>
        <Button
          variant="secondary"
          icon={<WhatsAppIcon className="h-4 w-4 shrink-0" />}
          onClick={() => window.open(ticket.whatsappUrl(sale), '_blank', 'noopener')}
        >
          {t('sales.ticket.send')}
        </Button>
        <Button
          variant="secondary"
          icon={<Download className="h-4 w-4 shrink-0" />}
          loading={downloading}
          onClick={() => void download()}
        >
          {t('sales.ticket.download')}
        </Button>
      </div>
      <FileViewer request={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
