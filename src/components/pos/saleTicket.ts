import { useMe } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import { api } from '../../lib/api';
import { saveFile } from '../../lib/download';
import { escapeHtml as escape, printHtml } from '../../lib/print';
import type { Sale } from '../../lib/types';
import type { ViewerRequest } from '../files/FileViewer';

/** What the customer handed over for a cash sale (only known right after selling). */
export interface CashGiven {
  received: number;
  change: number;
}

const padNumber = (n: number) => String(n).padStart(6, '0');

/**
 * The ticket of a sale, laid out like a receipt roll (80 mm): the business, number, date and
 * time, customer, lines in columns (quantity, description, amount), totals and how it was paid.
 * Printable (receipt printers or any printer), as an 80 mm PDF from the API (to see inside the
 * page or download) and as a WhatsApp message. A courtesy ticket, not an electronic receipt.
 */
export function useSaleTicket() {
  const { t, fmt } = useI18n();
  const { data: me } = useMe();
  const business = me?.tenant.name ?? 'Solvia';
  /** Amounts without the currency, 2 decimals (the column of the lines). */
  const plain = (value: number) => fmt.money(value).replace(/^[^\d-]+/, '');
  const time = (iso: string) =>
    new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(
      new Date(iso),
    );

  const print = (sale: Sale, cash: CashGiven | null) => {
    const pair = (label: string, value: string, strong = false) =>
      `<tr${strong ? ' class="strong"' : ''}><td>${escape(label)}</td><td class="r">${escape(value)}</td></tr>`;
    const lines = sale.items
      .map(
        (item) =>
          `<tr><td class="q">${escape(fmt.number(item.quantity))}</td><td>${escape(item.description)}<div class="unit">x ${escape(fmt.money(item.unitPrice))}</div></td><td class="r">${escape(plain(item.subtotal))}</td></tr>`,
      )
      .join('');
    const count = sale.items.reduce((sum, item) => sum + item.quantity, 0);
    const paid =
      sale.paymentType === 'credit'
        ? pair(t('sales.ticket.paid'), t('sales.types.credit')) +
          (sale.receivable && sale.receivable.paid > 0
            ? pair(t('sales.ticket.downPayment'), fmt.money(sale.receivable.paid))
            : '') +
          (sale.receivable
            ? pair(t('sales.ticket.owes'), fmt.money(sale.receivable.outstanding), true)
            : '')
        : sale.payments.length > 1
          ? pair(t('sales.ticket.paid'), '') +
            sale.payments
              .map((part) => pair(`  ${t(`methods.${part.method}`)}`, fmt.money(part.amount)))
              .join('')
          : sale.method
            ? pair(t('sales.ticket.paid'), t(`methods.${sale.method}`))
            : '';
    const totals = [
      sale.discount > 0 ? pair(t('sales.ticket.subtotal'), fmt.money(sale.subtotal)) : '',
      sale.discount > 0 ? pair(t('sales.ticket.discount'), `-${fmt.money(sale.discount)}`) : '',
      pair(t('sales.ticket.total'), fmt.money(sale.total), true),
    ].join('');
    const given = cash
      ? pair(t('sales.ticket.received'), fmt.money(cash.received)) +
        (cash.change > 0 ? pair(t('sales.ticket.change'), fmt.money(cash.change)) : '')
      : '';
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escape(
      t('sales.ticket.title', { number: padNumber(sale.number) }),
    )}</title><style>
      @page { size: 80mm auto; margin: 3mm; }
      * { box-sizing: border-box; }
      body { font: 12px/1.35 ui-monospace, Menlo, Consolas, 'Courier New', monospace; color: #000; margin: 0; width: 74mm; }
      h1 { font: 700 17px/1.2 system-ui, sans-serif; text-align: center; margin: 0 0 4px; }
      p { margin: 0; text-align: center; }
      .head { font-weight: 700; letter-spacing: .04em; }
      table { width: 100%; border-collapse: collapse; }
      td, th { padding: 1px 0; vertical-align: top; text-align: left; }
      th { font-size: 11px; }
      .q { width: 11mm; }
      .r { text-align: right; white-space: nowrap; padding-left: 6px; }
      .unit { font-size: 10.5px; color: #333; }
      .strong td { font-weight: 700; font-size: 15px; padding-top: 2px; }
      .small { font-size: 10.5px; }
      hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
    </style></head><body>
      <h1>${escape(business)}</h1>
      <p class="head">${escape(t('sales.ticket.header'))}</p>
      <p>${escape(t('sales.ticket.number', { number: padNumber(sale.number) }))}</p>
      <p>${escape(fmt.date(sale.date))} ${escape(time(sale.createdAt))}</p>
      ${sale.docType !== 'none' ? `<p>${escape(t(`sales.docTypes.${sale.docType}`))} ${escape(sale.docNumber ?? '')}</p>` : ''}
      ${sale.status === 'voided' ? `<p class="head">*** ${escape(t('sales.voidedBadge'))} ***</p>` : ''}
      <hr><div>${escape(t('sales.ticket.customer', { name: sale.customer?.name ?? t('sales.walkIn') }))}</div><hr>
      <table><thead><tr><th class="q">${escape(t('sales.ticket.quantity'))}</th><th>${escape(t('sales.ticket.description'))}</th><th class="r">${escape(t('sales.ticket.amount'))}</th></tr></thead><tbody>${lines}</tbody></table>
      <hr><div class="small">${escape(t('sales.ticket.items', { count }))}</div>
      <table>${totals}</table><table style="margin-top:4px">${paid}${given}</table>
      ${sale.notes ? `<hr><div class="small">${escape(sale.notes)}</div>` : ''}
      <hr><p class="head">${escape(t('sales.ticket.thanks'))}</p>
      <p class="small">${escape(t('sales.ticket.notReceipt'))}</p>
    </body></html>`;
    printHtml(html);
  };

  /**
   * WhatsApp with the ticket written out, to the customer's number (or, without one, to the
   * contact chosen in WhatsApp).
   */
  const whatsappUrl = (sale: Sale): string => {
    const phone = sale.customer?.phone.replace(/\D/g, '') ?? '';
    const rule = '------------------------------';
    const paid =
      sale.paymentType === 'credit'
        ? sale.receivable && sale.receivable.outstanding > 0
          ? t('sales.ticket.whatsappOwes', { amount: fmt.money(sale.receivable.outstanding) })
          : ''
        : sale.payments.length > 0
          ? `${t('sales.ticket.paid')}: ${sale.payments
              .map((part) =>
                sale.payments.length > 1
                  ? `${t(`methods.${part.method}`)} ${fmt.money(part.amount)}`
                  : t(`methods.${part.method}`),
              )
              .join(' + ')}`
          : '';
    const text = [
      ...(sale.customer
        ? [
            t('sales.ticket.greeting', {
              name: sale.customer.name.split(' ')[0] ?? sale.customer.name,
            }),
          ]
        : []),
      `*${business}*`,
      `${t('sales.ticket.title', { number: padNumber(sale.number) })} · ${fmt.date(sale.date)}`,
      rule,
      ...sale.items.map(
        (item) =>
          `${fmt.number(item.quantity)} x ${item.description} — ${fmt.money(item.subtotal)}`,
      ),
      rule,
      ...(sale.discount > 0 ? [`${t('sales.ticket.discount')}: -${fmt.money(sale.discount)}`] : []),
      `*${t('sales.ticket.total')}: ${fmt.money(sale.total)}*`,
      ...(paid ? [paid] : []),
      '',
      t('sales.ticket.thanks'),
    ].join('\n');
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  /** The 80 mm PDF from the API, to see inside the page (with its download button). */
  const viewer = (sale: Sale): ViewerRequest => ({
    kind: 'pdf',
    title: t('sales.ticket.title', { number: padNumber(sale.number) }),
    fileName: `ticket-${padNumber(sale.number)}.pdf`,
    pageWidth: 360,
    load: () => api.file(`/sales/${sale.id}/ticket`),
  });

  const download = async (sale: Sale) => {
    const file = await api.file(`/sales/${sale.id}/ticket`);
    saveFile(file.blob, file.fileName ?? `ticket-${padNumber(sale.number)}.pdf`);
  };

  return { print, whatsappUrl, viewer, download };
}
