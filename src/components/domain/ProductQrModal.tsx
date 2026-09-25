import { Download, Printer } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Button, Modal, Skeleton } from '@/ui';
import { useMe } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { Product } from '../../lib/types';

const escape = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/**
 * The QR code of a product: its unique code (its own barcode, or the internal one Solvia gave
 * it), ready to download or to print as a label with the name and the price. Any scanner that
 * reads QR codes adds the product to a sale or a purchase.
 */
export function ProductQrModal({
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
      title={t('products.qr.title')}
      description={t('products.qr.description')}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      {product && <QrLabel product={product} />}
    </Modal>
  );
}

function QrLabel({ product }: { product: Product }) {
  const { t, fmt } = useI18n();
  const { data: me } = useMe();
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

  /** A 50 × 30 mm label (thermal label printers or any printer) through a hidden frame. */
  const print = () => {
    if (!image) return;
    const frame = document.createElement('iframe');
    Object.assign(frame.style, { position: 'fixed', width: '0', height: '0', border: '0' });
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    const view = frame.contentWindow;
    if (!doc || !view) return frame.remove();
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escape(product.name)}</title>
      <style>
        @page { size: 50mm 30mm; margin: 1.5mm; }
        body { margin: 0; font: 9px/1.2 system-ui, sans-serif; color: #000; }
        .label { display: flex; gap: 2mm; align-items: center; height: 27mm; }
        img { width: 25mm; height: 25mm; }
        .name { font-weight: 700; font-size: 10px; max-height: 3.6em; overflow: hidden; }
        .price { font-size: 14px; font-weight: 800; margin-top: 1.5mm; }
        .meta { color: #333; margin-top: 1mm; }
      </style></head><body><div class="label">
        <img src="${image}" alt="">
        <div><div class="name">${escape(product.name)}</div>
        <div class="price">${escape(fmt.money(product.price))}</div>
        <div class="meta">${escape(code)}</div>
        ${me?.tenant ? `<div class="meta">${escape(me.tenant.name)}</div>` : ''}</div>
      </div></body></html>`);
    doc.close();
    // Wait for the QR picture before printing.
    const img = doc.querySelector('img');
    const go = () => {
      view.focus();
      view.print();
      window.setTimeout(() => frame.remove(), 60_000);
    };
    if (img && !img.complete) img.onload = go;
    else go();
  };

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
        <Button variant="secondary" icon={<Printer className="h-4 w-4" />} onClick={print}>
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
