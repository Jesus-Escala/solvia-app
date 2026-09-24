import { useId, type CSSProperties } from 'react';
import { cx } from '../components/cx';
import { OWL, OWL_COLORS } from './owlGeometry';

/**
 * - `default`: eyes open (blinks now and then). `happy`: smiling eyes.
 * - `wave`: raises the right wing and waves.
 * - `fly`: both wings up and flapping, as if flying somewhere.
 * - `cover`: both wings completely cover the eyes (e.g. while a password is typed).
 * - `peek`: one wing covers an eye, the other eye peeks (e.g. password shown).
 */
export type MascotMood = 'default' | 'happy' | 'wave' | 'fly' | 'cover' | 'peek';

/*
 * Illustrated Bowl (viewBox 0 0 120 131): a big round head on a small round body, drawn with
 * soft gradients instead of flat fills and outlines. The eyes sit where the logo's eyes land
 * when its 64x64 face is scaled 1.6x, so wing poses stay aligned with the logo proportions.
 */
const HEAD_SCALE = 1.6;
const HEAD_X = 60 - 32 * HEAD_SCALE;
const toView = (x: number, y: number) => ({ x: HEAD_X + x * HEAD_SCALE, y: y * HEAD_SCALE });
const LEFT_EYE = toView(OWL.eyes[0].cx, OWL.eyes[0].cy);
const RIGHT_EYE = toView(OWL.eyes[1].cx, OWL.eyes[1].cy);
const EYES = [LEFT_EYE, RIGHT_EYE];
const EYE_R = 12.6;
const PUPIL_R = 8.6;

/** Head silhouette: rounded ear tufts flowing into full cheeks (no corners). */
const HEAD_PATH =
  'M60 25.5C68 25.5 75 26.6 80.8 29.2C83 25.8 86.4 23.4 89.8 23.6C93.4 23.8 95 26.8 94.8 30.6C94.6 34.6 94 38.4 95.2 42.4C97.3 47.4 98.2 52.5 98.2 58C98.2 75.4 81.4 87.4 60 87.4C38.6 87.4 21.8 75.4 21.8 58C21.8 52.5 22.7 47.4 24.8 42.4C26 38.4 25.4 34.6 25.2 30.6C25 26.8 26.6 23.8 30.2 23.6C33.6 23.4 37 25.8 39.2 29.2C45 26.6 52 25.5 60 25.5Z';
const BODY_PATH =
  'M60 77C80.5 77 93.5 90.5 93.5 106C93.5 120.5 79.5 128.5 60 128.5C40.5 128.5 26.5 120.5 26.5 106C26.5 90.5 39.5 77 60 77Z';
const BEAK_PATH =
  'M60 67.6C57.3 67.6 55.3 69.3 55.3 71.4C55.3 74.2 58.2 76.8 60 77.8C61.8 76.8 64.7 74.2 64.7 71.4C64.7 69.3 62.7 67.6 60 67.6Z';

const SHOULDERS = { left: { x: 32, y: 95 }, right: { x: 88, y: 95 } };

/**
 * Wing in local coordinates: attached at the shoulder (0,0), hanging down and ending in a
 * round "mitten" centred at (0, TIP_Y) with radius TIP_R — that disc is what covers an eye.
 */
const TIP_Y = 30;
const TIP_R = 14;
const WING_PATH = `M0 0C-6 4.5 -${TIP_R} 15.5 -${TIP_R} ${TIP_Y}A${TIP_R} ${TIP_R} 0 0 0 ${TIP_R} ${TIP_Y}C${TIP_R} 15.5 6 4.5 0 0Z`;

/** Rotation (CSS degrees, clockwise) + scale that put the wing tip exactly on a target point. */
function aim(shoulder: { x: number; y: number }, target: { x: number; y: number }) {
  const dx = target.x - shoulder.x;
  const dy = target.y - shoulder.y;
  // The hanging direction (0, 1) rotated by θ becomes (-sin θ, cos θ).
  return { rotate: (Math.atan2(-dx, dy) * 180) / Math.PI, scale: Math.hypot(dx, dy) / TIP_Y };
}

const COVER_LEFT = aim(SHOULDERS.left, LEFT_EYE);
const COVER_RIGHT = aim(SHOULDERS.right, RIGHT_EYE);
// The scaled mitten must be larger than the eye (with margin) so the eye is fully hidden.
if (TIP_R * Math.min(COVER_LEFT.scale, COVER_RIGHT.scale) < EYE_R + 1.5) {
  throw new Error('Mascot wing tip is too small to cover the eyes');
}

