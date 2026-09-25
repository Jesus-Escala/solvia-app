/** Mac keyboards use Option (⌥) where Windows uses Alt. */
const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Label of the save shortcut on this keyboard ("Alt S" or "⌥S"). */
export const SAVE_KEY_LABEL = MAC ? '⌥S' : 'Alt S';

/** Label of the search shortcut ("Alt B" or "⌥B"). */
export const SEARCH_KEY_LABEL = MAC ? '⌥B' : 'Alt B';

/**
 * Alt+S (Option+S on a Mac): charge / confirm / save. The physical key is read (`code`), because
 * Option+S types "ß" on a Mac.
 */
export const isSaveKey = (event: KeyboardEvent) =>
  event.altKey && !event.ctrlKey && !event.metaKey && event.code === 'KeyS';

/** Alt+B (Option+B): back to the product search ("buscar"). */
export const isSearchKey = (event: KeyboardEvent) =>
  event.altKey && !event.ctrlKey && !event.metaKey && event.code === 'KeyB';
