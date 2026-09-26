import { useMe } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import { escapeHtml as escape, printHtml } from '../../lib/print';
import type { Sale } from '../../lib/types';

/** What the customer handed over for a cash sale (only known right after selling). */
export interface CashGiven {
  received: number;
  change: number;
}

/**
 * The ticket of a sale: printable (80 mm receipt printers or any printer) and as a WhatsApp
 * message for the customer. It is a courtesy ticket, not an electronic receipt.
 */
export function useSaleTicket() {
  const { t, fmt } = useI18n();
  const { data: me } = useMe();
  const business = me?.tenant.name ?? 'Solvia';

  const print = (sale: Sale, cash: CashGiven | null) => {
    const row = (label: string, value: string, strong = false) =>
      `<tr${strong ? ' class="strong"' : ''}><td>${escape(label)}</td><td class="r">${escape(value)}</td></tr>`;
    const lines = sale.items
      .map(
        (item) =>
          `<tr><td colspan="2">${escape(item.description)}</td></tr>` +
          row(
            `${fmt.number(item.quantity)} × ${fmt.money(item.unitPrice)}`,
            fmt.money(item.subtotal),
          ),
      )
      .join('');
    const totals = [
      sale.discount > 0 ? row(t('sales.ticket.subtotal'), fmt.money(sale.subtotal)) : '',
      sale.discount > 0 ? row(t('sales.ticket.discount'), `−${fmt.money(sale.discount)}`) : '',
      row(t('sales.ticket.total'), fmt.money(sale.total), true),
      sale.paymentType === 'cash' && sale.payments.length > 1
        ? row(t('sales.ticket.paid'), '') +
          sale.payments
            .map((part) => row(`· ${t(`methods.${part.method}`)}`, fmt.money(part.amount)))
            .join('')
        : sale.paymentType === 'cash' && sale.method
          ? row(t('sales.ticket.paid'), t(`methods.${sale.method}`))
          : '',
      cash ? row(t('sales.ticket.received'), fmt.money(cash.received)) : '',
      cash && cash.change > 0 ? row(t('sales.ticket.change'), fmt.money(cash.change)) : '',
      sale.receivable && sale.receivable.paid > 0
        ? row(t('sales.ticket.downPayment'), fmt.money(sale.receivable.paid))
        : '',
      sale.receivable
        ? row(t('sales.ticket.owes'), fmt.money(sale.receivable.outstanding), true)
        : '',
    ].join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escape(
      t('sales.ticket.sale', { number: sale.number }),
    )}</title><style>
      @page { size: 80mm auto; margin: 4mm; }
      body { font: 12px/1.35 ui-monospace, Menlo, Consolas, monospace; color: #000; margin: 0; }
      h1 { font-size: 15px; text-align: center; margin: 0 0 2px; }
      p { margin: 0; text-align: center; }
      table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      td { padding: 1px 0; vertical-align: top; }
      .r { text-align: right; white-space: nowrap; padding-left: 8px; }
      .strong td { font-weight: 700; font-size: 13px; }
      hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
      .muted { color: #333; }
    </style></head><body>
      <h1>${escape(business)}</h1>
      <p>${escape(t('sales.ticket.sale', { number: sale.number }))} · ${escape(fmt.date(sale.date))}</p>
      ${sale.docType !== 'none' ? `<p class="muted">${escape(t(`sales.docTypes.${sale.docType}`))} ${escape(sale.docNumber ?? '')}</p>` : ''}
      ${sale.customer ? `<p class="muted">${escape(t('sales.ticket.customer', { name: sale.customer.name }))}</p>` : ''}
      <hr><table>${lines}</table><hr><table>${totals}</table>
      ${sale.notes ? `<hr><p class="muted">${escape(sale.notes)}</p>` : ''}
      <hr><p>${escape(t('sales.ticket.thanks'))}</p>
    </body></html>`;
    printHtml(html);
  };

  /** Chat with the customer with the ticket ready to send, or null without a phone. */
  const whatsappUrl = (sale: Sale): string | null => {
    const phone = sale.customer?.phone.replace(/\D/g, '') ?? '';
    if (!sale.customer || phone === '') return null;
    const items = sale.items
      .map((item) =>
        item.quantity === 1
          ? item.description
          : `${item.description} ×${fmt.number(item.quantity)}`,
      )
      .join(', ');
    const text = [
      t('sales.ticket.whatsapp', {
        name: sale.customer.name.split(' ')[0] ?? sale.customer.name,
        business,
        number: sale.number,
        items,
        total: fmt.money(sale.total),
      }),
      sale.receivable && sale.receivable.outstanding > 0
        ? t('sales.ticket.whatsappOwes', { amount: fmt.money(sale.receivable.outstanding) })
        : '',
    ]
      .filter(Boolean)
      .join('\n');
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  return { print, whatsappUrl };
}
