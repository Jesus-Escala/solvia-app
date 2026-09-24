import { Info } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { useUiI18n } from '../i18n/context';
import { cx } from './cx';

/**
 * Small ⓘ that explains a metric or a chart ("how is this calculated?"). The explanation shows on
 * hover and on keyboard focus / tap, so it works on phones too.
 */
export function InfoTip({
  children,
  align = 'center',
  className,
}: {
  children: ReactNode;
  /** Where the bubble anchors relative to the icon (use `end` near the right edge). */
  align?: 'start' | 'center' | 'end';
  className?: string;
}) {
  const { t } = useUiI18n();
  const id = useId();
  return (
    <span className={cx('group/info relative inline-flex align-middle', className)}>
      <button
        type="button"
        aria-describedby={id}
        aria-label={t('info.label')}
        className="flex h-5 w-5 items-center justify-center rounded-full text-subtle transition hover:bg-surface-3 hover:text-ink focus-visible:bg-surface-3 focus-visible:text-ink"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        id={id}
        role="tooltip"
        className={cx(
          'pointer-events-none invisible absolute top-full z-50 mt-1.5 w-64 rounded-xl border border-line bg-surface p-3 text-left text-xs leading-relaxed font-normal tracking-normal text-muted normal-case opacity-0 shadow-pop transition duration-150 group-focus-within/info:visible group-focus-within/info:opacity-100 group-hover/info:visible group-hover/info:opacity-100',
          align === 'start' && 'left-0',
          align === 'center' && 'left-1/2 -translate-x-1/2',
          align === 'end' && 'right-0',
        )}
      >
        {children}
      </span>
    </span>
  );
}
