import { AsYouType } from 'libphonenumber-js/min';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useUiI18n } from '../i18n/context';
import { cx } from './cx';
import { Popover } from './Overlays';
import {
  countryOptions,
  DEFAULT_COUNTRY,
  flagUrl,
  FREQUENT_COUNTRIES,
  isValidPhone,
  splitPhone,
  toE164,
  type CountryCode,
  type CountryOption,
} from './phoneCountries';

function Flag({ code, className }: { code: string; className?: string }) {
  const src = flagUrl(code);
  return src ? (
    <img
      src={src}
      alt=""
      loading="lazy"
      className={cx('h-3.5 w-[21px] shrink-0 rounded-[3px] object-cover shadow-xs', className)}
    />
  ) : (
    <span className="w-[21px] text-center text-[10px] font-semibold text-subtle">{code}</span>
  );
}

function CountryList({
  options,
  selected,
  onSelect,
}: {
  options: CountryOption[];
  selected: CountryCode;
  onSelect: (code: CountryCode) => void;
}) {
  const { t } = useUiI18n();
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase().replace(/^\+/, '');
  const matches = (option: CountryOption) =>
    !normalized ||
    option.name.toLowerCase().includes(normalized) ||
    option.code.toLowerCase() === normalized ||
    option.dialCode.slice(1).startsWith(normalized);
  const frequent = normalized
    ? []
    : FREQUENT_COUNTRIES.map((code) => options.find((option) => option.code === code)).filter(
        (option): option is CountryOption => Boolean(option),
      );
  const rest = options.filter(matches);

  const item = (option: CountryOption) => (
    <button
      key={option.code}
      type="button"
      role="option"
      aria-selected={option.code === selected}
      onClick={() => onSelect(option.code)}
      className={cx(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface-3',
        option.code === selected && 'bg-primary-soft/60',
      )}
    >
      <Flag code={option.code} />
      <span className="min-w-0 flex-1 truncate">{option.name}</span>
      <span className="text-xs text-muted tabular-nums">{option.dialCode}</span>
      {option.code === selected && <Check className="h-4 w-4 text-primary" />}
    </button>
  );

  return (
    <div className="flex flex-col">
      <label className="relative mb-1.5 block">
        <span className="sr-only">{t('phone.search')}</span>
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-subtle" />
        <input
          autoFocus
          className="input h-9 pl-8"
          placeholder={t('phone.search')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              const first = rest[0];
              if (first) onSelect(first.code);
            }
          }}
        />
      </label>
      <div role="listbox" aria-label={t('phone.country')} className="max-h-64 overflow-y-auto">
        {frequent.length > 0 && (
          <>
            <p className="px-2.5 pt-1 pb-1 text-[11px] font-semibold tracking-wide text-subtle uppercase">
              {t('phone.frequent')}
            </p>
            {frequent.map(item)}
            <p className="mt-1 border-t border-line px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-subtle uppercase">
              {t('phone.all')}
            </p>
          </>
        )}
        {rest.map(item)}
        {rest.length === 0 && (
          <p className="px-2.5 py-3 text-center text-sm text-muted">{t('phone.noResults')}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Phone field with a country picker (flag + calling code, Peru by default) and as-you-type
 * formatting. `value`/`onChange` use E.164 (e.g. "+51987654321"); '' when empty.
 */
export function PhoneInput({
  id,
  value,
  onChange,
  defaultCountry = DEFAULT_COUNTRY,
  describedBy,
  required,
  invalid,
  className,
  name,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  defaultCountry?: CountryCode;
  describedBy?: string;
  required?: boolean;
  /** Forces the invalid style (e.g. a server-side error). */
  invalid?: boolean;
  className?: string;
  name?: string;
}) {
  const { t, locale } = useUiI18n();
  const [initial] = useState(() => splitPhone(value, defaultCountry));
  const [country, setCountry] = useState<CountryCode>(initial.country);
  const [national, setNational] = useState(initial.national);
  const [touched, setTouched] = useState(false);
  const options = useMemo(() => countryOptions(locale), [locale]);
  const current = options.find((option) => option.code === country);

  const display = useMemo(() => new AsYouType(country).input(national), [country, national]);
  const showInvalid = invalid || (touched && national.length > 0 && !isValidPhone(value));

  const update = (nextCountry: CountryCode, nextNational: string) => {
    setCountry(nextCountry);
    setNational(nextNational);
    onChange(toE164(nextCountry, nextNational));
  };

  return (
    <div
      className={cx(
        'flex items-stretch rounded-lg border bg-surface shadow-xs transition focus-within:ring-3',
        showInvalid
          ? 'border-danger focus-within:ring-danger/15'
          : 'border-line focus-within:border-primary focus-within:ring-primary/15',
        className,
      )}
    >
      <Popover
        align="start"
        width={300}
        trigger={({ toggle, ref, open }) => (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={`${t('phone.country')}: ${current?.name ?? country}`}
            className="flex shrink-0 items-center gap-1.5 rounded-l-lg border-r border-line pr-2 pl-3 text-sm hover:bg-surface-3"
          >
            <Flag code={country} />
            <span className="text-ink tabular-nums">{current?.dialCode}</span>
            <ChevronDown className="h-3.5 w-3.5 text-subtle" />
          </button>
        )}
      >
        {(close) => (
          <CountryList
            options={options}
            selected={country}
            onSelect={(code) => {
              update(code, national);
              close();
              document.getElementById(id)?.focus();
            }}
          />
        )}
      </Popover>
      <input
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        required={required}
        aria-describedby={describedBy}
        aria-invalid={showInvalid || undefined}
        placeholder={country === 'PE' ? '987 654 321' : ''}
        value={display}
        onChange={(event) => {
          const raw = event.target.value;
          // Pasted/typed international number: pick its country automatically.
          if (raw.trim().startsWith('+')) {
            const pasted = splitPhone(raw.replace(/[^\d+]/g, ''), country);
            if (pasted.national) return update(pasted.country, pasted.national);
          }
          const digits = raw.replace(/\D/g, '');
          // Backspace over a formatting space removes the digit before it.
          const next =
            digits === national && raw.length < display.length ? national.slice(0, -1) : digits;
          update(country, next);
        }}
        onBlur={() => setTouched(true)}
        className="min-w-0 flex-1 rounded-r-lg bg-transparent px-3 py-2 text-sm text-ink placeholder:text-subtle focus:outline-none"
      />
    </div>
  );
}
