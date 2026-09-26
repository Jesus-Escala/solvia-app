import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Columns3 } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { useMinimumLoading } from '../hooks/useMinimumLoading';
import { useUiI18n } from '../i18n/context';
import { IconButton } from './Button';
import { cx } from './cx';
import { EmptyState, Skeleton } from './Feedback';
import { FilterFoldButton } from './FilterFold';
import { smallButtonClass } from './buttonStyles';
import { LoadingPill } from './LoadingOverlay';
import { Popover } from './Overlays';

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Minimum column width in px (the table scrolls horizontally when needed). */
  minWidth?: number;
  /**
   * Widest the cell content gets in px before it is cut with "…" (default 320). Every row keeps
   * the same height: cells never wrap to more lines.
   */
  maxWidth?: number;
  sortable?: boolean;
  /**
   * Value to sort by in the browser, for tables whose rows are all loaded (no `onSortChange`):
   * the header becomes clickable. Empty values always go last.
   */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Can the user hide this column from the columns menu? Default: true. */
  hideable?: boolean;
  defaultHidden?: boolean;
  /** How the column appears in the mobile card view. Default: 'field' (label + value). */
  mobile?: 'title' | 'subtitle' | 'aside' | 'field' | 'hidden';
  className?: string;
}

const DEFAULT_CELL_MAX_WIDTH = 320;

export interface DataTableSort {
  id: string;
  dir: 'asc' | 'desc';
}

export interface DataTablePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export interface DataTableProps<T> extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  columns: Array<DataTableColumn<T>>;
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  /** First load: shows skeleton rows. */
  loading?: boolean;
  /** Background refetch: shows a thin progress bar and keeps the current rows. */
  fetching?: boolean;
  /** Rendered above the rows (e.g. an <Alert>) when the query failed. */
  error?: ReactNode;
  empty?: { title: string; description?: string; action?: ReactNode };
  onRowClick?: (row: T) => void;
  /** Shortcut: right-click on a row (long press on phones) opens its edit form. */
  onRowEdit?: (row: T) => void;
  /** Shortcut: double-click on a row deletes it (the page must ask for confirmation). */
  onRowDelete?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;
  sort?: DataTableSort;
  /**
   * Server-side sorting. Each header cycles ascending → descending → back to the default order
   * (`null`: the page should restore its default sort).
   */
  onSortChange?: (sort: DataTableSort | null) => void;
  pagination?: DataTablePagination;
  /** The search box: first in the toolbar; on phones a full-width row of its own. */
  search?: ReactNode;
  /** Filters of the toolbar; on phones each one on a full line, every option visible. */
  toolbar?: ReactNode;
  /**
   * Phones: the filters fold under a "Filtros" button so the list keeps its room (the standard;
   * false shows them always). `filtersActive` is how many are in use, shown on the button.
   */
  foldFilters?: boolean;
  filtersActive?: number | null;
  /**
   * Phones: how many detail fields a card shows before "Ver más" (the rest open per card), so one
   * card never takes the whole screen.
   */
  mobileFields?: number;
  /** Right side of the toolbar (extra buttons). */
  toolbarEnd?: ReactNode;
  /** Persist column visibility in localStorage under this key. */
  columnsStorageKey?: string;
  /**
   * `true` (default): the table is as tall as its rows need, but never taller than the space left
   * in its flex parent; beyond that only its body scrolls, so the page itself never scrolls.
   * `false`: natural height up to `maxHeight` px (for tables embedded in scrolling pages).
   */
  fill?: boolean;
  maxHeight?: number;
  rowClassName?: (row: T) => string | undefined;
  caption?: string;
}

const SKELETON_ROWS = 8;

function readHidden(
  key: string | undefined,
  columns: Array<DataTableColumn<unknown>>,
): Set<string> {
  const defaults = new Set(
    columns.filter((column) => column.defaultHidden).map((column) => column.id),
  );
  if (!key) return defaults;
  try {
    const stored = localStorage.getItem(`solvia.table.${key}`);
    if (stored) return new Set(JSON.parse(stored) as string[]);
  } catch {
    // Ignore corrupt or unavailable storage.
  }
  return defaults;
}

function alignClass(align: DataTableColumn<unknown>['align']) {
  return align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
}

