import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { cx } from '@/ui';

/** The QR code of a product code as a small picture (drawn in the browser). */
export function QrImage({
  code,
  size = 64,
  className,
}: {
  code: string;
  size?: number;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(code, { width: size * 3, margin: 1, errorCorrectionLevel: 'M' }).then(
      (data) => {
        if (!cancelled) setUrl(data);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [code, size]);
  return (
    <span
      className={cx('block shrink-0 rounded-lg border border-line bg-white p-1', className)}
      style={{ width: size, height: size }}
    >
      {url && <img src={url} alt="" className="h-full w-full [image-rendering:pixelated]" />}
    </span>
  );
}
