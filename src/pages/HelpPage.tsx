import {
  BellRing,
  Compass,
  HandCoins,
  LayoutDashboard,
  MessageCircleQuestion,
  Plus,
  ReceiptText,
  Rocket,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Mascot, Button, cx, Page, PageHeader, Reveal } from '@/ui';
import { useI18n, type TranslationKey } from '../i18n/I18nProvider';
import { useTour } from '../tour/TourProvider';

/** Guide sections, how many steps each has (texts under help.guides.<id>.stepN) and a colour. */
const GUIDES: Array<{ id: string; steps: number; icon: ReactNode; tone: string }> = [
  { id: 'start', steps: 3, icon: <Rocket />, tone: 'from-emerald-400 to-teal-600' },
  { id: 'customers', steps: 3, icon: <Users />, tone: 'from-sky-400 to-indigo-500' },
  { id: 'receivables', steps: 3, icon: <ReceiptText />, tone: 'from-amber-300 to-orange-500' },
  { id: 'payments', steps: 4, icon: <HandCoins />, tone: 'from-teal-400 to-cyan-600' },
  { id: 'reminders', steps: 3, icon: <BellRing />, tone: 'from-fuchsia-400 to-purple-600' },
  { id: 'dashboard', steps: 3, icon: <LayoutDashboard />, tone: 'from-rose-400 to-pink-600' },
];

const FAQ_COUNT = 8;

