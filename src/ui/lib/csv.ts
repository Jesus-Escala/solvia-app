/**
 * Downloads rows as a CSV file that opens correctly in Excel: UTF-8 with BOM (accents), and `;`
 * as separator for Spanish locales (Excel there expects it), `,` otherwise.
 */
export function downloadCsv(
  fileName: string,
  header: string[],
  rows: Array<Array<string | number | null | undefined>>,
  locale = document.documentElement.lang || navigator.language,
) {
  const separator = locale.startsWith('es') ? ';' : ',';
  const escape = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /["\n\r;,]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [header, ...rows].map((row) => row.map(escape).join(separator)).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: fileName.endsWith('.csv') ? fileName : `${fileName}.csv`,
  });
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
