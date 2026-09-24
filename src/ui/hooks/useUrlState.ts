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

/**
 * Connects a server-sorted `DataTable` to `useUrlState` (keys `sortBy` / `sortDir`): spread the
 * result on the table. Changing the order goes back to page 1; a third click on a header clears
 * it (the list's default order).
 */
export function urlSort(
  state: { sortBy: string; sortDir: string },
  update: (changes: { sortBy: string; sortDir: string; page: string }) => void,
) {
  return {
    ...(state.sortBy && {
      sort: {
        id: state.sortBy,
        dir: state.sortDir === 'desc' ? ('desc' as const) : ('asc' as const),
      },
    }),
    onSortChange: (sort: { id: string; dir: 'asc' | 'desc' } | null) =>
      update({ sortBy: sort?.id ?? '', sortDir: sort?.dir ?? '', page: '1' }),
  };
}