/**
 * Reusable data table: sticky header, internal scroll, server-driven sorting and pagination,
 * column visibility, loading/empty states and a card layout on small screens.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  fetching = false,
  error,
  empty,
  onRowClick,
  onRowEdit,
  onRowDelete,
  rowActions,
  sort: controlledSort,
  onSortChange,
  pagination,
  search,
  toolbar,
  foldFilters = true,
  filtersActive = null,
  mobileFields = 4,
  toolbarEnd,
  columnsStorageKey,
  fill = true,
  maxHeight = 480,
  rowClassName,
  caption,
  className,
  ...rest
}: DataTableProps<T>) {
  const { t, fmt } = useUiI18n();
  // With a double-click shortcut, a single click waits a moment so it can tell them apart.
  const clickTimer = useRef<number | null>(null);
  const cancelClick = () => {
    if (clickTimer.current !== null) window.clearTimeout(clickTimer.current);
    clickTimer.current = null;
  };
  useEffect(() => cancelClick, []);
  /** Clicks on links, buttons or inputs inside a cell keep their own meaning. */
  const fromControl = (event: MouseEvent) =>
    (event.target as HTMLElement).closest('a, button, input, select, textarea, label') !== null;
  /** Row mouse handlers; a handler the table does not need is left out (not set to empty). */
  const rowHandlers = (row: T) => ({
    ...(onRowClick && {
      onClick: (event: MouseEvent) => {
        if (fromControl(event)) return;
        if (!onRowDelete) return onRowClick(row);
        if (event.detail > 1) return;
        cancelClick();
        clickTimer.current = window.setTimeout(() => onRowClick(row), 260);
      },
    }),
    ...(onRowDelete && {
      onDoubleClick: (event: MouseEvent) => {
        if (fromControl(event)) return;
        cancelClick();
        window.getSelection()?.removeAllRanges();
        onRowDelete(row);
      },
    }),
    ...(onRowEdit && {
      onContextMenu: (event: MouseEvent) => {
        if (fromControl(event)) return;
        event.preventDefault();
        onRowEdit(row);
      },
    }),
  });
  const shortcutsHint =
    onRowEdit && onRowDelete
      ? t('table.shortcutsBoth')
      : onRowEdit
        ? t('table.shortcutsEdit')
        : onRowDelete
          ? t('table.shortcutsDelete')
          : null;
  const [hidden, setHidden] = useState(() =>
    readHidden(columnsStorageKey, columns as Array<DataTableColumn<unknown>>),
  );

  const visibleColumns = useMemo(
    () => columns.filter((column) => !hidden.has(column.id)),
    [columns, hidden],
  );
  const hideableColumns = columns.filter((column) => column.hideable !== false);
  // Minimum visible time so loading feedback is noticeable even with a very fast API.
  const showSkeleton = useMinimumLoading(loading && !rows, 400);
  const showFetching = useMinimumLoading(fetching, 500);
  const isEmpty = !showSkeleton && rows !== undefined && rows.length === 0;

  const toggleColumn = (id: string) => {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (columnsStorageKey) {
        try {
          localStorage.setItem(`solvia.table.${columnsStorageKey}`, JSON.stringify([...next]));
        } catch {
          // Not persisted.
        }
      }
      return next;
    });
  };

  const resetColumns = () => {
    if (columnsStorageKey) {
      try {
        localStorage.removeItem(`solvia.table.${columnsStorageKey}`);
      } catch {
        // Ignore.
      }
    }
    setHidden(new Set(columns.filter((column) => column.defaultHidden).map((column) => column.id)));
  };

  // Server-sorted tables pass `sort` + `onSortChange`; the others sort their rows here by
  // each column's `sortValue`.
  const [localSort, setLocalSort] = useState<DataTableSort | null>(null);
  const sort = onSortChange ? controlledSort : (localSort ?? undefined);
  const canSort = (column: DataTableColumn<T>) =>
    onSortChange ? Boolean(column.sortable) : Boolean(column.sortValue);
  const sortedRows = useMemo(() => {
    if (onSortChange || !rows || !localSort) return rows;
    const column = columns.find((item) => item.id === localSort.id);
    if (!column?.sortValue) return rows;
    const direction = localSort.dir === 'asc' ? 1 : -1;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return [...rows].sort((a, b) => {
      const left = column.sortValue!(a);
      const right = column.sortValue!(b);
      const leftEmpty = left === null || left === undefined || left === '';
      const rightEmpty = right === null || right === undefined || right === '';
      if (leftEmpty || rightEmpty) return leftEmpty === rightEmpty ? 0 : leftEmpty ? 1 : -1;
      const order =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : collator.compare(String(left), String(right));
      return order * direction;
    });
  }, [columns, localSort, onSortChange, rows]);

  // Third click on the same header goes back to the original order.
  const onHeaderClick = (column: DataTableColumn<T>) => {
    if (!canSort(column)) return;
    const current = sort?.id === column.id ? sort.dir : null;
    const next: DataTableSort | null =
      current === null
        ? { id: column.id, dir: 'asc' }
        : current === 'asc'
          ? { id: column.id, dir: 'desc' }
          : null;
    if (onSortChange) onSortChange(next);
    else setLocalSort(next);
  };

  const columnsMenu =
    hideableColumns.length > 1 ? (
      <Popover
        width={240}
        trigger={({ toggle, ref }) => (
          <IconButton
            ref={ref}
            label={t('table.columns')}
            variant="secondary"
            size="sm"
            onClick={toggle}
          >
            <Columns3 className="h-4 w-4" />
          </IconButton>
        )}
      >
        {() => (
          <div className="space-y-0.5">
            <p className="px-2.5 pt-1 pb-1.5 text-xs font-semibold text-muted">
              {t('table.columns')}
            </p>
            {hideableColumns.map((column) => (
              <label
                key={column.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-surface-3"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--primary)]"
                  checked={!hidden.has(column.id)}
                  onChange={() => toggleColumn(column.id)}
                />
                {column.header}
              </label>
            ))}
            <button
              type="button"
              onClick={resetColumns}
              className="mt-1 w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-primary-ink hover:bg-surface-3"
            >
              {t('table.resetColumns')}
            </button>
          </div>
        )}
      </Popover>
    ) : null;

  const hasToolbar = Boolean(search || toolbar || toolbarEnd || columnsMenu);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Phone cards opened with "Ver más" (by row key).
  const [openCards, setOpenCards] = useState<ReadonlySet<string>>(() => new Set());
  const toggleCard = (key: string) =>
    setOpenCards((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const folded = foldFilters && Boolean(toolbar);
  const titleColumn = columns.find((column) => column.mobile === 'title') ?? visibleColumns[0];
  const subtitleColumns = visibleColumns.filter((column) => column.mobile === 'subtitle');
  const asideColumns = visibleColumns.filter((column) => column.mobile === 'aside');
  const fieldColumns = visibleColumns.filter(
    (column) => column !== titleColumn && (column.mobile ?? 'field') === 'field',
  );

  const firstRow = pagination ? (pagination.page - 1) * pagination.pageSize + 1 : 1;
  const lastRow = pagination
    ? Math.min(pagination.total, pagination.page * pagination.pageSize)
    : 0;

  return (
    <section
      className={cx(
        'flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card',
        // flex: 0 1 auto -> content height, shrinking to the available space (then scrolls),
        // on phones too: the list scrolls inside, the filters and the pages stay in place.
        fill && 'max-h-full min-h-0 shrink',
        className,
      )}
      {...rest}
    >
      {hasToolbar && (
        // Computers: one wrapping row (search, filters, then the buttons on the right). Phones:
        // the search with the buttons, and below it each filter on a full line with all of its
        // options in sight (they wrap; none is hidden off-screen).
        <div className="flex shrink-0 flex-col gap-2 border-b border-line px-3 py-2.5 md:flex-row md:flex-wrap md:items-center md:px-4 md:py-3">
          <div className="flex items-center gap-2 md:contents">
            {search && <div className="min-w-0 flex-1 md:flex-none">{search}</div>}
            {folded && (
              <FilterFoldButton
                open={filtersOpen}
                onToggle={() => setFiltersOpen((open) => !open)}
                active={filtersActive}
              />
            )}
            <div
              className={cx(
                'flex items-center gap-2 md:order-last md:ml-auto',
                !search && 'max-md:hidden',
              )}
            >
              {toolbarEnd}
              {columnsMenu}
            </div>
          </div>
          {(toolbar || !search) && (
            <div
              className={cx(
                'flex min-w-0 flex-col gap-2 max-md:[&>*]:w-full md:flex-1 md:flex-row md:flex-wrap md:items-center',
                folded && !filtersOpen && 'max-md:hidden',
              )}
            >
              {toolbar}
              {!search && (
                <div className="ml-auto flex items-center gap-2 md:hidden">
                  {toolbarEnd}
                  {columnsMenu}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div
        className={cx(
          'relative min-h-0 shrink overflow-auto',
          // Phones: room for at least one whole card (the page scrolls a little if needed).
          fill ? 'min-h-[15rem] md:min-h-40' : 'md:max-h-(--table-max-h)',
        )}
        style={fill ? undefined : ({ '--table-max-h': `${maxHeight}px` } as React.CSSProperties)}
        aria-busy={showSkeleton || showFetching}
      >
        {showFetching && !showSkeleton && (
          <div className="sticky top-0 z-20 h-0">
            <div className="h-1 w-full overflow-hidden bg-primary-soft">
              <div className="h-full w-1/3 animate-[table-progress_1.1s_ease-in-out_infinite] bg-primary" />
            </div>
            <LoadingPill className="absolute top-14 left-1/2 -translate-x-1/2" />
          </div>
        )}
        {error && <div className="p-4">{error}</div>}

        {/* Desktop: table */}
        <table className="hidden w-full border-separate border-spacing-0 text-sm md:table">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {visibleColumns.map((column) => {
                const active = sort?.id === column.id;
                const sortable = canSort(column);
                return (
                  <th
                    key={column.id}
                    scope="col"
                    style={{ minWidth: column.minWidth }}
                    aria-sort={
                      active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={cx(
                      'sticky top-0 z-10 border-b border-line bg-surface-2 px-4 py-2.5 text-[11px] font-semibold tracking-wide whitespace-nowrap text-muted uppercase',
                      alignClass(column.align),
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => onHeaderClick(column)}
                        title={t('table.sortBy', { column: column.header })}
                        // The whole header is the button; the arrow always sits on the right.
                        className={cx(
                          'group/sort -mx-2 inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 uppercase transition',
                          active
                            ? 'bg-primary-soft text-primary-ink'
                            : 'hover:bg-surface-3 hover:text-ink',
                        )}
                      >
                        {column.header}
                        <span
                          className={cx(
                            'flex h-4 w-4 items-center justify-center rounded transition',
                            active
                              ? 'bg-primary text-on-primary'
                              : 'opacity-40 group-hover/sort:bg-surface-2 group-hover/sort:opacity-100',
                          )}
                          aria-hidden="true"
                        >
                          {active ? (
                            sort.dir === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {rowActions && (
                <th
                  scope="col"
                  className="sticky top-0 z-10 w-px border-b border-line bg-surface-2 px-4 py-2.5"
                >
                  <span className="sr-only">{t('table.actions')}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody
            className={cx(
              'transition-opacity duration-200',
              showFetching && !showSkeleton && 'opacity-40',
            )}
          >
            {showSkeleton &&
              Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <tr key={index}>
                  {visibleColumns.map((column) => (
                    <td key={column.id} className="h-14 border-b border-line px-4 py-1.5">
                      <Skeleton
                        className={cx('h-4', column.align === 'right' ? 'ml-auto w-16' : 'w-3/4')}
                      />
                    </td>
                  ))}
                  {rowActions && <td className="border-b border-line px-4 py-3" />}
                </tr>
              ))}
            {!showSkeleton &&
              sortedRows?.map((row) => (
                <tr
                  key={rowKey(row)}
                  {...rowHandlers(row)}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === 'Enter' && event.target === event.currentTarget)
                            onRowClick(row);
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  className={cx(
                    'group transition-colors even:bg-surface-2/60 hover:bg-primary-soft/40 focus-visible:bg-primary-soft/50 focus-visible:outline-none',
                    (onRowClick || onRowEdit || onRowDelete) && 'cursor-pointer select-none',
                    rowClassName?.(row),
                  )}
                >
                  {visibleColumns.map((column) => (
                    <td
                      key={column.id}
                      className={cx(
                        // Fixed height and one line per text: rows never change size.
                        'h-14 border-b border-line px-4 py-1.5 align-middle whitespace-nowrap',
                        alignClass(column.align),
                        column.align === 'right' && 'tabular-nums',
                        column.className,
                      )}
                    >
                      <div
                        className="truncate [&>*]:truncate"
                        style={{ maxWidth: column.maxWidth ?? DEFAULT_CELL_MAX_WIDTH }}
                      >
                        {column.cell(row)}
                      </div>
                    </td>
                  ))}
                  {rowActions && (
                    <td
                      className="border-b border-line px-3 py-2 text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">{rowActions(row)}</div>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>

        {/* Mobile: cards */}
        <ul
          className={cx(
            'space-y-2.5 bg-surface-2 p-2.5 empty:hidden md:hidden',
            'transition-opacity duration-200',
            showFetching && !showSkeleton && 'opacity-40',
          )}
        >
          {showSkeleton &&
            Array.from({ length: 5 }, (_, index) => (
              <li key={index} className="space-y-2 rounded-xl border border-line bg-surface p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </li>
            ))}
          {!showSkeleton &&
            sortedRows?.map((row) => (
              <li
                key={rowKey(row)}
                className={cx(
                  'rounded-xl border border-line bg-surface p-4 shadow-xs transition',
                  onRowClick && 'cursor-pointer active:scale-[0.99] active:bg-surface-2',
                )}
                {...(onRowClick && {
                  onClick: (event: MouseEvent) => {
                    if (!fromControl(event)) onRowClick(row);
                  },
                })}
                {...(onRowEdit && { onContextMenu: rowHandlers(row).onContextMenu })}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {titleColumn && <div className="font-medium">{titleColumn.cell(row)}</div>}
                    {subtitleColumns.map((column) => (
                      <div key={column.id} className="mt-0.5 text-xs text-muted">
                        {column.cell(row)}
                      </div>
                    ))}
                  </div>
                  {asideColumns.length > 0 && (
                    <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                      {asideColumns.map((column) => (
                        <div key={column.id}>{column.cell(row)}</div>
                      ))}
                    </div>
                  )}
                </div>
                {fieldColumns.length > 0 &&
                  (() => {
                    const key = rowKey(row);
                    const open = openCards.has(key);
                    const extra = fieldColumns.length - mobileFields;
                    const shown =
                      open || extra <= 0 ? fieldColumns : fieldColumns.slice(0, mobileFields);
                    return (
                      <>
                        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-lg bg-surface-2 px-3 py-2.5 text-sm">
                          {shown.map((column) => (
                            <div key={column.id} className="min-w-0">
                              <dt className="text-[11px] tracking-wide text-subtle uppercase">
                                {column.header}
                              </dt>
                              <dd className="truncate">{column.cell(row)}</dd>
                            </div>
                          ))}
                        </dl>
                        {extra > 0 && (
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleCard(key);
                            }}
                            className={smallButtonClass('xs', 'mt-2')}
                          >
                            {open ? t('table.lessFields') : t('table.moreFields', { count: extra })}
                          </button>
                        )}
                      </>
                    );
                  })()}
                {rowActions && (
                  <div
                    className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {rowActions(row)}
                  </div>
                )}
              </li>
            ))}
        </ul>

        {isEmpty && (
          <EmptyState
            title={empty?.title ?? t('table.empty')}
            description={empty?.description}
            action={empty?.action}
          />
        )}
      </div>

      {pagination && pagination.total > 0 && (
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-4 py-2 text-xs text-muted md:py-2.5">
          <span className="tabular-nums">
            {t('table.range', {
              from: fmt.number(firstRow),
              to: fmt.number(lastRow),
              total: fmt.number(pagination.total),
            })}
            {shortcutsHint && (
              <span className="ml-3 hidden text-subtle md:inline">{shortcutsHint}</span>
            )}
          </span>
          <div className="flex items-center gap-3">
            {pagination.onPageSizeChange && (
              // Phones: the page bar stays on one line (rows per page is a computer setting).
              <label className="flex items-center gap-2 max-md:hidden">
                {t('table.rowsPerPage')}
                <select
                  className="rounded-md border border-line bg-surface px-1.5 py-1 text-xs text-ink"
                  value={pagination.pageSize}
                  onChange={(event) => pagination.onPageSizeChange?.(Number(event.target.value))}
                >
                  {(pagination.pageSizeOptions ?? [10, 20, 50, 100]).map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex items-center gap-1">
              <IconButton
                size="sm"
                label={t('table.previous')}
                disabled={pagination.page <= 1}
                onClick={() => pagination.onPageChange(pagination.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </IconButton>
              <span className="min-w-12 text-center tabular-nums">
                {pagination.page} / {pagination.totalPages}
              </span>
              <IconButton
                size="sm"
                label={t('table.next')}
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => pagination.onPageChange(pagination.page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
        </footer>
      )}
    </section>
  );
}