/** Case- and accent-insensitive text used by the search box. */
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function HelpPage() {
  const { t } = useI18n();
  const tour = useTour();
  const key = (path: string) => path as TranslationKey;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<number | null>(0);

  const needle = normalize(query.trim());
  const matches = (...texts: string[]) => !needle || normalize(texts.join(' ')).includes(needle);

  const guides = GUIDES.map((guide) => ({
    ...guide,
    title: t(key(`help.guides.${guide.id}.title`)),
    steps: Array.from({ length: guide.steps }, (_, index) =>
      t(key(`help.guides.${guide.id}.step${index + 1}`)),
    ),
  })).filter((guide) => matches(guide.title, ...guide.steps));

  const faqs = Array.from({ length: FAQ_COUNT }, (_, index) => ({
    index,
    question: t(key(`help.faq.q${index + 1}`)),
    answer: t(key(`help.faq.a${index + 1}`)),
  })).filter((faq) => matches(faq.question, faq.answer));

  return (
    <Page>
      <PageHeader title={t('help.title')} description={t('help.subtitle')} />

      {/* Hero: Soli greets, the tour starts from here and the search filters everything below */}
      <section className="relative isolate overflow-hidden rounded-3xl border border-line bg-[linear-gradient(135deg,var(--primary-soft)_0%,var(--surface)_65%)] p-6 shadow-card sm:p-8">
        <div
          aria-hidden="true"
          className="help-blob absolute -top-16 -right-10 -z-10 h-56 w-56 rounded-full bg-primary/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="help-blob absolute -bottom-20 left-1/3 -z-10 h-48 w-48 rounded-full bg-amber-300/25 blur-3xl [animation-delay:-6s]"
        />
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="relative mx-auto shrink-0 pt-7 md:mx-0">
            <div className="help-float">
              <Mascot size={112} mood="wave" />
            </div>
            <span className="help-pop absolute top-0 left-2 hidden rounded-2xl rounded-bl-sm border border-line bg-surface px-3 py-1.5 text-xs font-semibold whitespace-nowrap shadow-pop sm:block">
              {t('help.hello')}
            </span>
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary-ink uppercase">
                <Sparkles className="h-3.5 w-3.5" />
                {t('help.tourTitle')}
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-balance">
                {t('help.helloHint')}
              </h2>
              <p className="mt-1 max-w-xl text-sm text-muted">{t('help.tourDescription')}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                icon={<Compass className="h-4 w-4" />}
                onClick={tour.start}
                className="help-shine"
              >
                {t('help.startTour')}
              </Button>
              <label className="relative flex-1 sm:max-w-sm">
                <span className="sr-only">{t('help.searchPlaceholder')}</span>
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('help.searchPlaceholder')}
                  className="input w-full rounded-full pl-9"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      {guides.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold">{t('help.guidesTitle')}</h2>
            <p className="text-sm text-muted">{t('help.guidesSubtitle')}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {guides.map((guide, position) => (
              <Reveal key={guide.id} delay={position * 70}>
                <article className="group h-full rounded-2xl border border-line bg-surface p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-pop">
                  <header className="mb-4 flex items-center gap-3">
                    <span
                      className={cx(
                        'flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-sm transition duration-300 group-hover:scale-110 group-hover:-rotate-6 [&>svg]:h-5 [&>svg]:w-5',
                        guide.tone,
                      )}
                    >
                      {guide.icon}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold">{guide.title}</h3>
                      <p className="text-xs text-muted">
                        {t('help.stepsCount', { count: guide.steps.length })}
                      </p>
                    </div>
                  </header>
                  {/* Steps on a timeline */}
                  <ol className="relative space-y-3 before:absolute before:top-3 before:bottom-3 before:left-3 before:w-px before:bg-line">
                    {guide.steps.map((step, index) => (
                      <li key={index} className="relative flex gap-3 text-sm">
                        <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-[11px] font-semibold text-muted tabular-nums transition group-hover:border-primary/50 group-hover:bg-primary-soft group-hover:text-primary-ink">
                          {index + 1}
                        </span>
                        <span className="pt-0.5 leading-relaxed text-ink">{step}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <Reveal as="section" className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary-ink">
              <MessageCircleQuestion className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold">{t('help.faqTitle')}</h2>
              <p className="text-sm text-muted">{t('help.faqSubtitle')}</p>
            </div>
          </div>
          <ul className="space-y-2">
            {faqs.map((faq) => {
              const expanded = open === faq.index;
              const panel = `faq-panel-${faq.index}`;
              return (
                <li
                  key={faq.index}
                  className={cx(
                    'overflow-hidden rounded-2xl border bg-surface transition duration-300',
                    expanded
                      ? 'border-primary/40 shadow-pop ring-1 ring-primary/15'
                      : 'border-line shadow-card hover:border-line-strong',
                  )}
                >
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panel}
                    onClick={() => setOpen(expanded ? null : faq.index)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold"
                  >
                    <span
                      className={cx(
                        'h-8 w-1 shrink-0 rounded-full transition-colors duration-300',
                        expanded ? 'bg-primary' : 'bg-line',
                      )}
                    />
                    <span className="flex-1">{faq.question}</span>
                    <span
                      className={cx(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition duration-300',
                        expanded
                          ? 'rotate-45 bg-primary text-on-primary'
                          : 'bg-surface-2 text-muted',
                      )}
                    >
                      <Plus className="h-4 w-4" />
                    </span>
                  </button>
                  {/* Height animates from 0 to auto through the grid-rows trick */}
                  <div
                    id={panel}
                    role="region"
                    className={cx(
                      'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
                      expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-4 pb-4 pl-8 text-sm leading-relaxed text-muted">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Reveal>
      )}

      {guides.length === 0 && faqs.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line py-10 text-center">
          <Mascot size={80} mood="peek" />
          <p className="text-sm text-muted">{t('help.noResults', { query: query.trim() })}</p>
          <Button
            variant="secondary"
            size="sm"
            icon={<X className="h-4 w-4" />}
            onClick={() => setQuery('')}
          >
            {t('help.clearSearch')}
          </Button>
        </div>
      )}

      <Reveal>
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface-2 p-5 text-center sm:flex-row sm:text-left">
          <div className="help-float">
            <Mascot size={64} mood="happy" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold">{t('help.stuckTitle')}</h2>
            <p className="text-sm text-muted">{t('help.stuckDescription')}</p>
          </div>
          <Button variant="secondary" icon={<Compass className="h-4 w-4" />} onClick={tour.start}>
            {t('help.startTour')}
          </Button>
        </section>
      </Reveal>
    </Page>
  );
}
