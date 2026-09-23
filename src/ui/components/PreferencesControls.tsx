import { Check, Languages, Monitor, Moon, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { useUiI18n } from '../i18n/context';
import { LOCALES } from '../i18n/locales';
import { useTheme, type ThemePreference } from '../theme/ThemeProvider';
import { IconButton } from './Button';
import { Popover } from './Overlays';

const THEME_ICONS: Record<ThemePreference, ReactNode> = {
  light: <Sun />,
  dark: <Moon />,
  system: <Monitor />,
};

/** Language and theme switchers (also used on the public auth pages). */
export function PreferencesControls({ tourTarget = true }: { tourTarget?: boolean }) {
  const { t, locale, setLocale } = useUiI18n();
  const { preference, resolved, setPreference } = useTheme();

  return (
    <div className="flex items-center gap-1" data-tour={tourTarget ? 'preferences' : undefined}>
      <Popover
        width={200}
        trigger={({ toggle, ref }) => (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            aria-label={t('prefs.language')}
            title={t('prefs.language')}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted uppercase transition hover:bg-surface-3 hover:text-ink"
          >
            <Languages className="h-4 w-4" />
            {locale}
          </button>
        )}
      >
        {(close) => (
          <>
            <p className="px-2.5 pt-1 pb-1.5 text-xs font-semibold text-muted">
              {t('prefs.language')}
            </p>
            {LOCALES.map((option) => (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={locale === option.value}
                onClick={() => {
                  setLocale(option.value);
                  close();
                }}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-surface-3"
              >
                {option.label}
                {locale === option.value && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </>
        )}
      </Popover>
      <Popover
        width={210}
        trigger={({ toggle, ref }) => (
          <IconButton ref={ref} label={t('prefs.theme')} onClick={toggle} className="h-9 w-9">
            <span className="[&>svg]:h-4 [&>svg]:w-4">
              {THEME_ICONS[preference === 'system' ? 'system' : resolved]}
            </span>
          </IconButton>
        )}
      >
        {(close) => (
          <>
            <p className="px-2.5 pt-1 pb-1.5 text-xs font-semibold text-muted">
              {t('prefs.theme')}
            </p>
            {(['light', 'dark', 'system'] as ThemePreference[]).map((option) => (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={preference === option}
                onClick={() => {
                  setPreference(option);
                  close();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-surface-3"
              >
                <span className="text-muted [&>svg]:h-4 [&>svg]:w-4">{THEME_ICONS[option]}</span>
                <span className="flex-1">
                  {t(
                    option === 'light'
                      ? 'prefs.themeLight'
                      : option === 'dark'
                        ? 'prefs.themeDark'
                        : 'prefs.themeSystem',
                  )}
                </span>
                {preference === option && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </>
        )}
      </Popover>
    </div>
  );
}
