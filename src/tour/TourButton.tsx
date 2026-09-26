import { Compass } from 'lucide-react';
import { useLocation } from 'react-router';
import { cx } from '@/ui';
import { useI18n } from '../i18n/I18nProvider';
import { tourForPath } from './steps';
import { useTour } from './TourProvider';

/**
 * "Recorrido": shows, step by step, how the section on screen works (in the top bar of every
 * page and of the point-of-sale screens). Phones: only the compass.
 */
export function TourButton({ className }: { className?: string }) {
  const { t } = useI18n();
  const tour = useTour();
  const { pathname } = useLocation();
  const section = tourForPath(pathname);
  const name = t(`tour.names.${section}`);
  return (
    <button
      type="button"
      data-tour="section-tour"
      onClick={() => tour.start(section)}
      title={t('tour.sectionButtonTitle', { name })}
      aria-label={t('tour.sectionButtonTitle', { name })}
      className={cx(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-sm font-medium text-ink transition hover:border-primary/40 hover:bg-primary-soft/40',
        className,
      )}
    >
      <Compass className="h-4 w-4 text-primary" />
      <span className="max-sm:hidden">{t('tour.sectionButton')}</span>
    </button>
  );
}
