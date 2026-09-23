import type { Leaves } from '../i18n/context';
import type { UiMessages } from '../i18n/messages';

type RuleKey = Leaves<UiMessages> & `passwordRules.${string}`;

/**
 * Password policy for new passwords. Mirrors the backend schema
 * (backend/src/validators/auth.schemas.ts); keep both in sync.
 */
export const PASSWORD_RULES: { key: RuleKey; test: (value: string) => boolean }[] = [
  { key: 'passwordRules.length', test: (value) => value.length >= 8 },
  { key: 'passwordRules.uppercase', test: (value) => /\p{Lu}/u.test(value) },
  { key: 'passwordRules.number', test: (value) => /\d/.test(value) },
  { key: 'passwordRules.special', test: (value) => /[^\p{L}\p{N}\s]/u.test(value) },
];

export const meetsPasswordPolicy = (value: string) =>
  PASSWORD_RULES.every((rule) => rule.test(value));
