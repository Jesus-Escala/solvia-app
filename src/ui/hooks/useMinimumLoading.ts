import { useEffect, useState } from 'react';

/**
 * Keeps a loading state visible for at least `minMs` after it ends, so feedback never just
 * flickers when the API answers in a few milliseconds (spinners, skeletons, progress bars).
 */
export function useMinimumLoading(active: boolean, minMs = 450): boolean {
  const [previous, setPrevious] = useState(active);
  const [lingering, setLingering] = useState(false);

  // Adjust state while rendering (React's recommended pattern instead of an effect).
  if (previous !== active) {
    setPrevious(active);
    if (!active) setLingering(true);
  }

  useEffect(() => {
    if (!lingering) return;
    const timer = window.setTimeout(() => setLingering(false), minMs);
    return () => window.clearTimeout(timer);
  }, [lingering, minMs]);

  return active || lingering;
}
