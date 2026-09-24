import { useEffect, useRef, useState } from 'react';

/** `value` once it has stopped changing for `delay` ms (what a search box sends). */
export function useDebouncedValue(value: string, delay = 200) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * "Enter pressed before the results for this text arrived": runs `onEnter` right away when the
 * results are fresh, otherwise as soon as they are, so a fast typist or a barcode scanner
 * never picks from the previous search's results.
 */
export function usePendingEnter<T>({
  fresh,
  results,
  onEnter,
}: {
  /** The results on screen belong to what is typed now. */
  fresh: boolean;
  results: T[] | null;
  onEnter: (results: T[]) => void;
}) {
  const pending = useRef(false);

  useEffect(() => {
    if (pending.current && fresh && results !== null) {
      pending.current = false;
      onEnter(results);
    }
    // `onEnter` changes on every render; the trigger is fresh results arriving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh, results]);

  return {
    enter: () => {
      if (fresh && results !== null) onEnter(results);
      else pending.current = true;
    },
    cancel: () => {
      pending.current = false;
    },
  };
}
