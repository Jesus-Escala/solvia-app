import { createUseI18n, I18nProvider as BaseI18nProvider, type Leaves } from '@/ui';
import type { ReactNode } from 'react';
import { en } from './messages/en';
import { es, type Messages } from './messages/es';

export type TranslationKey = Leaves<Messages>;

const DICTIONARIES = { es, en };

export function I18nProvider({ children }: { children: ReactNode }) {
  return <BaseI18nProvider dictionaries={DICTIONARIES}>{children}</BaseI18nProvider>;
}

/** Typed translations for this app: `t()` only accepts keys that exist in `es.ts`. */
// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with its provider
export const useI18n = createUseI18n<Messages>();
