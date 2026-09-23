import type { TranslationVars } from '@/ui';
import type { TranslationKey } from '../../i18n/I18nProvider';
import type { ReceivableStatus } from '../../lib/types';

/** Today's calendar date (browser timezone) as YYYY-MM-DD. */
export function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string) {
  return Math.round(
    (Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000,
  );
}

/** Relative due-date text ("Due in 3 days", "Overdue by 5 days") and whether it is urgent. */
export function dueLabel(
  dueDate: string,
  status: ReceivableStatus,
  t: (key: TranslationKey, vars?: TranslationVars) => string,
): { text: string; urgent: boolean } | null {
  if (status === 'paid') return null;
  const days = daysBetween(todayIso(), dueDate);
  if (days < 0) return { text: t('receivables.overdueBy', { days: -days }), urgent: true };
  if (days === 0) return { text: t('receivables.dueToday'), urgent: true };
  if (days === 1) return { text: t('receivables.dueTomorrow'), urgent: false };
  return { text: t('receivables.dueIn', { days }), urgent: false };
}
