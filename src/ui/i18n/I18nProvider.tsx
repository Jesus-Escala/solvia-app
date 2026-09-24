import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18nContext, type I18nValue, type TranslationVars } from './context';
import { LOCALES, type Locale } from './locales';
import type { UiMessages } from './messages';

const STORAGE_KEY = 'solvia.locale';
const CURRENCY = (import.meta.env.VITE_CURRENCY as string | undefined) ?? 'PEN';

/** Every app dictionary includes the UI kit strings, so shared components can translate too. */
export type Dictionaries<M extends UiMessages> = Record<Locale, M>;

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'es' || stored === 'en') return stored;
  } catch {
    // Storage unavailable: fall back to the default.
  }
  return 'es';
}

function lookup(dictionary: unknown, key: string): string | undefined {
  let node: unknown = dictionary;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/**
 * Fills `{name}` placeholders. `{count|# item|# items}` picks the singular when the value is 1
 * and the plural otherwise; `#` stands for the value ("1 deuda", "3 deudas").
 */
function interpolate(text: string, vars?: TranslationVars) {
  if (!vars) return text;
  return text
    .replace(/\{(\w+)\|([^|}]*)\|([^}]*)\}/g, (match, name: string, one: string, other: string) =>
      name in vars
        ? (Number(vars[name]) === 1 ? one : other).replace(/#/g, String(vars[name]))
        : match,
    )
    .replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

function createFormatters(intlLocale: string) {
  const money = new Intl.NumberFormat(intlLocale, { style: 'currency', currency: CURRENCY });
  const compactMoney = new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: CURRENCY,
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  const number = new Intl.NumberFormat(intlLocale);
  const percent = new Intl.NumberFormat(intlLocale, { style: 'percent', maximumFractionDigits: 0 });
  const date = new Intl.DateTimeFormat(intlLocale, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const shortDate = new Intl.DateTimeFormat(intlLocale, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  });
  const dateTime = new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium', timeStyle: 'short' });
  const period = new Intl.DateTimeFormat(intlLocale, {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  });
  const shortPeriod = new Intl.DateTimeFormat(intlLocale, {
    timeZone: 'UTC',
    month: 'short',
    year: 'numeric',
  });

  /** Parses `YYYY-MM-DD` (or an ISO string) as a UTC calendar day, avoiding timezone shifts. */
  const toUtcDay = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number) as [
      number,
      number,
      number,
    ];
    return new Date(Date.UTC(year, month - 1, day));
  };
  const toUtcMonth = (period: string) => {
    const [year, month] = period.split('-').map(Number) as [number, number];
    return new Date(Date.UTC(year, month - 1, 1));
  };

  return {
    currency: CURRENCY,
    money: (value: number) => money.format(value),
    compactMoney: (value: number) => compactMoney.format(value),
    number: (value: number) => number.format(value),
    percent: (value: number) => percent.format(value),
    date: (value: string) => date.format(toUtcDay(value)),
    shortDate: (value: string) => shortDate.format(toUtcDay(value)),
    dateTime: (value: string) => dateTime.format(new Date(value)),
    period: (value: string) => period.format(toUtcMonth(value)),
    shortPeriod: (value: string) => shortPeriod.format(toUtcMonth(value)),
  };
}

export type Formatters = ReturnType<typeof createFormatters>;

/** Provides translations for an app. Pass the app's dictionaries (which include `uiEs`/`uiEn`). */
export function I18nProvider<M extends UiMessages>({
  dictionaries,
  children,
}: {
  dictionaries: Dictionaries<M>;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not persisted; still applied for this session.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nValue<string>>(() => {
    const dictionary = dictionaries[locale];
    const intl = LOCALES.find((item) => item.value === locale)?.intl ?? 'es-PE';
    return {
      locale,
      setLocale,
      // Falls back to Spanish, then to the key itself, so a missing string is visible but never crashes.
      t: (key, vars) =>
        interpolate(lookup(dictionary, key) ?? lookup(dictionaries.es, key) ?? key, vars),
      fmt: createFormatters(intl),
    };
  }, [dictionaries, locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
