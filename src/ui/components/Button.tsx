import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useMinimumLoading } from '../hooks/useMinimumLoading';
import { smallButtonClass, type SmallButtonSize, type SmallButtonTone } from './buttonStyles';
import { cx } from './cx';
import { Spinner } from './Feedback';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
export type ButtonSize = 'sm' | 'md';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary shadow-xs hover:bg-primary-hover',
  secondary:
    'border border-line bg-surface text-ink shadow-xs hover:bg-surface-2 hover:border-line-strong',
  ghost: 'text-muted hover:bg-surface-3 hover:text-ink',
  danger: 'bg-danger text-white shadow-xs hover:opacity-90',
  soft: 'bg-primary-soft text-primary-ink hover:brightness-95',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-2.5 text-xs',
  md: 'h-10 gap-2 rounded-lg px-4 text-sm',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    disabled,
    className,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  // Fast requests still show the spinner long enough to be noticed.
  const busy = useMinimumLoading(loading);
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cx(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-primary/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55',
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {busy ? <Spinner className="h-4 w-4" /> : icon}
      {children}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name; also shown as a native tooltip. */
  label: string;
  variant?: 'ghost' | 'secondary';
  size?: ButtonSize;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', size = 'md', className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:ring-3 focus-visible:ring-primary/30 focus-visible:outline-none disabled:opacity-50',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        variant === 'ghost'
          ? 'text-muted hover:bg-surface-3 hover:text-ink'
          : 'border border-line bg-surface text-ink shadow-xs hover:bg-surface-2',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

export interface TextButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `inherit` takes the surrounding text size. */
  size?: SmallButtonSize;
  /** `danger` for what removes something (Eliminar, Quitar, Vaciar). */
  tone?: SmallButtonTone;
  icon?: ReactNode;
}

/**
 * Small secondary actions inside text or forms ("Cambiar fecha", "Agregar descuento"): a compact
 * bordered button (`smallButtonClass`), never a text link.
 */
export const TextButton = forwardRef<HTMLButtonElement, TextButtonProps>(function TextButton(
  { size = 'inherit', tone = 'default', icon, className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={smallButtonClass(size, className, tone)} {...props}>
      {icon}
      {children}
    </button>
  );
});
