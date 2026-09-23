export type Locale = 'es' | 'en';

/** Supported UI languages and the Intl locale used to format numbers and dates. */
export const LOCALES: Array<{ value: Locale; label: string; intl: string }> = [
  { value: 'es', label: 'Español', intl: 'es-PE' },
  { value: 'en', label: 'English', intl: 'en-US' },
];
