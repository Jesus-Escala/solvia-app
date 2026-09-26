import { MessageCircle, UserRound, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Alert, Card, cx, Skeleton, WhatsAppIcon, smallButtonClass } from '@/ui';
import { usePlanUsage } from '../../hooks/queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { PlanUsage } from '../../lib/types';
import { ModulesOffer } from '../modules/ModulesOffer';

/** Share used, 0..1 (0 when the limit is unlimited or zero). */
const share = (used: number, limit: number | null) =>
  limit === null || limit === 0 ? 0 : Math.min(1, used / limit);

function Meter({
  icon,
  label,
  used,
  limit,
  hint,
}: {
  icon: ReactNode;
  label: string;
  used: number;
  limit: number | null;
  hint?: ReactNode;
}) {
  const { t, fmt } = useI18n();
  const ratio = share(used, limit);
  const tone = ratio >= 1 ? 'bg-danger' : ratio >= 0.8 ? 'bg-warning' : 'bg-primary';
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-primary">
          {icon}
          {label}
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {limit === null
            ? t('plan.unlimitedUsed', { used: fmt.number(used) })
            : t('plan.usedOf', { used: fmt.number(used), limit: fmt.number(limit) })}
        </span>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cx('h-full rounded-full transition-all', limit === null ? 'bg-success' : tone)}
          style={{ width: `${limit === null ? 100 : Math.max(2, ratio * 100)}%` }}
        />
      </div>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** "Mi plan": what the plan includes, what the business used this month and how to get more. */
export function PlanUsageCard() {
  const { t, fmt } = useI18n();
  const usage = usePlanUsage();
  const data = usage.data;

  return (
    <div className="space-y-4">
      <Card
        title={t('plan.title')}
        subtitle={
          data
            ? data.price
              ? t('plan.pays', {
                  amount: fmt.money(data.price.perMonth),
                  billing: t(`plan.billing.${data.price.billing}`),
                })
              : t('plan.plans.free')
            : undefined
        }
        loading={usage.isFetching && !usage.isLoading}
      >
        {!data ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <Meter
              icon={<MessageCircle />}
              label={t('plan.automatic')}
              used={data.automaticMessages.used}
              limit={data.automaticMessages.limit}
              hint={
                data.automaticMessages.extra > 0
                  ? t('plan.withPacks', { extra: fmt.number(data.automaticMessages.extra) })
                  : t('plan.automaticHint')
              }
            />
            <Meter
              icon={<UserRound />}
              label={t('plan.users')}
              used={data.users.used}
              limit={data.users.limit}
            />
            <Meter
              icon={<Users />}
              label={t('plan.customers')}
              used={data.customers.used}
              limit={data.customers.limit}
            />
          </div>
        )}
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-success-soft/60 px-3 py-2.5 text-sm text-success-ink">
          <WhatsAppIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {t('plan.manual')}
        </p>
        {data && (
          <p className="mt-3 text-xs text-muted">
            {t('plan.packs', { size: fmt.number(data.packSize) })}
          </p>
        )}
      </Card>
      <ModulesOffer />
    </div>
  );
}

/** What is about to run out (or already did), for the notice on Home. */
function limits(data: PlanUsage) {
  const out: Array<'automatic' | 'automaticLow' | 'users' | 'customers'> = [];
  const messages = data.automaticMessages;
  if (messages.limit > 0 && messages.left === 0) out.push('automatic');
  else if (messages.limit > 0 && messages.left / messages.limit <= 0.2) out.push('automaticLow');
  if (data.users.limit !== null && data.users.used >= data.users.limit) out.push('users');
  if (data.customers.limit !== null && data.customers.used >= data.customers.limit)
    out.push('customers');
  return out;
}

/** Home notice when a limit of the plan is reached or about to be (admins only). */
export function PlanLimitNotice() {
  const { t, fmt } = useI18n();
  const usage = usePlanUsage();
  if (!usage.data) return null;
  const reached = limits(usage.data);
  if (reached.length === 0) return null;
  return (
    <Alert tone="warning">
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span>
          {reached
            .map((key) =>
              t(`plan.notice.${key}`, { left: fmt.number(usage.data.automaticMessages.left) }),
            )
            .join(' ')}
        </span>
        <Link to="/settings?tab=plan" className={smallButtonClass('xs', 'ml-1')}>
          {t('plan.notice.link')}
        </Link>
      </span>
    </Alert>
  );
}
