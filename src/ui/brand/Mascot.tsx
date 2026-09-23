import { useId, type CSSProperties } from 'react';
import { cx } from '../components/cx';
import { OwlFace } from './OwlFace';
import { OWL, OWL_COLORS } from './owlGeometry';

/**
 * - `default`: eyes open (blinks now and then). `happy`: smiling eyes.
 * - `wave`: raises the right wing and waves.
 * - `cover`: both wings completely cover the eyes (e.g. while a password is typed).
 * - `peek`: one wing covers an eye, the other eye peeks (e.g. password shown).
 */
export type MascotMood = 'default' | 'happy' | 'wave' | 'cover' | 'peek';

/*
 * Chibi proportions (viewBox 0 0 120 131): a big head on a small round body. The head is the
 * logo's face geometry (64x64) placed with translate(8.8 0) scale(1.6).
 */
const HEAD_SCALE = 1.6;
const HEAD_X = 60 - 32 * HEAD_SCALE;
const toView = (x: number, y: number) => ({ x: HEAD_X + x * HEAD_SCALE, y: y * HEAD_SCALE });
const LEFT_EYE = toView(OWL.eyes[0].cx, OWL.eyes[0].cy);
const RIGHT_EYE = toView(OWL.eyes[1].cx, OWL.eyes[1].cy);
const EYE_RING = OWL.eyeRing * HEAD_SCALE;

const SHOULDERS = { left: { x: 31, y: 96 }, right: { x: 89, y: 96 } };

/**
 * Wing in local coordinates: attached at the shoulder (0,0), hanging down, ending in a round
 * feathered "hand" centered around (0, TIP_Y) — that area is what covers an eye.
 */
const TIP_Y = 30;
/** Wing silhouette with four rounded primary feathers (scalloped tip). */
const WING_PATH =
  'M0 0 C-5 6 -13.5 16 -13.5 29 C-13.5 35 -12 39.5 -9 41.5 Q-7.5 45 -4.5 42.8 Q-2.5 46.5 0 43.2 Q2.5 46.5 4.5 42.8 Q7.5 45 9 41.5 C12 39.5 13.5 35 13.5 29 C13.5 16 5 6 0 0 Z';
/** Lighter covert feathers near the shoulder. */
const COVERTS_PATH =
  'M-10.5 17 Q-8 23 -5 19 Q-2.5 24 0 19.5 Q2.5 24 5 19 Q8 23 10.5 17 C9 10 4.5 5 0 3 C-4.5 5 -9 10 -10.5 17 Z';
/** Separation lines between the long feathers. */
const FEATHER_LINES = 'M-4.5 42.8 L-4 32 M0 43.2 L0 31 M4.5 42.8 L4 32';
/** Smallest distance from the tip center (0, TIP_Y) to the scalloped edge: the covered radius. */
const COVER_R = 12.8;

/** Rotation (CSS degrees, clockwise) + scale that put the wing tip exactly on a target point. */
function aim(shoulder: { x: number; y: number }, target: { x: number; y: number }) {
  const dx = target.x - shoulder.x;
  const dy = target.y - shoulder.y;
  // The hanging direction (0, 1) rotated by θ becomes (-sin θ, cos θ).
  return { rotate: (Math.atan2(-dx, dy) * 180) / Math.PI, scale: Math.hypot(dx, dy) / TIP_Y };
}

const COVER_LEFT = aim(SHOULDERS.left, LEFT_EYE);
const COVER_RIGHT = aim(SHOULDERS.right, RIGHT_EYE);
// The scaled tip must be larger than the eye ring (with margin) so the eye is fully hidden.
if (COVER_R * Math.min(COVER_LEFT.scale, COVER_RIGHT.scale) < EYE_RING + 1.5) {
  throw new Error('Mascot wing tip is too small to cover the eyes');
}

type Pose = { rotate: number; scale: number };
const REST_LEFT: Pose = { rotate: -10, scale: 0.68 };
const REST_RIGHT: Pose = { rotate: 10, scale: 0.68 };

const POSES: Record<MascotMood, { left: Pose; right: Pose }> = {
  default: { left: REST_LEFT, right: REST_RIGHT },
  happy: { left: REST_LEFT, right: REST_RIGHT },
  wave: { left: REST_LEFT, right: { rotate: -145, scale: 0.85 } },
  cover: { left: COVER_LEFT, right: COVER_RIGHT },
  // Right wing lowered just below its eye, so that eye peeks over it.
  peek: {
    left: COVER_LEFT,
    right: aim(SHOULDERS.right, { x: RIGHT_EYE.x + 2, y: RIGHT_EYE.y + 23 }),
  },
};

