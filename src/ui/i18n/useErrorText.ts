import { useCallback } from 'react';
import { ApiError } from '../lib/http';
import { useUiI18n } from './context';

/**
 * Translates API errors: known error codes and invalid form fields get a message in the current
 * language; anything else falls back to the server message or a generic text.
 */
export function useErrorText() {
  const { t: translateKey, locale } = useUiI18n();
  // Error keys are built at runtime from API codes, so this lookup is untyped.
  const t = translateKey as (key: string) => string;

  const translate = useCallback(
    (key: string) => {
      const text = t(key);
      return text === key ? undefined : text;
    },
    [t],
  );

  const message = useCallback(
    (error: unknown): string => {
      if (error instanceof ApiError) {
        return translate(`errors.codes.${error.code}`) ?? error.message ?? t('errors.generic');
      }
      return t('errors.generic');
    },
    [t, translate],
  );

  /** Message for one form field, or undefined when the field is valid. */
  const field = useCallback(
    (error: unknown, name: string): string | undefined => {
      if (!(error instanceof ApiError)) return undefined;
      const serverMessage = error.fieldErrors[name];
      if (!serverMessage) return undefined;
      // English UI can show the (English) server message; other locales use a translated hint.
      if (locale === 'en') return serverMessage;
      return translate(`errors.fields.${name}`) ?? t('errors.fields.generic');
    },
    [locale, t, translate],
  );

  const hasFieldErrors = (error: unknown) =>
    error instanceof ApiError && Object.keys(error.fieldErrors).length > 0;

  return { message, field, hasFieldErrors };
}
