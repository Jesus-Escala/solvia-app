import { useState } from 'react';
import { useUiI18n, type Leaves } from '../i18n/context';
import type { UiMessages } from '../i18n/messages';

const INDUSTRY_KEYS = [
  'grocery',
  'hardware',
  'wholesale',
  'restaurant',
  'pharmacy',
  'clothing',
  'technology',
  'professional',
  'health',
  'education',
  'construction',
  'transport',
] as const;

const OTHER = 'other';

/**
 * Industry picker: a select with common small-business industries plus "Other", which reveals a
 * text field. Reports the resulting industry text ('' when nothing was chosen).
 */
export function IndustrySelect({
  id,
  onChange,
  defaultValue = '',
}: {
  id: string;
  onChange: (industry: string) => void;
  /** Initial industry text (e.g. from an access request): a known label or free text. */
  defaultValue?: string;
}) {
  const { t } = useUiI18n();
  const [initial] = useState(() => {
    const value = defaultValue.trim();
    if (!value) return { choice: '', custom: '' };
    const known = INDUSTRY_KEYS.find(
      (key) => t(`industries.${key}` as Leaves<UiMessages>).toLowerCase() === value.toLowerCase(),
    );
    return known ? { choice: known as string, custom: '' } : { choice: OTHER, custom: value };
  });
  const [choice, setChoice] = useState(initial.choice);
  const [custom, setCustom] = useState(initial.custom);

  const label = (key: string) => t(`industries.${key}` as Leaves<UiMessages>);

  return (
    <div className="space-y-2">
      <select
        id={id}
        className="input"
        value={choice}
        onChange={(event) => {
          const value = event.target.value;
          setChoice(value);
          onChange(value === OTHER ? custom.trim() : value ? label(value) : '');
        }}
      >
        <option value="">{t('industries.placeholder')}</option>
        {INDUSTRY_KEYS.map((key) => (
          <option key={key} value={key}>
            {label(key)}
          </option>
        ))}
        <option value={OTHER}>{t('industries.other')}</option>
      </select>
      {choice === OTHER && (
        <input
          className="input"
          autoFocus
          maxLength={80}
          placeholder={t('industries.otherPlaceholder')}
          aria-label={t('industries.otherPlaceholder')}
          value={custom}
          onChange={(event) => {
            setCustom(event.target.value);
            onChange(event.target.value.trim());
          }}
        />
      )}
    </div>
  );
}
