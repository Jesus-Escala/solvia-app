import { Download, Printer } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Button, Modal, Skeleton } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { Product } from '../../lib/types';

/**
 * The QR code of a product: its unique code (its own barcode, or the internal one Solvia gave
 * it), ready to download or to print as labels (the label printer). Any scanner that
 * reads QR codes adds the product to a sale or a purchase.
 */
export function ProductQrModal({
  product,
  onClose,
  onPrint,
}: {
  product: Product | null;
  onClose: () => void;
  /** Opens the label printer with this product. */
  onPrint: (product: Product) => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={product !== null}
      title={t('products.qr.title')}
      description={t('products.qr.description')}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {product && <QrLabel product={product} onPrint={() => onPrint(product)} />}
    </Modal>
  );
}

function QrLabel({ product, onPrint }: { product: Product; onPrint: () => void }) {
  const { t, fmt } = useI18n();
  const code = product.code ?? '';
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void QRCode.toDataURL(code, { width: 480, margin: 1, errorCorrectionLevel: 'M' }).then(
      (url) => {
        if (alive) setImage(url);
      },
    );
    return () => {
      alive = false;
    };
  }, [code]);

  return (
    <div className="space-y-5">
      {/* Always black on white, also in dark mode: that is what scanners read best. */}
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-white p-5 text-center text-slate-900">
        {image ? (
          <img
            src={image}
            alt={t('products.qr.alt', { name: product.name })}
            className="h-56 w-56"
          />
        ) : (
          <Skeleton className="h-56 w-56" />
        )}
        <div>
          <p className="font-semibold">{product.name}</p>
          <p className="font-display text-2xl font-semibold tabular-nums">
            {fmt.money(product.price)}
          </p>
          <p className="mt-1 font-mono text-sm tracking-wider text-slate-500">{code}</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button icon={<Printer className="h-4 w-4" />} onClick={onPrint}>
          {t('products.qr.print')}
        </Button>
        {image ? (
          <a
            href={image}
            download={`${product.name.replace(/[^\w\- ]+/g, '').trim() || 'producto'}-${code}.png`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold transition hover:bg-surface-2"
          >
            <Download className="h-4 w-4" />
            {t('products.qr.download')}
          </a>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
