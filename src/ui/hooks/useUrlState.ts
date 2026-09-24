import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Table/list state stored in the URL query string (filters, search, sort, page), so views are
 * linkable and survive reloads. Changing anything other than `page` resets `page` to 1.
 */
export function useUrlState<T extends Record<string, string>>(defaults: T) {
  const [params, setParams] = useSearchParams();

  const state = useMemo(() => {
    const result = { ...defaults };
    for (const key of Object.keys(defaults) as Array<keyof T>) {
      const value = params.get(key as string);
      if (value !== null) result[key] = value as T[keyof T];
    }
    return result;
    // `defaults` is expected to be a stable literal per page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const update = useCallback(
    (changes: Partial<T>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            // Only the default is left out of the URL: an empty value that is not the default
            // (e.g. "Todos" where the default filter is another one) must stay, or it would
            // fall back to the default.
            if (value === undefined || value === defaults[key]) next.delete(key);
            else next.set(key, value);
          }
          if (!('page' in changes)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams],
  );

  return [state, update] as const;
}
