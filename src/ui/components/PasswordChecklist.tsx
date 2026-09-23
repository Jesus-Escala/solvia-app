import { Check, X } from 'lucide-react';
import { useUiI18n } from '../i18n/context';
import { cx } from './cx';
import { PASSWORD_RULES } from './passwordRules';

/**
 * Live checklist of the password rules. Unmet rules turn red once `showErrors` is set
 * (after a submit attempt), so the user isn't scolded while still typing.
 */
export function PasswordChecklist({
  id,
  value,
  showErrors,
}: {
  id?: string;
  value: string;
  showErrors: boolean;
}) {
  const { t } = useUiI18n();
  return (
    <ul id={id} className="mt-1.5 grid gap-x-3 gap-y-1 text-xs sm:grid-cols-2">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        const failed = !met && showErrors;
        return (
          <li
            key={rule.key}
            className={cx(
              'flex items-center gap-1.5 transition-colors',
              met ? 'text-success-ink' : failed ? 'text-danger-ink' : 'text-subtle',
            )}
          >
            <span
              className={cx(
                'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full',
                met ? 'bg-success-soft' : failed ? 'bg-danger-soft' : 'bg-surface-3',
              )}
              aria-hidden="true"
            >
              {met ? (
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              ) : failed ? (
                <X className="h-2.5 w-2.5" strokeWidth={3} />
              ) : null}
            </span>
            {t(rule.key)}
            <span className="sr-only">
              {met ? ` (${t('passwordRules.met')})` : ` (${t('passwordRules.missing')})`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
