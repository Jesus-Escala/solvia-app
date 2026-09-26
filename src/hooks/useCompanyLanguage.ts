import { useCallback, useEffect } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import type { BusinessLanguage } from '../lib/types';
import { useMe } from './queries';

/** The company language last applied on this device (so a later personal change is kept). */
const APPLIED_KEY = 'solvia.companyLanguage';

function readApplied(): string | null {
  try {
    return localStorage.getItem(APPLIED_KEY);
  } catch {
    return null;
  }
}

function storeApplied(language: BusinessLanguage) {
  try {
    localStorage.setItem(APPLIED_KEY, language);
  } catch {
    // Not persisted: it is applied again next time.
  }
}

/**
 * The language of the company is the language of the app for its whole team: it is applied when
 * someone signs in and whenever an admin changes it. Each person can still switch the language on
 * their own device (ES / EN in the top bar) until the company language changes again.
 */
export function useCompanyLanguage() {
  const { setLocale } = useI18n();
  const { data: me } = useMe();
  const language = me?.tenant.language ?? null;

  useEffect(() => {
    if (language === null || readApplied() === language) return;
    storeApplied(language);
    setLocale(language);
  }, [language, setLocale]);

  /** Applies a company language right away (after an admin saves it). */
  return useCallback(
    (next: BusinessLanguage) => {
      storeApplied(next);
      setLocale(next);
    },
    [setLocale],
  );
}