function Wing({
  shoulder,
  pose,
  waving,
}: {
  shoulder: { x: number; y: number };
  pose: Pose;
  waving?: boolean;
}) {
  const style: CSSProperties = {
    transformOrigin: `${shoulder.x}px ${shoulder.y}px`,
    transform: `rotate(${pose.rotate}deg) scale(${pose.scale})`,
    transition: 'transform 450ms cubic-bezier(0.22, 1, 0.36, 1)',
  };
  return (
    <g style={style}>
      <g
        className={waving ? 'mascot-wave' : undefined}
        style={{ transformOrigin: `${shoulder.x}px ${shoulder.y}px` }}
      >
        <g transform={`translate(${shoulder.x} ${shoulder.y})`}>
          <path
            d={WING_PATH}
            fill={OWL_COLORS.brow}
            stroke={OWL_COLORS.wing}
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          <path d={COVERTS_PATH} fill="#2dd4bf" opacity="0.55" />
          <path
            d={FEATHER_LINES}
            stroke={OWL_COLORS.wing}
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.7"
          />
        </g>
      </g>
    </g>
  );
}

/**
 * "Soli", the Solvia owl. Its face is exactly the logo mark's face; the round body carries the
 * gold S/ coin. Pure SVG, animated with CSS transitions (wings) and keyframes (blink, wave).
 *
 * `variant="avatar"`: just the face in a teal circle, for chat bubbles and the assistant button.
 */
export function Mascot({
  size = 120,
  mood = 'default',
  variant = 'full',
  className,
  title,
}: {
  size?: number;
  mood?: MascotMood;
  variant?: 'full' | 'avatar';
  className?: string;
  /** Accessible name; decorative (aria-hidden) when omitted. */
  title?: string;
}) {
  const id = useId();
  const bg = `${id}-bg`;
  const body = `${id}-body`;
  const belly = `${id}-belly`;
  const coin = `${id}-coin`;
  const pose = POSES[mood];
  const a11y = {
    role: title ? 'img' : undefined,
    'aria-label': title,
    'aria-hidden': title ? undefined : true,
  } as const;

  if (variant === 'avatar') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        className={cx('shrink-0', className)}
        {...a11y}
      >
        <defs>
          <linearGradient id={bg} x1="4" y1="2" x2="60" y2="62" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={OWL_COLORS.teal[0]} />
            <stop offset="0.5" stopColor={OWL_COLORS.teal[1]} />
            <stop offset="1" stopColor={OWL_COLORS.teal[2]} />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="32" fill={`url(#${bg})`} />
        <g transform="translate(0 -2.5)">
          <OwlFace happy={mood === 'happy'} blink />
        </g>
      </svg>
    );
  }

  const coinScale = 8 / OWL.coin.r;

  return (
    <svg
      width={size}
      height={(size * 131) / 120}
      viewBox="0 0 120 131"
      fill="none"
      className={cx('shrink-0 overflow-visible', className)}
      {...a11y}
    >
      <defs>
        <linearGradient id={body} x1="60" y1="74" x2="60" y2="127" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={OWL_COLORS.head} />
          <stop offset="1" stopColor="#ccfbf1" />
        </linearGradient>
        <linearGradient id={belly} x1="60" y1="90" x2="60" y2="123" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={OWL_COLORS.eyeRing} />
          <stop offset="1" stopColor="#99f6e4" />
        </linearGradient>
        <linearGradient id={coin} x1="40" y1="40" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={OWL_COLORS.gold[0]} />
          <stop offset="1" stopColor={OWL_COLORS.gold[1]} />
        </linearGradient>
      </defs>

      {/* Round body in the same tones as the head */}
      <path
        d="M60 74 C80 74 92 88 92 104 C92 119 78 127 60 127 C42 127 28 119 28 104 C28 88 40 74 60 74 Z"
        fill={`url(#${body})`}
        stroke={OWL_COLORS.outline}
        strokeWidth="1.6"
      />
      <path
        d="M60 90 C71 90 78 98 78 107 C78 117 70 123 60 123 C50 123 42 117 42 107 C42 98 49 90 60 90 Z"
        fill={`url(#${belly})`}
      />
      <g stroke={OWL_COLORS.brow} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.5">
        <path d="M47 99 q3.5 2.6 7 0" />
        <path d="M66 99 q3.5 2.6 7 0" />
      </g>
      {/* Gold S/ coin: the logo's coin, scaled onto the belly */}
      <g
        transform={`translate(60 110) scale(${coinScale}) translate(${-OWL.coin.cx} ${-OWL.coin.cy})`}
      >
        <circle
          cx={OWL.coin.cx}
          cy={OWL.coin.cy}
          r={OWL.coin.r}
          fill={`url(#${coin})`}
          stroke="#d97706"
          strokeWidth="1.6"
        />
        <path
          d={OWL.coinS}
          stroke={OWL_COLORS.coinInk}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d={OWL.coinSlash} stroke={OWL_COLORS.coinInk} strokeWidth="2" strokeLinecap="round" />
      </g>
      <g fill={OWL_COLORS.beak}>
        <ellipse cx="51" cy="127" rx="5.5" ry="2.6" />
        <ellipse cx="69" cy="127" rx="5.5" ry="2.6" />
      </g>

      {/* Big head: identical to the logo */}
      <g transform={`translate(${HEAD_X} 0) scale(${HEAD_SCALE})`}>
        <OwlFace happy={mood === 'happy'} blink outline />
      </g>

      {/* Wings in front of the head, so they can cover the eyes */}
      <Wing shoulder={SHOULDERS.left} pose={pose.left} />
      <Wing shoulder={SHOULDERS.right} pose={pose.right} waving={mood === 'wave'} />
    </svg>
  );
}
