import { cx } from './cx';

export type SmallButtonSize = 'xs' | 'sm' | 'inherit';
/** `danger`: removes something (Eliminar, Quitar, Vaciar) — reddish. */
export type SmallButtonTone = 'default' | 'danger';

/**
 * The look of small secondary actions ("Cambiar fecha", "Agregar descuento", "Ver todo"…): a
 * compact button with a border, never a text link. Shared by `TextButton` and by router links
 * that are actions (`<Link className={smallButtonClass('sm')}>`), so every one looks the same.
 */
export function smallButtonClass(
  size: SmallButtonSize = 'sm',
  className?: string,
  tone: SmallButtonTone = 'default',
) {
  return cx(
    'inline-flex items-center justify-center gap-1.5 rounded-lg border font-semibold whitespace-nowrap shadow-xs transition-colors focus-visible:ring-3 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0',
    tone === 'danger'
      ? 'border-danger/30 bg-danger-soft/40 text-danger-ink hover:border-danger/50 hover:bg-danger-soft focus-visible:ring-danger/25 [&>svg]:text-danger'
      : 'border-line bg-surface text-ink hover:border-primary/40 hover:bg-primary-soft/50 hover:text-primary-ink focus-visible:ring-primary/30 [&>svg]:text-primary',
    size === 'xs' && 'h-7 px-2 text-xs [&>svg]:h-3.5 [&>svg]:w-3.5',
    size === 'sm' && 'h-8 px-2.5 text-sm',
    // Inside a sentence: as tall as the text around it.
    size === 'inherit' && 'px-2 py-0.5 align-middle',
    className,
  );
}
