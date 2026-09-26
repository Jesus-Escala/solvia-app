import type { ReactNode } from 'react';
import { cx } from './cx';

/**
 * Page wrapper inside the app shell.
 *
 * - `fill`: the page takes exactly the available height (no page scroll), on phones too, and its
 *   last child (usually a DataTable) fills the rest, scrolling internally with its header and
 *   filters kept in place. This mirrors the "table takes the remaining page height" behavior of
 *   the TSI component library (table-ultimate).
 * - default: normal flowing content; the shell's content area scrolls.
 */
export function Page({
  children,
  fill = false,
  className,
}: {
  children: ReactNode;
  fill?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'animate-page-in w-full px-4 py-5 sm:px-6 lg:px-8',
        // min-h keeps tables usable on very short viewports; the shell scrolls in that case.
        // Phones too: the page stays still and only the table scrolls (like TSI's table-ultimate).
        fill && 'flex h-full min-h-0 flex-col gap-3 max-md:py-3 md:min-h-[560px] md:gap-4',
        !fill && 'space-y-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1.5 text-[11px] font-semibold tracking-[0.14em] text-accent-ink uppercase">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[1.5rem] leading-tight font-semibold text-ink sm:text-[2.1rem]">
          {title}
        </h1>
        {description && (
          // Phones: the room goes to the list (the description is for bigger screens).
          <div className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted max-sm:hidden">
            {description}
          </div>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
