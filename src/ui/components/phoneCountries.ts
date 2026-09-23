import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min';

export type { CountryCode };

/** SVG flag URLs (3:2), one file per country, only downloaded when an <img> shows it. */
const FLAG_URLS = import.meta.glob<string>('/node_modules/country-flag-icons/3x2/*.svg', {
  // no-inline: keep each flag a separate file instead of inlining all of them in the bundle.
  query: '?no-inline',
  import: 'default',
  eager: true,
});

export function flagUrl(country: string): string | undefined {
  return FLAG_URLS[`/node_modules/country-flag-icons/3x2/${country}.svg`];
}

export const DEFAULT_COUNTRY: CountryCode = 'PE';

/** Shown first in the picker (Peru, then the most common countries for Peruvian businesses). */
export const FREQUENT_COUNTRIES: CountryCode[] = [
  'PE',
  'CL',
  'CO',
  'EC',
  'BO',
  'AR',
  'BR',
  'VE',
  'MX',
  'US',
  'ES',
];

export interface CountryOption {
  code: CountryCode;
  name: string;
  dialCode: string;
}

/** Every country with its localized name and calling code, sorted by name. */
export function countryOptions(locale: string): CountryOption[] {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    // Old browsers: fall back to the ISO code.
  }
  return getCountries()
    .map((code) => ({
      code,
      name: names?.of(code) ?? code,
      dialCode: `+${getCountryCallingCode(code)}`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

/** Splits a stored E.164 number (e.g. "+51987654321") into its country and national part. */
export function splitPhone(value: string, fallback: CountryCode = DEFAULT_COUNTRY) {
  const parsed = value ? parsePhoneNumberFromString(value) : undefined;
  if (parsed?.country) return { country: parsed.country, national: parsed.nationalNumber };
  return { country: fallback, national: '' };
}

/** Builds the E.164 value from the chosen country and what the user typed ('' when empty). */
export function toE164(country: CountryCode, national: string): string {
  const digits = national.replace(/\D/g, '');
  if (!digits) return '';
  return (
    parsePhoneNumberFromString(digits, country)?.number ??
    `+${getCountryCallingCode(country)}${digits}`
  );
}

/** True when the value is a valid phone number for its country. */
export function isValidPhone(value: string): boolean {
  return Boolean(value && parsePhoneNumberFromString(value)?.isValid());
}

/** Readable international format for display, e.g. "+51 987 654 321" (as-is when unparsable). */
export function formatPhone(value: string): string {
  return parsePhoneNumberFromString(value)?.formatInternational() ?? value;
}
