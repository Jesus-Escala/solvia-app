import { Download, Printer, ReceiptText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, cx, useFeedback, WhatsAppIcon } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { api } from '../../lib/api';
import { saveFile } from '../../lib/download';
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
  // The PDF is fetched ahead, so sharing starts right on the tap (browsers only share then).
  const pdf = useQuery({
    queryKey: ['sales', sale.id, 'ticket', sale.status],
    queryFn: async () => {
      const file = await api.file(`/sales/${sale.id}/ticket`);
      const name = file.fileName ?? `ticket-${sale.number}.pdf`;
      return new File([file.blob], name, { type: 'application/pdf' });
    },
    staleTime: Infinity,
  });

  /**
   * WhatsApp with the PDF: the device's share menu (phones, Windows…) with the file attached, to
   * pick WhatsApp and the contact. Without it, the PDF is downloaded and the chat opens with the
   * ticket written out, to attach the file there.
   */
  const sendWhatsApp = async () => {
    const file = pdf.data ?? null;
    if (file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: file.name });
        return;
      } catch (error) {
        // Closing the menu is not an error; anything else falls back to the chat.
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    window.open(ticket.whatsappUrl(sale), '_blank', 'noopener');
    if (file) {
      saveFile(file, file.name);
      toast.info(t('sales.ticket.attachTitle'), t('sales.ticket.attachHint'));
    }
  };

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
          onClick={() => void sendWhatsApp()}
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
