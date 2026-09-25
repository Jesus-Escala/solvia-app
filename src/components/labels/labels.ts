import QRCode from 'qrcode';
import { escapeHtml } from '../../lib/print';

/**
 * QR labels to print, designed like supermarket price tags. Two sizes: `shelf` (80 × 50 mm, for
 * gondolas and shelves: the name on top, a big price with small cents, the QR on the side and the
 * business and code at the bottom) and `product` (50 × 30 mm, stuck on the item: QR, name and
 * price). Two ways to print: `sheet` (an A4 page full of labels with a little space between them,
 * to cut or on adhesive sheets) and `roll` (a label printer: one label per page of its size).
 */
export type LabelSize = 'product' | 'shelf';
export type LabelPaper = 'sheet' | 'roll';

export interface LabelItem {
  name: string;
  /** Price in soles. */
  price: number;
  code: string;
  /** Under the price on shelf labels ("por kg"); null for units and services. */
  unit: string | null;
  copies: number;
}

const SIZES: Record<LabelSize, { width: number; height: number }> = {
  product: { width: 50, height: 30 },
  shelf: { width: 80, height: 50 },
};

/** Most labels one document prints (keeps the browser responsive). */
export const MAX_LABELS = 600;

/** "S/" + whole soles + cents, apart, so the cents can be printed small. */
function priceParts(price: number) {
  const cents = Math.round(price * 100);
  const whole = Math.floor(cents / 100).toLocaleString('es-PE');
  return { whole, cents: String(cents % 100).padStart(2, '0') };
}

function labelHtml(item: LabelItem, qr: string, size: LabelSize, business: string | null) {
  const { whole, cents } = priceParts(item.price);
  const price = `<div class="price"><span class="cur">S/</span><span class="whole">${escapeHtml(
    whole,
  )}</span><span class="cents">.${cents}</span></div>`;
  if (size === 'product') {
    return `<div class="label product">
      <img class="qr" src="${qr}" alt="">
      <div class="info">
        <div class="name">${escapeHtml(item.name)}</div>
        ${price}
        <div class="code">${escapeHtml(item.code)}</div>
      </div>
    </div>`;
  }
  return `<div class="label shelf">
    <div class="name">${escapeHtml(item.name)}</div>
    <div class="middle">
      <div class="pricebox">
        ${price}
        ${item.unit ? `<div class="unit">${escapeHtml(item.unit)}</div>` : ''}
      </div>
      <img class="qr" src="${qr}" alt="">
    </div>
    <div class="foot">
      <span class="biz">${escapeHtml(business ?? '')}</span>
      <span class="code">${escapeHtml(item.code)}</span>
    </div>
  </div>`;
}

const STYLE = `
  * { box-sizing: border-box; }
  body { margin: 0; color: #111; font-family: 'Segoe UI', Roboto, system-ui, -apple-system, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .label { overflow: hidden; background: #fff; }
  .qr { display: block; image-rendering: pixelated; }
  .price { display: flex; align-items: flex-start; font-weight: 800; line-height: 1; letter-spacing: -0.03em; }
  .cur { font-size: 0.42em; margin: 0.12em 0.12em 0 0; }
  .cents { font-size: 0.45em; margin-top: 0.1em; }
  .code { font-family: ui-monospace, Consolas, monospace; letter-spacing: 0.04em; color: #444; }

  /* Shelf: name band, big price + QR, business and code at the bottom. */
  .shelf { width: 80mm; height: 50mm; display: flex; flex-direction: column; padding: 2.6mm 3mm 2mm; }
  .shelf .name { font-size: 10.5pt; font-weight: 700; line-height: 1.15; text-transform: uppercase;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    padding-bottom: 1.6mm; border-bottom: 0.5mm solid #111; }
  .shelf .middle { flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 2mm; min-height: 0; }
  .shelf .price { font-size: 34pt; }
  .shelf .unit { font-size: 8pt; color: #444; margin-top: 0.8mm; font-weight: 600; }
  .shelf .qr { width: 23mm; height: 23mm; }
  .shelf .foot { display: flex; justify-content: space-between; align-items: center; gap: 2mm;
    border-top: 0.25mm solid #bbb; padding-top: 1mm; font-size: 6.5pt; color: #444; }
  .shelf .biz { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Product: QR on the left, name and price on the right. */
  .product { width: 50mm; height: 30mm; display: flex; align-items: center; gap: 2mm; padding: 2mm; }
  .product .qr { width: 21mm; height: 21mm; flex-shrink: 0; }
  .product .info { min-width: 0; display: flex; flex-direction: column; gap: 0.8mm; }
  .product .name { font-size: 7.5pt; font-weight: 700; line-height: 1.15;
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .product .price { font-size: 15pt; }
  .product .code { font-size: 5.5pt; }
`;

/** The HTML document with every label (each item repeated `copies` times). */
export async function buildLabelsHtml({
  items,
  size,
  paper,
  business,
  title,
  preview = false,
}: {
  items: LabelItem[];
  size: LabelSize;
  paper: LabelPaper;
  business: string | null;
  title: string;
  /** For the on-screen preview: no page setup, the label centered on a light background. */
  preview?: boolean;
}): Promise<string> {
  const { width, height } = SIZES[size];
  // One QR picture per product, reused by its copies.
  const images = await Promise.all(
    items.map((item) =>
      QRCode.toDataURL(item.code, { width: 360, margin: 0, errorCorrectionLevel: 'M' }),
    ),
  );
  const labels: string[] = [];
  items.forEach((item, index) => {
    const label = labelHtml(item, images[index]!, size, business);
    for (let copy = 0; copy < item.copies && labels.length < MAX_LABELS; copy += 1) {
      labels.push(label);
    }
  });

  const page = preview
    ? `html, body { height: 100%; } body { display: flex; align-items: center; justify-content: center;
         background: #eef0ee; }
       .label { border-radius: 2.5mm; box-shadow: 0 2px 10px rgba(0,0,0,.15); }
`
    : paper === 'roll'
      ? `@page { size: ${width}mm ${height}mm; margin: 0; }
         .label { page-break-after: always; break-after: page; }`
      : `@page { size: A4; margin: 7mm; }
         .sheet { display: flex; flex-wrap: wrap; gap: 3mm; align-content: flex-start; }
         .label { border: 0.3mm solid #999; border-radius: 2mm; break-inside: avoid; }`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>${STYLE}${page}</style></head>
    <body><div class="sheet">${labels.join('')}</div>${
      preview
        ? // On screen the label fills the preview box (bigger or smaller than its real size).
          `<script>
            const fit = () => {
              const sheet = document.querySelector('.sheet');
              const label = document.querySelector('.label');
              if (!sheet || !label) return;
              sheet.style.zoom = 1;
              const k = Math.min((innerWidth - 24) / label.offsetWidth, (innerHeight - 24) / label.offsetHeight, 2.2);
              sheet.style.zoom = k;
            };
            addEventListener('resize', fit);
            addEventListener('load', fit);
            fit();
          </script>`
        : ''
    }</body></html>`;
}