type Pose = { rotate: number; scale: number };
const REST_LEFT: Pose = { rotate: -12, scale: 0.66 };
const REST_RIGHT: Pose = { rotate: 12, scale: 0.66 };

const POSES: Record<MascotMood, { left: Pose; right: Pose }> = {
  default: { left: REST_LEFT, right: REST_RIGHT },
  happy: { left: REST_LEFT, right: REST_RIGHT },
  wave: { left: REST_LEFT, right: { rotate: -145, scale: 0.85 } },
  fly: { left: { rotate: 118, scale: 0.8 }, right: { rotate: -118, scale: 0.8 } },
  cover: { left: COVER_LEFT, right: COVER_RIGHT },
  // Right wing lowered just below its eye, so that eye peeks over it.
  peek: {
    left: COVER_LEFT,
    right: aim(SHOULDERS.right, { x: RIGHT_EYE.x + 2, y: RIGHT_EYE.y + 23 }),
  },
};

/** Gradient ids of one rendered mascot (unique per instance). */
function useIds() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const names = [
    'bg',
    'head',
    'disc',
    'eye',
    'pupil',
    'blush',
    'beak',
    'body',
    'belly',
    'wing',
    'coin',
    'foot',
    'shade',
  ] as const;
  return Object.fromEntries(names.map((name) => [name, `${id}-${name}`])) as Record<
    (typeof names)[number],
    string
  >;
}

type Ids = ReturnType<typeof useIds>;

