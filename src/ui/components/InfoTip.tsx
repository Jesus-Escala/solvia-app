import { Info } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';
import { useUiI18n } from '../i18n/context';
import { cx } from './cx';

/**
 * Small ⓘ that explains a metric or a chart ("how is this calculated?"). The explanation shows on
 * hover and on keyboard focus / tap, so it works on phones too.
 *
 * The bubble is `display: none` while closed (an invisible one still widens scroll containers
 * near the right edge) and, when opening, flips to whichever side keeps it inside the viewport.
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
  const ref = useRef<HTMLSpanElement>(null);
  const [side, setSide] = useState(align);
  const place = () => {
    const icon = ref.current?.getBoundingClientRect();
    if (!icon) return;
    const half = 136; // half the bubble (w-64 = 256px) plus a margin
    const center = icon.left + icon.width / 2;
    if (center + half > window.innerWidth) setSide('end');
    else if (center - half < 0) setSide('start');
    else setSide(align);
  };
  return (
    <span
      ref={ref}
      onPointerEnter={place}
      onFocus={place}
      className={cx('group/info relative inline-flex align-middle', className)}
    >
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
          'pointer-events-none absolute top-full z-50 mt-1.5 hidden w-64 animate-fade-in rounded-xl border border-line bg-surface p-3 text-left text-xs leading-relaxed font-normal tracking-normal text-muted normal-case shadow-pop group-focus-within/info:block group-hover/info:block',
          side === 'start' && 'left-0',
          side === 'center' && 'left-1/2 -translate-x-1/2',
          side === 'end' && 'right-0',
        )}
      >
        {children}
      </span>
    </span>
  );
}
