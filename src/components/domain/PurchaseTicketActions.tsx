import { Download, ReceiptText } from 'lucide-react';
import { useState } from 'react';
import { Button, useFeedback } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { api } from '../../lib/api';
import { saveFile } from '../../lib/download';
import type { Purchase } from '../../lib/types';
import { FileViewer, type ViewerRequest } from '../files/FileViewer';

const padNumber = (n: number) => String(n).padStart(6, '0');

/** The record of a purchase as an 80 mm PDF: see it inside the page or download it. */
export function PurchaseTicketActions({ purchase }: { purchase: Purchase }) {
  const { t } = useI18n();
  const { toast } = useFeedback();
  const [viewing, setViewing] = useState<ViewerRequest | null>(null);
  const [downloading, setDownloading] = useState(false);
  const path = `/purchases/${purchase.id}/ticket`;
  const fileName = `compra-${padNumber(purchase.number)}.pdf`;

  const download = async () => {
    setDownloading(true);
    try {
      const file = await api.file(path);
      saveFile(file.blob, file.fileName ?? fileName);
    } catch (error) {
      toast.apiError(error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          icon={<ReceiptText className="h-4 w-4 shrink-0" />}
          onClick={() =>
            setViewing({
              kind: 'pdf',
              title: t('purchases.ticket', { number: purchase.number }),
              fileName,
              pageWidth: 360,
              load: () => api.file(path),
            })
          }
        >
          {t('purchases.viewTicket')}
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
