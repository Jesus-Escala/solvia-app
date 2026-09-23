import { createContext, useContext } from 'react';
import type { Locale } from './locales';
import type { UiMessages } from './messages';
import type { Formatters } from './I18nProvider';

/** Dotted paths to every string in a dictionary, e.g. "nav.dashboard". */
export type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationVars = Record<string, string | number>;

export interface I18nValue<Key extends string> {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: Key, vars?: TranslationVars) => string;
  fmt: Formatters;
}

export const I18nContext = createContext<I18nValue<string> | null>(null);

function useI18nContext() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within an I18nProvider');
  return context;
}

/**
 * Builds the typed `useI18n` hook of an app: `t()` only accepts keys of that app's dictionary.
 *
 *   export const useI18n = createUseI18n<Messages>();
 */
export function createUseI18n<M extends UiMessages>() {
  return useI18nContext as () => I18nValue<Leaves<M>>;
}

/** Translations for the shared UI kit itself (only the `uiEs` keys). */
export const useUiI18n = createUseI18n<UiMessages>();
