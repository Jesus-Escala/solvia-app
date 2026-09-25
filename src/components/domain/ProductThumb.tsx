import { cx } from '@/ui';

/** Two letters for a product without a picture ("Arroz Costeño" → "AC"). */
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

/** The picture of a product, or its initials on a soft tile when it has none. */
export function ProductThumb({
  name,
  imageUrl,
  size = 36,
  className,
}: {
  name: string;
  imageUrl: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cx(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-soft text-xs font-bold text-primary-ink',
        className,
      )}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
