import QRCode from 'qrcode';
import { escapeHtml } from '../../lib/print';

/**
 * QR labels to print. Two sizes: `product` (50 × 30 mm, stuck on the item) and `shelf` (80 × 50 mm,
 * for gondolas and shelves: the price big). Two ways to print: `sheet` (an A4 page full of labels,
 * cut apart with scissors or printed on adhesive sheets) and `roll` (a label printer: one label
 * per page of its size).
 */
export type LabelSize = 'product' | 'shelf';
export type LabelPaper = 'sheet' | 'roll';

export interface LabelItem {
  name: string;
  price: string;
  code: string;
  /** Unit shown under the price on shelf labels ("por kg"). */
  unit: string | null;
  copies: number;
}

const SIZES: Record<LabelSize, { width: number; height: number; qr: number }> = {
  product: { width: 50, height: 30, qr: 24 },
  shelf: { width: 80, height: 50, qr: 34 },
};

/** Most labels one document prints (keeps the browser responsive). */
export const MAX_LABELS = 600;

/** The HTML document with every label (each item repeated `copies` times). */
export async function buildLabelsHtml({
  items,
  size,
  paper,
  business,
  title,
}: {
  items: LabelItem[];
  size: LabelSize;
  paper: LabelPaper;
  business: string | null;
  title: string;
}): Promise<string> {
  const { width, height, qr } = SIZES[size];
  // One QR picture per product, reused by its copies.
  const images = await Promise.all(
    items.map((item) =>
      QRCode.toDataURL(item.code, { width: 360, margin: 0, errorCorrectionLevel: 'M' }),
    ),
  );
  const labels: string[] = [];
  items.forEach((item, index) => {
    const label = `<div class="label">
      <img src="${images[index]}" alt="">
      <div class="text">
        <div class="name">${escapeHtml(item.name)}</div>
        <div class="price">${escapeHtml(item.price)}</div>
        ${size === 'shelf' && item.unit ? `<div class="unit">${escapeHtml(item.unit)}</div>` : ''}
        <div class="code">${escapeHtml(item.code)}</div>
        ${size === 'shelf' && business ? `<div class="business">${escapeHtml(business)}</div>` : ''}
      </div>
    </div>`;
    for (let copy = 0; copy < item.copies && labels.length < MAX_LABELS; copy += 1) {
      labels.push(label);
    }
  });

  const shelf = size === 'shelf';
  const page =
    paper === 'roll'
      ? `@page { size: ${width}mm ${height}mm; margin: 0; }
         .sheet { display: block; }
         .label { page-break-after: always; break-after: page; }`
      : `@page { size: A4; margin: 8mm; }
         .sheet { display: flex; flex-wrap: wrap; gap: 0; }
         .label { outline: 0.2mm dashed #bbb; break-inside: avoid; }`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      ${page}
      * { box-sizing: border-box; }
      body { margin: 0; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; color: #000; }
      .label { width: ${width}mm; height: ${height}mm; padding: ${shelf ? 3 : 1.8}mm;
        display: flex; align-items: center; gap: ${shelf ? 3 : 2}mm; overflow: hidden; }
      .label img { width: ${qr}mm; height: ${qr}mm; flex-shrink: 0; image-rendering: pixelated; }
      .text { min-width: 0; display: flex; flex-direction: column; justify-content: center; }
      .name { font-weight: 700; font-size: ${shelf ? 11 : 8.5}pt; line-height: 1.15;
        display: -webkit-box; -webkit-line-clamp: ${shelf ? 3 : 2}; -webkit-box-orient: vertical;
        overflow: hidden; }
      .price { font-weight: 800; font-size: ${shelf ? 22 : 12}pt; line-height: 1.1;
        margin-top: ${shelf ? 1.5 : 1}mm; letter-spacing: -0.02em; }
      .unit { font-size: 8pt; color: #333; }
      .code { font-size: ${shelf ? 7.5 : 6.5}pt; color: #333; margin-top: 0.8mm;
        font-family: ui-monospace, Consolas, monospace; }
      .business { font-size: 7pt; color: #555; margin-top: 0.5mm; }
    </style></head><body><div class="sheet">${labels.join('')}</div></body></html>`;
}
