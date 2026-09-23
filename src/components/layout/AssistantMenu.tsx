import { BookOpen, ChevronRight, Compass, MessageCircleHeart, ReceiptText } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n/I18nProvider';
import { useTour } from '../../tour/TourProvider';
import { Mascot, Popover } from '@/ui';

function Action({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left text-sm font-medium transition hover:border-primary/40 hover:bg-primary-soft/40"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-ink [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-subtle transition group-hover:translate-x-0.5" />
    </button>
  );
}

/**
 * "Soli" assistant entry point in the top bar. Today it offers quick help (tour, help center,
 * shortcuts); the panel is designed to host a chat conversation later.
 */
export function AssistantMenu() {
  const { t } = useI18n();
  const { user } = useAuth();
  const tour = useTour();
  const navigate = useNavigate();
  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <Popover
      width={320}
      trigger={({ toggle, ref, open }) => (
        <span data-tour="help">
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-label={t('assistant.open')}
            title={t('assistant.open')}
            className="relative flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-primary/25 transition hover:scale-105 hover:ring-primary/50"
          >
            <Mascot variant="avatar" size={34} />
            <span
              className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-success"
              aria-hidden="true"
            />
          </button>
        </span>
      )}
    >
      {(close) => (
        <div>
          <div className="relative -m-1.5 mb-3 overflow-hidden rounded-t-xl bg-[linear-gradient(135deg,var(--primary-soft),var(--surface))] px-4 pt-4 pb-3">
            <div className="flex items-end gap-3">
              <Mascot size={64} mood="wave" />
              <div className="pb-1">
                <p className="text-sm font-semibold">
                  {t('assistant.greeting', { name: firstName })}
                </p>
                <p className="text-[11px] font-medium text-primary-ink">{t('assistant.role')}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted">{t('assistant.intro')}</p>
          </div>
          <div className="space-y-2 px-1 pb-1">
            <Action
              icon={<Compass />}
              label={t('assistant.tour')}
              onClick={() => {
                close();
                tour.start();
              }}
            />
            <Action
              icon={<BookOpen />}
              label={t('assistant.helpCenter')}
              onClick={() => {
                close();
                navigate('/help');
              }}
            />
            <Action
              icon={<ReceiptText />}
              label={t('assistant.newReceivable')}
              onClick={() => {
                close();
                navigate('/receivables');
              }}
            />
            <p className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
              <MessageCircleHeart className="h-4 w-4 shrink-0 text-primary" />
              {t('assistant.comingSoon')}
            </p>
          </div>
        </div>
      )}
    </Popover>
  );
}
