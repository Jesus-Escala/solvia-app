import { ArrowLeft, Building2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { LogoMark, PreferencesControls, useFeedback } from '@/ui';
import { useMe } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';

/** What a point-of-sale screen gives its content: report unsaved work, and leave. */
export interface PosControls {
  /** The ticket has products that would be lost by leaving. */
  onDirty: (dirty: boolean) => void;
  /** Back to the list, without asking (after saving). */
  leave: () => void;
}

/**
 * A point of sale as its own full screen (no sidebar, no modal): a slim top bar with the way back,
 * the title, the business and the keyboard hints, and the content filling the rest. Leaving with
 * products in the ticket asks first (the back button) or warns (closing the tab).
 */
export function PosScreen({
  title,
  backTo,
  backLabel,
  keys,
  children,
}: {
  title: string;
  /** Where "back" goes (the list of sales or purchases). */
  backTo: string;
  backLabel: string;
  keys: string;
  children: (controls: PosControls) => ReactNode;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { confirm } = useFeedback();
  const { data: me } = useMe();
  const [dirty, setDirty] = useState(false);

  // Closing or reloading the tab with a ticket in progress: the browser asks first.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const leave = () => {
    setDirty(false);
    navigate(backTo);
  };
  const back = async () => {
    if (dirty) {
      const ok = await confirm({
        title: t('sales.pos.leaveTitle'),
        message: t('sales.pos.leaveMessage'),
        confirmLabel: t('sales.pos.leave'),
        cancelLabel: t('common.cancel'),
      });
      if (!ok) return;
    }
    leave();
  };

  return (
    <div className="flex h-dvh flex-col bg-canvas text-ink">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-2 sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={() => void back()}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted transition hover:bg-surface-3 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{backLabel}</span>
        </button>
        <span className="h-6 w-px bg-line" aria-hidden="true" />
        <LogoMark size={28} className="shrink-0" />
        <h1 className="truncate font-display text-lg font-semibold">{title}</h1>
        {me?.tenant && (
          <span className="hidden min-w-0 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-medium text-muted md:inline-flex">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{me.tenant.name}</span>
          </span>
        )}
        <span className="ml-auto hidden text-xs text-subtle lg:inline">{keys}</span>
        <span className="ml-auto flex items-center lg:ml-2">
          <PreferencesControls />
        </span>
      </header>
      <main className="min-h-0 flex-1">{children({ onDirty: setDirty, leave })}</main>
    </div>
  );
}
