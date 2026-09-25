import { useLayoutEffect, useState } from 'react';

/** Preferred height of the list; it opens upwards when there is not enough room below. */
const LIST_HEIGHT = 288;

/**
 * Where the floating list goes: under the input (or above it when the viewport has no room),
 * in viewport coordinates. Above the input it is pinned by its bottom edge, so a short list sits
 * right on the input instead of floating at the top of the room it could take. Recomputed on
 * scroll and resize so it follows the input.
 */
export function useFloatingPosition(anchor: HTMLElement | null, open: boolean) {
  const [position, setPosition] = useState<{
    /** Distance from the top of the viewport (opening down) or null. */
    top: number | null;
    /** Distance from the bottom of the viewport (opening up) or null. */
    bottom: number | null;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = anchor.getBoundingClientRect();
        const below = window.innerHeight - rect.bottom - 12;
        const above = rect.top - 12;
        const up = below < Math.min(LIST_HEIGHT, 200) && above > below;
        const maxHeight = Math.min(LIST_HEIGHT, up ? above : below);
        setPosition({
          top: up ? null : rect.bottom + 4,
          bottom: up ? window.innerHeight - rect.top + 4 : null,
          left: rect.left,
          width: rect.width,
          maxHeight,
        });
      });
    };
    update();
    // Follow the input when the page scrolls or resizes, and when an animation moves it (e.g. the
    // modal's entrance: measuring mid-animation would leave the list out of place).
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    document.addEventListener('animationend', update, true);
    document.addEventListener('transitionend', update, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      document.removeEventListener('animationend', update, true);
      document.removeEventListener('transitionend', update, true);
    };
  }, [anchor, open]);

  return open ? position : null;
}
