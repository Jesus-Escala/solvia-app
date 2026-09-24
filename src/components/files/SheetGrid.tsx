import { Sheet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cx, Spinner } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { readSheets, type SheetPreview } from './sheet';

/** An Excel file shown like a spreadsheet: column letters, row numbers and one tab per sheet. */
export function SheetGrid({ blob, onError }: { blob: Blob; onError: (error: unknown) => void }) {
  const { t } = useI18n();
  const [sheets, setSheets] = useState<SheetPreview[] | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    readSheets(blob)
      .then((result) => {
        if (!cancelled) setSheets(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) onError(error);
      });
    return () => {
      cancelled = true;
    };
  }, [blob, onError]);

  if (!sheets) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }
  const sheet = sheets[active] ?? null;
  if (!sheet) {
    return <p className="p-6 text-center text-sm text-muted">{t('viewer.emptySheet')}</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto bg-surface">
        <table
          className="table-fixed border-separate border-spacing-0 text-[13px]"
          style={{ width: 44 + sheet.columns.reduce((sum, column) => sum + column.width, 0) }}
        >
          <colgroup>
            <col style={{ width: 44 }} />
            {sheet.columns.map((column) => (
              <col key={column.letter} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 border-r border-b border-line bg-surface-3" />
              {sheet.columns.map((column) => (
                <th
                  key={column.letter}
                  className="sticky top-0 z-10 border-r border-b border-line bg-surface-2 px-2 py-1 text-center text-[11px] font-medium text-subtle"
                >
                  {column.letter}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, index) => (
              <tr key={index}>
                <th className="sticky left-0 z-10 border-r border-b border-line bg-surface-2 px-2 py-1 text-right text-[11px] font-medium text-subtle tabular-nums">
                  {sheet.firstRow + index}
                </th>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    colSpan={cell.colspan > 1 ? cell.colspan : undefined}
                    rowSpan={cell.rowspan > 1 ? cell.rowspan : undefined}
                    title={cell.text}
                    className={cx(
                      'border-r border-b border-line/70 px-2 py-1 whitespace-nowrap',
                      // Like Excel, text runs over into the empty cells on its right.
                      cell.kind === 'text' && cell.text && row[cellIndex + 1]?.text === ''
                        ? 'relative z-[1] overflow-visible'
                        : 'max-w-0 truncate',
                      (cell.kind === 'number' || cell.kind === 'date') && 'text-right tabular-nums',
                      cell.bold && 'font-semibold',
                      cell.kind === 'error' && 'text-danger-ink',
                    )}
                  >
                    {cell.text}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-surface-2 px-3 py-1.5 text-xs text-muted">
        {sheets.length > 1 && (
          <div className="flex gap-1">
            {sheets.map((item, index) => (
              <button
                key={item.name}
                type="button"
                onClick={() => setActive(index)}
                className={cx(
                  'inline-flex items-center gap-1 rounded-md px-2 py-0.5',
                  index === active
                    ? 'bg-surface font-semibold text-ink shadow-xs'
                    : 'hover:text-ink',
                )}
              >
                <Sheet className="h-3.5 w-3.5" />
                {item.name}
              </button>
            ))}
          </div>
        )}
        {sheets.length === 1 && (
          <span className="inline-flex items-center gap-1 font-medium text-ink">
            <Sheet className="h-3.5 w-3.5 text-success-ink" />
            {sheet.name}
          </span>
        )}
        <span>{t('viewer.size', { rows: sheet.totalRows, columns: sheet.totalColumns })}</span>
        {sheet.truncated && <span>{t('viewer.truncated', { rows: sheet.rows.length })}</span>}
      </div>
    </div>
  );
}
