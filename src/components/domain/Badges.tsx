import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock,
  ShieldAlert,
  ShieldCheck,
  ShieldHalf,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import type { ReceivableStatus, RiskScore } from '../../lib/types';
import { Badge, type BadgeTone } from '@/ui';

const STATUS: Record<ReceivableStatus, { tone: BadgeTone; icon: React.ReactNode }> = {
  pending: { tone: 'neutral', icon: <Clock /> },
  partial: { tone: 'warning', icon: <CircleDashed /> },
  paid: { tone: 'success', icon: <CheckCircle2 /> },
  overdue: { tone: 'danger', icon: <AlertTriangle /> },
};

export function StatusBadge({ status }: { status: ReceivableStatus }) {
  const { t } = useI18n();
  return (
    <Badge tone={STATUS[status].tone} icon={STATUS[status].icon}>
      {t(`status.${status}`)}
    </Badge>
  );
}

const RISK = {
  low: { tone: 'success', icon: <ShieldCheck /> },
  medium: { tone: 'warning', icon: <ShieldHalf /> },
  high: { tone: 'danger', icon: <ShieldAlert /> },
} as const;

/** Risk level badge; the tooltip (and optional detail line) explains the underlying metrics. */
export function RiskBadge({
  risk,
  showDetails = false,
}: {
  risk: RiskScore;
  showDetails?: boolean;
}) {
  const { t, fmt } = useI18n();
  const { metrics } = risk;
  const details =
    metrics.evaluatedReceivables === 0
      ? t('risk.noHistory')
      : t('risk.details', {
          rate: metrics.onTimeRate === null ? '—' : fmt.percent(metrics.onTimeRate),
          days: fmt.number(metrics.averageDaysOverdue),
          count: metrics.currentOverdueCount,
        });

  return (
    <span className="inline-flex flex-col gap-1">
      <Badge tone={RISK[risk.level].tone} icon={RISK[risk.level].icon} title={details}>
        {t(`risk.${risk.level}`)}
      </Badge>
      {showDetails && <span className="text-xs text-muted">{details}</span>}
    </span>
  );
}
