import { ArrowLeft, Home } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Button, Mascot, Page } from '@/ui';
import { visibleSections } from '../components/layout/navItems';
import { useModules } from '../hooks/useModules';
import { useI18n } from '../i18n/I18nProvider';

/**
 * A link that leads nowhere: Bowl searches with his magnifying glass, and the page offers the
 * way home, back, or straight to the sections the business has.
 */
export function NotFoundPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const modules = useModules();
  const shortcuts = visibleSections(modules)
    .flatMap((section) => section.items)
    .filter((item) => item.to !== '/')
    .slice(0, 6);

  return (
    <Page fill>
      {/* Centred in the screen (it scrolls on very short ones). */}
      <div className="flex min-h-0 flex-1 overflow-y-auto py-2">
        <section className="relative isolate m-auto flex w-full max-w-2xl flex-col items-center overflow-hidden rounded-3xl border border-line bg-[linear-gradient(160deg,var(--primary-soft)_0%,var(--surface)_62%)] px-6 py-10 text-center shadow-card sm:py-14">
          {/* The code, big and soft behind Bowl. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-2 left-1/2 -z-10 -translate-x-1/2 font-display text-[8.5rem] leading-none font-bold tracking-tight text-primary/10 select-none sm:text-[12rem]"
          >
            404
          </span>
          <div
            aria-hidden="true"
            className="help-blob absolute -right-12 -bottom-16 -z-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl"
          />
          <div className="help-float">
            <Mascot size={150} mood="search" />
          </div>
          <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-primary-ink uppercase">
            {t('notFound.eyebrow')}
          </p>
          <h1 className="mt-1 font-display text-3xl leading-tight font-semibold text-balance sm:text-4xl">
            {t('notFound.title')}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            {t('notFound.description')}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button icon={<Home className="h-4 w-4" />} onClick={() => navigate('/')}>
              {t('notFound.back')}
            </Button>
            <Button
              variant="secondary"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate(-1)}
            >
              {t('notFound.goBack')}
            </Button>
          </div>

          {shortcuts.length > 0 && (
            <div className="mt-8 w-full border-t border-line pt-5">
              <p className="text-xs text-muted">{t('notFound.shortcuts')}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {shortcuts.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-3 py-1.5 text-sm font-medium transition hover:border-primary/40 hover:bg-primary-soft/60 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-primary"
                  >
                    {item.icon}
                    {t(item.label)}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </Page>
  );
}
