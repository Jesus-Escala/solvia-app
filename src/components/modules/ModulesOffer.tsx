import { ArrowUpRight, Boxes, Check, ScanBarcode, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '@/ui';
import { useModules } from '../../hooks/useModules';
import { useI18n } from '../../i18n/I18nProvider';
import { LANDING_URL } from '../../lib/config';
import type { TenantModule } from '../../lib/types';

/**
 * Reference extra price per month of each module (PEN): the same as the landing page
 * (solvia-landing `sections/plans.ts`) and the backoffice.
 */
const MODULE_PRICES: Record<TenantModule, number> = { sales: 29, inventory: 29 };
const ICONS: Record<TenantModule, ReactNode> = { sales: <ScanBarcode />, inventory: <Boxes /> };
const POINTS = ['a', 'b', 'c'] as const;

/**
 * The modules this business does not have yet, with what each one adds, its extra price and a
 * link to ask for it. Renders nothing while loading or when every module is on.
 */
export function ModulesOffer({ className }: { className?: string }) {
  const { t, fmt } = useI18n();
  const modules = useModules();
  if (modules.loading) return null;
  const missing = (['sales', 'inventory'] as const).filter((module) => !modules[module]);
  if (missing.length === 0) return null;

  return (
    <section
      aria-labelledby="modules-offer-title"
      className={cx(
        'rounded-2xl border border-primary/30 bg-gradient-to-br from-primary-soft/70 to-surface p-5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 id="modules-offer-title" className="font-semibold">
            {t('modules.offer.title')}
          </h2>
          <p className="text-sm text-muted">{t('modules.offer.subtitle')}</p>
        </div>
      </div>
      <ul className={cx('mt-4 grid gap-3', missing.length > 1 && 'sm:grid-cols-2')}>
        {missing.map((module) => (
          <li key={module} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 font-semibold [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-primary">
                {ICONS[module]}
                {t(`modules.offer.${module}.name`)}
              </span>
              <span className="text-sm font-semibold text-primary-ink">
                {t('modules.offer.price', {
                  amount: fmt.money(MODULE_PRICES[module]).replace(/[.,]00$/, ''),
                })}
              </span>
            </div>
            <ul className="mt-2 space-y-1">
              {POINTS.map((point) => (
                <li key={point} className="flex gap-2 text-sm text-muted">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  {t(`modules.offer.${module}.${point}`)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <a
        // One module: the request form with it checked; both: the plan builder of the landing.
        href={
          missing.length > 1
            ? `${LANDING_URL}/#pricing`
            : `${LANDING_URL}/#solicitar-acceso-${missing[0]}`
        }
        target="_blank"
        rel="noopener"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm transition hover:brightness-110"
      >
        {t('modules.offer.cta')}
        <ArrowUpRight className="h-4 w-4" />
      </a>
      <p className="mt-2 text-xs text-subtle">{t('modules.offer.note')}</p>
    </section>
  );
}
