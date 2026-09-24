import { useId } from 'react';
import { cx } from '../components/cx';
import { MascotFace } from './Mascot';
import { OWL } from './owlGeometry';

/** Solvia mark: Soli's face (the same as the mascot's) on a gradient tile, with a gold S/ coin. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const id = useId();
  const bg = `${id}-bg`;
  const glow = `${id}-glow`;
  const gold = `${id}-gold`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={cx('shrink-0', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={bg} x1="4" y1="2" x2="60" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="0.5" stopColor="#0d9488" />
          <stop offset="1" stopColor="#0c3a47" />
        </linearGradient>
        <radialGradient
          id={glow}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(14 8) rotate(55) scale(42 32)"
        >
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={gold} x1="40" y1="40" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${bg})`} />
      <rect width="64" height="64" rx="18" fill={`url(#${glow})`} />
      <rect
        x="0.75"
        y="0.75"
        width="62.5"
        height="62.5"
        rx="17.25"
        stroke="#ffffff"
        strokeOpacity="0.2"
        strokeWidth="1.5"
      />
      <MascotFace size={48} cx={30.5} cy={31} />
      <circle cx="49" cy="49" r="9.5" fill={`url(#${gold})`} stroke="#0c3a47" strokeWidth="2.5" />
      <path
        d={OWL.coinS}
        stroke="#92400e"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={OWL.coinSlash} stroke="#92400e" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Mark + wordmark. `tone="light"` for dark backgrounds (sidebar). */
export function Logo({
  collapsed = false,
  tone = 'default',
  size = 32,
  className,
}: {
  collapsed?: boolean;
  tone?: 'default' | 'light';
  size?: number;
  className?: string;
}) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} className="drop-shadow-sm" />
      {!collapsed && (
        <span
          className={cx('font-bold tracking-tight', tone === 'light' ? 'text-white' : 'text-ink')}
          style={{ fontSize: size * 0.58 }}
        >
          Sol
          <span className={tone === 'light' ? 'text-[#6ee7b7]' : 'text-primary'}>via</span>
        </span>
      )}
    </span>
  );
}
