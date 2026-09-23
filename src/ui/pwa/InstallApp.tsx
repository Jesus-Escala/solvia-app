import { Check, Download, Maximize2, MonitorSmartphone, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { LogoMark } from '../brand/Logo';
import { Button } from '../components/Button';
import { cx } from '../components/cx';
import { Modal } from '../components/Modal';
import { useUiI18n } from '../i18n/context';
import { pwaInstall, usePwaInstall, type PwaPlatform } from './pwaInstall';

type StepKey = `pwa.${'ios' | 'android' | 'safariMac' | 'desktop' | 'other'}Step${1 | 2 | 3}`;

const STEP_PREFIX: Record<PwaPlatform, string> = {
  ios: 'ios',
  android: 'android',
  'safari-mac': 'safariMac',
  desktop: 'desktop',
  other: 'other',
};

function Benefit({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-muted">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-ink [&>svg]:h-3.5 [&>svg]:w-3.5">
        {icon}
      </span>
      {children}
    </li>
  );
}

/**
 * Install guide dialog. Uses the browser's native prompt when available (Chrome, Edge, Android)
 * and otherwise explains the manual steps for the detected platform (Safari on iOS/macOS...).
 * Mount it once per app; open it with `pwaInstall.openGuide()` or <InstallAppChip>.
 */
export function PwaInstallGuide({ appName }: { appName: string }) {
  const { t } = useUiI18n();
  const { guideOpen, canPrompt, platform } = usePwaInstall();
  const prefix = STEP_PREFIX[platform];

  return (
    <Modal
      open={guideOpen}
      size="sm"
      title={t('pwa.title', { app: appName })}
      description={t('pwa.subtitle')}
      onClose={pwaInstall.closeGuide}
      closeLabel={t('pwa.close')}
      footer={
        <>
          <Button
            variant="secondary"
            icon={<Check className="h-4 w-4" />}
            onClick={pwaInstall.markInstalled}
          >
            {t('pwa.alreadyInstalled')}
          </Button>
          {canPrompt && (
            <Button
              icon={<Download className="h-4 w-4" />}
              onClick={() => void pwaInstall.prompt()}
            >
              {t('pwa.installNow')}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-2xl bg-surface-2 p-4">
          <LogoMark size={52} />
          <ul className="min-w-0 space-y-2">
            <Benefit icon={<Zap />}>{t('pwa.benefitLaunch')}</Benefit>
            <Benefit icon={<Maximize2 />}>{t('pwa.benefitFocus')}</Benefit>
            <Benefit icon={<MonitorSmartphone />}>{t('pwa.benefitFast')}</Benefit>
          </ul>
        </div>
        {!canPrompt && (
          <div>
            <p className="mb-2.5 text-xs font-semibold tracking-wide text-subtle uppercase">
              {t('pwa.stepsTitle')}
            </p>
            <ol className="space-y-2.5">
              {([1, 2, 3] as const).map((step) => (
                <li key={step} className="flex items-start gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-on-primary">
                    {step}
                  </span>
                  <span className="pt-0.5">{t(`pwa.${prefix}Step${step}` as StepKey)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Modal>
  );
}

/**
 * Floating "Install app" chip (bottom-left), shown until the app is installed. Opens the guide.
 * Used on the sign-in pages, like the TSI component library does.
 */
export function InstallAppChip({ className }: { className?: string }) {
  const { t } = useUiI18n();
  const { installed } = usePwaInstall();
  if (installed) return null;
  return (
    <button
      type="button"
      onClick={pwaInstall.openGuide}
      className={cx(
        'animate-page-in fixed bottom-4 left-4 z-30 inline-flex items-center gap-2 rounded-full border border-line bg-surface/90 py-1.5 pr-4 pl-1.5 text-sm font-semibold text-ink shadow-pop backdrop-blur-md transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg sm:bottom-6 sm:left-6',
        className,
      )}
    >
      <LogoMark size={28} />
      {t('pwa.chip')}
      <Download className="h-4 w-4 text-primary" />
    </button>
  );
}

/**
 * "New version available" card (bottom-right). Each app wires it to its service worker
 * registration (vite-plugin-pwa's `useRegisterSW`).
 */
export function PwaUpdatePrompt({
  open,
  onUpdate,
  onDismiss,
}: {
  open: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}) {
  const { t } = useUiI18n();
  if (!open) return null;
  return (
    <div
      role="status"
      data-state="open"
      className="toast fixed right-4 bottom-20 z-[65] flex w-[min(22rem,calc(100%-2rem))] items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-ink shadow-pop lg:bottom-4"
    >
      <LogoMark size={36} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{t('pwa.updateTitle')}</p>
        <p className="mt-0.5 text-xs text-muted">{t('pwa.updateBody')}</p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={onUpdate}>
            {t('pwa.updateAction')}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            {t('pwa.updateLater')}
          </Button>
        </div>
      </div>
    </div>
  );
}