function Gradients({ ids }: { ids: Ids }) {
  return (
    <defs>
      <radialGradient id={ids.head} cx="0.38" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.55" stopColor="#e6fffa" />
        <stop offset="1" stopColor="#a7f3e4" />
      </radialGradient>
      <radialGradient id={ids.disc} cx="0.5" cy="0.45" r="0.6">
        <stop offset="0.6" stopColor="#ffffff" stopOpacity="0.95" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={ids.eye} cx="0.45" cy="0.4" r="0.65">
        <stop offset="0.7" stopColor="#ffffff" />
        <stop offset="1" stopColor="#dcf8f2" />
      </radialGradient>
      <radialGradient id={ids.pupil} cx="0.4" cy="0.35" r="0.75">
        <stop offset="0" stopColor="#1f5f63" />
        <stop offset="0.6" stopColor="#0e3440" />
        <stop offset="1" stopColor="#081c24" />
      </radialGradient>
      <radialGradient id={ids.blush}>
        <stop offset="0" stopColor="#fb7185" stopOpacity="0.55" />
        <stop offset="1" stopColor="#fb7185" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={ids.beak} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fcd34d" />
        <stop offset="1" stopColor="#f59e0b" />
      </linearGradient>
      <radialGradient id={ids.body} cx="0.4" cy="0.25" r="0.85">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.5" stopColor="#d5faf2" />
        <stop offset="1" stopColor="#7ee8d4" />
      </radialGradient>
      <radialGradient id={ids.belly} cx="0.5" cy="0.35" r="0.65">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0.35" />
      </radialGradient>
      <linearGradient id={ids.wing} x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stopColor="#5eead4" />
        <stop offset="1" stopColor="#0f9f8f" />
      </linearGradient>
      <linearGradient id={ids.coin} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={OWL_COLORS.gold[0]} />
        <stop offset="1" stopColor={OWL_COLORS.gold[1]} />
      </linearGradient>
      <linearGradient id={ids.foot} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fcd34d" />
        <stop offset="1" stopColor="#f59e0b" />
      </linearGradient>
      <radialGradient id={ids.shade}>
        <stop offset="0" stopColor="#0b2530" stopOpacity="0.22" />
        <stop offset="1" stopColor="#0b2530" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/** The illustrated head (view coordinates). Shared by the full mascot and the avatar. */
function Head({ ids, happy, blink }: { ids: Ids; happy: boolean; blink: boolean }) {
  return (
    <g>
      <path
        d={HEAD_PATH}
        fill={`url(#${ids.head})`}
        stroke="#5eead4"
        strokeOpacity="0.55"
        strokeWidth="1"
      />
      {/* Soft teal inside the ear tufts */}
      <ellipse
        cx="89.2"
        cy="28"
        rx="2.6"
        ry="4.6"
        transform="rotate(12 89.2 28)"
        fill="#5eead4"
        opacity="0.45"
      />
      <ellipse
        cx="30.8"
        cy="28"
        rx="2.6"
        ry="4.6"
        transform="rotate(-12 30.8 28)"
        fill="#5eead4"
        opacity="0.45"
      />
      {/* Facial disc: two soft white halos around the eyes */}
      {EYES.map((eye) => (
        <circle key={eye.x} cx={eye.x} cy={eye.y} r={EYE_R + 6} fill={`url(#${ids.disc})`} />
      ))}
      {/* Gentle arched brows (never a V) */}
      <g stroke="#14b8a6" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.75">
        <path
          d={`M${LEFT_EYE.x - 9.5} ${LEFT_EYE.y - 17.5}Q${LEFT_EYE.x} ${LEFT_EYE.y - 23} ${LEFT_EYE.x + 8.5} ${LEFT_EYE.y - 18.5}`}
        />
        <path
          d={`M${RIGHT_EYE.x - 8.5} ${RIGHT_EYE.y - 18.5}Q${RIGHT_EYE.x} ${RIGHT_EYE.y - 23} ${RIGHT_EYE.x + 9.5} ${RIGHT_EYE.y - 17.5}`}
        />
      </g>
      {/* Cheeks */}
      <ellipse cx="33" cy="73" rx="7.5" ry="4.8" fill={`url(#${ids.blush})`} />
      <ellipse cx="87" cy="73" rx="7.5" ry="4.8" fill={`url(#${ids.blush})`} />
      {EYES.map((eye) => (
        <g key={eye.x}>
          <circle cx={eye.x} cy={eye.y} r={EYE_R} fill={`url(#${ids.eye})`} />
          {happy ? (
            <path
              d={`M${eye.x - 6} ${eye.y + 2.2}Q${eye.x} ${eye.y - 5.2} ${eye.x + 6} ${eye.y + 2.2}`}
              stroke="#0e3440"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            <g className={blink ? 'mascot-blink' : undefined}>
              <circle cx={eye.x} cy={eye.y + 1} r={PUPIL_R} fill={`url(#${ids.pupil})`} />
              <circle cx={eye.x + 3} cy={eye.y - 2.6} r="3.1" fill="#ffffff" />
              <circle cx={eye.x - 3} cy={eye.y + 4.2} r="1.4" fill="#ffffff" opacity="0.9" />
            </g>
          )}
        </g>
      ))}
      <path d={BEAK_PATH} fill={`url(#${ids.beak})`} />
      <ellipse cx="58.4" cy="70.2" rx="1.6" ry="1" fill="#ffffff" opacity="0.6" />
    </g>
  );
}

/** Box of the head in mascot view coordinates, used to fit it into other artwork. */
const HEAD_BOX = { x: 21.8, y: 20.6, width: 76.4, height: 66.8 };

/**
 * Bowl's illustrated head fitted into a square of `size` (in the parent SVG's units), centred
 * at (`cx`, `cy`). The logo mark and the avatar use it so every Bowl has the same face.
 */
export function MascotFace({
  size,
  cx,
  cy,
  happy = false,
  blink = false,
}: {
  size: number;
  cx: number;
  cy: number;
  happy?: boolean;
  blink?: boolean;
}) {
  const ids = useIds();
  const scale = size / HEAD_BOX.width;
  const x = cx - (HEAD_BOX.x + HEAD_BOX.width / 2) * scale;
  const y = cy - (HEAD_BOX.y + HEAD_BOX.height / 2) * scale;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <Gradients ids={ids} />
      <Head ids={ids} happy={happy} blink={blink} />
    </g>
  );
}

function Wing({
  ids,
  shoulder,
  pose,
  animation,
}: {
  ids: Ids;
  shoulder: { x: number; y: number };
  pose: Pose;
  /** Keyframe class played around the shoulder (waving, flapping). */
  animation?: string;
}) {
  const style: CSSProperties = {
    transformOrigin: `${shoulder.x}px ${shoulder.y}px`,
    transform: `rotate(${pose.rotate}deg) scale(${pose.scale})`,
    transition: 'transform 450ms cubic-bezier(0.22, 1, 0.36, 1)',
  };
  return (
    <g style={style}>
      <g className={animation} style={{ transformOrigin: `${shoulder.x}px ${shoulder.y}px` }}>
        <g transform={`translate(${shoulder.x} ${shoulder.y})`}>
          <path
            d={WING_PATH}
            fill={`url(#${ids.wing})`}
            stroke="#0f9f8f"
            strokeOpacity="0.35"
            strokeWidth="0.8"
          />
          {/* Soft highlight on the mitten */}
          <ellipse cx="-4" cy={TIP_Y - 4} rx="5" ry="8" fill="#ffffff" opacity="0.22" />
        </g>
      </g>
    </g>
  );
}

/**
 * "Bowl", the Solvia owl: a soft, rounded illustration with the gold S/ coin on its belly.
 * Pure SVG, animated with CSS transitions (wings) and keyframes (blink, wave).
 *
 * `variant="avatar"`: just the head in a teal circle, for chat bubbles and the assistant button.
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
  const ids = useIds();
  const pose = POSES[mood];
  const happy = mood === 'happy';
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
          <linearGradient id={ids.bg} x1="4" y1="2" x2="60" y2="62" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={OWL_COLORS.teal[0]} />
            <stop offset="0.5" stopColor={OWL_COLORS.teal[1]} />
            <stop offset="1" stopColor={OWL_COLORS.teal[2]} />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="32" fill={`url(#${ids.bg})`} />
        <MascotFace size={50} cx={32} cy={33.5} happy={happy} blink />
      </svg>
    );
  }

  const coinScale = 8.4 / OWL.coin.r;

  return (
    <svg
      width={size}
      height={(size * 131) / 120}
      viewBox="0 0 120 131"
      fill="none"
      className={cx('shrink-0 overflow-visible', className)}
      {...a11y}
    >
      <Gradients ids={ids} />

      <ellipse cx="60" cy="129" rx="30" ry="3.2" fill={`url(#${ids.shade})`} />

      {/* Feet peek out under the body */}
      <ellipse cx="50" cy="127.2" rx="6.2" ry="3" fill={`url(#${ids.foot})`} />
      <ellipse cx="70" cy="127.2" rx="6.2" ry="3" fill={`url(#${ids.foot})`} />

      <path
        d={BODY_PATH}
        fill={`url(#${ids.body})`}
        stroke="#5eead4"
        strokeOpacity="0.55"
        strokeWidth="1"
      />
      <ellipse cx="60" cy="108" rx="21" ry="17" fill={`url(#${ids.belly})`} />
      {/* A few soft chest feathers */}
      <g stroke="#2dd4bf" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.35">
        <path d="M49 96.5q2.6 2 5.2 0" />
        <path d="M57.4 94.8q2.6 2 5.2 0" />
        <path d="M65.8 96.5q2.6 2 5.2 0" />
      </g>

      {/* Gold S/ coin held on the belly */}
      <g
        transform={`translate(60 111) scale(${coinScale}) translate(${-OWL.coin.cx} ${-OWL.coin.cy})`}
      >
        <circle
          cx={OWL.coin.cx}
          cy={OWL.coin.cy + 1.2}
          r={OWL.coin.r}
          fill="#b45309"
          opacity="0.18"
        />
        <circle
          cx={OWL.coin.cx}
          cy={OWL.coin.cy}
          r={OWL.coin.r}
          fill={`url(#${ids.coin})`}
          stroke="#f59e0b"
          strokeWidth="1.2"
        />
        <path
          d={OWL.coinS}
          stroke={OWL_COLORS.coinInk}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d={OWL.coinSlash} stroke={OWL_COLORS.coinInk} strokeWidth="2" strokeLinecap="round" />
        <ellipse
          cx={OWL.coin.cx - 3.6}
          cy={OWL.coin.cy - 4.4}
          rx="2.6"
          ry="1.4"
          fill="#ffffff"
          opacity="0.55"
        />
      </g>

      <Head ids={ids} happy={happy} blink />

      {/* Wings in front of the head, so they can cover the eyes */}
      <Wing
        ids={ids}
        shoulder={SHOULDERS.left}
        pose={pose.left}
        animation={mood === 'fly' ? 'mascot-flap-left' : undefined}
      />
      <Wing
        ids={ids}
        shoulder={SHOULDERS.right}
        pose={pose.right}
        animation={
          mood === 'wave' ? 'mascot-wave' : mood === 'fly' ? 'mascot-flap-right' : undefined
        }
      />
    </svg>
  );
}
