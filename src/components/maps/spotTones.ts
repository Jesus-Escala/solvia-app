import type { SpotColor } from '../../lib/types';

/** Theme classes of each pin color. */
export const SPOT_TONES: Record<SpotColor, { pin: string; ring: string; floor: string }> = {
  primary: { pin: 'bg-primary', ring: 'ring-primary/35', floor: 'bg-primary/25 ring-primary' },
  info: { pin: 'bg-info', ring: 'ring-info/35', floor: 'bg-info/25 ring-info' },
  success: { pin: 'bg-success', ring: 'ring-success/35', floor: 'bg-success/25 ring-success' },
  warning: { pin: 'bg-warning', ring: 'ring-warning/35', floor: 'bg-warning/25 ring-warning' },
  danger: { pin: 'bg-danger', ring: 'ring-danger/35', floor: 'bg-danger/25 ring-danger' },
  accent: { pin: 'bg-accent', ring: 'ring-accent/35', floor: 'bg-accent/25 ring-accent' },
};
