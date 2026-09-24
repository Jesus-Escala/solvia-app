import { cx } from './cx';

/**
 * Background for full-bleed screens (auth, landing heroes): a soft petrol and gold glow that
 * drifts slowly over the canvas. Place it as the first child of a `relative overflow-hidden`
 * container.
 */
export function PaperBackdrop({ className }: { className?: string }) {
  return (
    <div
      className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden="true"
    >
      <div className="auth-blob absolute -top-56 -left-40 h-[38rem] w-[38rem] rounded-full bg-primary/14 blur-3xl" />
      <div className="auth-blob absolute top-1/4 -right-48 h-[32rem] w-[32rem] rounded-full bg-accent/12 blur-3xl [animation-delay:-7s]" />
    </div>
  );
}
