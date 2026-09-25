import { Ban, Eye } from 'lucide-react';
import { IconButton } from '@/ui';

/**
 * The actions at the end of a sale or purchase row, always visible so it is clear what can be
 * done: see the detail, and void it (red) while it is not voided yet.
 */
export function RowActions({
  onView,
  onVoid,
  viewLabel,
  voidLabel,
}: {
  onView: () => void;
  onVoid?: () => void;
  viewLabel: string;
  voidLabel: string;
}) {
  return (
    <>
      <IconButton size="sm" label={viewLabel} title={viewLabel} onClick={onView}>
        <Eye className="h-4 w-4" />
      </IconButton>
      {onVoid && (
        <button
          type="button"
          title={voidLabel}
          onClick={onVoid}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-danger/30 px-2 text-xs font-semibold text-danger-ink transition hover:bg-danger-soft"
        >
          <Ban className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">{voidLabel}</span>
        </button>
      )}
    </>
  );
}
