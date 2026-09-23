import {
  BellRing,
  ChevronDown,
  Compass,
  HandCoins,
  LayoutDashboard,
  ReceiptText,
  Rocket,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Mascot, Button, Card, Page, PageHeader } from '@/ui';
import { useI18n, type TranslationKey } from '../i18n/I18nProvider';
import { useTour } from '../tour/TourProvider';

/** Guide sections and how many steps each has (texts live under help.guides.<id>.stepN). */
const GUIDES: Array<{ id: string; steps: number; icon: ReactNode }> = [
  { id: 'start', steps: 3, icon: <Rocket /> },
  { id: 'customers', steps: 3, icon: <Users /> },
  { id: 'receivables', steps: 3, icon: <ReceiptText /> },
  { id: 'payments', steps: 4, icon: <HandCoins /> },
  { id: 'reminders', steps: 3, icon: <BellRing /> },
  { id: 'dashboard', steps: 3, icon: <LayoutDashboard /> },
];

const FAQ_COUNT = 4;

export function HelpPage() {
  const { t } = useI18n();
  const tour = useTour();
  const key = (path: string) => path as TranslationKey;

  return (
    <Page>
      <PageHeader title={t('help.title')} description={t('help.subtitle')} />

      <section className="relative overflow-hidden rounded-2xl border border-line bg-[linear-gradient(135deg,var(--primary-soft)_0%,var(--surface)_70%)] p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <Mascot size={84} mood="wave" className="-my-2 hidden sm:block" />
            <div>
              <h2 className="text-lg font-semibold">{t('help.tourTitle')}</h2>
              <p className="mt-1 max-w-xl text-sm text-muted">{t('help.tourDescription')}</p>
            </div>
          </div>
          <Button icon={<Compass className="h-4 w-4" />} onClick={tour.start}>
            {t('help.startTour')}
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {GUIDES.map((guide) => (
          <Card
            key={guide.id}
            title={
              <span className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary-ink [&>svg]:h-4 [&>svg]:w-4">
                  {guide.icon}
                </span>
                {t(key(`help.guides.${guide.id}.title`))}
              </span>
            }
          >
            <ol className="space-y-3">
              {Array.from({ length: guide.steps }, (_, index) => (
                <li key={index} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-[11px] font-semibold text-muted tabular-nums">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed text-ink">
                    {t(key(`help.guides.${guide.id}.step${index + 1}`))}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>

      <Card title={t('help.faqTitle')}>
        <div className="divide-y divide-line">
          {Array.from({ length: FAQ_COUNT }, (_, index) => (
            <details key={index} className="group py-3 first:pt-0 last:pb-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
                {t(key(`help.faq.q${index + 1}`))}
                <ChevronDown className="h-4 w-4 shrink-0 text-subtle transition group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {t(key(`help.faq.a${index + 1}`))}
              </p>
            </details>
          ))}
        </div>
      </Card>
    </Page>
  );
}
