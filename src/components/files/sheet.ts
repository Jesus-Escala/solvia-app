/**
 * Reads an Excel file into a light grid for the in-page preview (SheetJS, loaded on demand).
 * Only the first rows/columns are kept: the preview is for looking, the download has everything.
 */

export type CellKind = 'text' | 'number' | 'date' | 'boolean' | 'error';

export interface SheetCell {
  text: string;
  kind: CellKind;
  colspan: number;
  rowspan: number;
  bold: boolean;
}

export interface SheetPreview {
  name: string;
  columns: Array<{ letter: string; width: number }>;
  rows: SheetCell[][];
  firstRow: number;
  totalRows: number;
  totalColumns: number;
  truncated: boolean;
}

const MAX_ROWS = 500;
const MAX_COLUMNS = 40;
const DEFAULT_WIDTH = 96;

type Xlsx = typeof import('xlsx');
type WorkSheet = import('xlsx').WorkSheet;

export async function readSheets(blob: Blob): Promise<SheetPreview[]> {
  const xlsx = await import('xlsx');
  const workbook = xlsx.read(new Uint8Array(await blob.arrayBuffer()), {
    type: 'array',
    cellDates: true,
    cellStyles: true,
  });
  return workbook.SheetNames.map((name) => readSheet(xlsx, workbook.Sheets[name], name)).filter(
    (sheet) => sheet.rows.length > 0,
  );
}

function kindOf(type: string | undefined): CellKind {
  if (type === 'n') return 'number';
  if (type === 'd') return 'date';
  if (type === 'b') return 'boolean';
  if (type === 'e') return 'error';
  return 'text';
}

function readSheet(xlsx: Xlsx, sheet: WorkSheet | undefined, name: string): SheetPreview {
  const ref = sheet?.['!ref'];
  if (!sheet || !ref) {
    return {
      name,
      columns: [],
      rows: [],
      firstRow: 1,
      totalRows: 0,
      totalColumns: 0,
      truncated: false,
    };
  }
  const range = xlsx.utils.decode_range(ref);
  const totalRows = range.e.r - range.s.r + 1;
  const totalColumns = range.e.c - range.s.c + 1;
  const height = Math.min(totalRows, MAX_ROWS);
  const width = Math.min(totalColumns, MAX_COLUMNS);

  // Merged cells: the top-left one spans, the rest are skipped.
  const covered = new Set<string>();
  const spans = new Map<string, { colspan: number; rowspan: number }>();
  for (const merge of sheet['!merges'] ?? []) {
    spans.set(`${merge.s.r}:${merge.s.c}`, {
      colspan: merge.e.c - merge.s.c + 1,
      rowspan: merge.e.r - merge.s.r + 1,
    });
    for (let r = merge.s.r; r <= merge.e.r; r += 1) {
      for (let c = merge.s.c; c <= merge.e.c; c += 1) {
        if (r !== merge.s.r || c !== merge.s.c) covered.add(`${r}:${c}`);
      }
    }
  }

  const widths = sheet['!cols'] ?? [];
  const columns = Array.from({ length: width }, (_, j) => {
    const column = widths[range.s.c + j];
    // Character widths are closer to what Excel shows than SheetJS's pixel estimate.
    const px = column?.wch ? Math.round(column.wch * 7.5 + 12) : (column?.wpx ?? DEFAULT_WIDTH);
    return { letter: xlsx.utils.encode_col(range.s.c + j), width: Math.min(Math.max(px, 48), 360) };
  });

  const rows: SheetCell[][] = [];
  for (let i = 0; i < height; i += 1) {
    const r = range.s.r + i;
    const row: SheetCell[] = [];
    for (let j = 0; j < width; j += 1) {
      const c = range.s.c + j;
      const key = `${r}:${c}`;
      if (covered.has(key)) continue;
      const cell = sheet[xlsx.utils.encode_cell({ r, c })] as import('xlsx').CellObject | undefined;
      const span = spans.get(key);
      const style = cell?.s as { font?: { bold?: boolean } } | undefined;
      row.push({
        text: cell ? xlsx.utils.format_cell(cell) : '',
        kind: kindOf(cell?.t),
        colspan: Math.min(span?.colspan ?? 1, width - j),
        rowspan: Math.min(span?.rowspan ?? 1, height - i),
        bold: Boolean(style?.font?.bold),
      });
    }
    rows.push(row);
  }

  return {
    name,
    columns,
    rows,
    firstRow: range.s.r + 1,
    totalRows,
    totalColumns,
    truncated: totalRows > MAX_ROWS || totalColumns > MAX_COLUMNS,
  };
}
