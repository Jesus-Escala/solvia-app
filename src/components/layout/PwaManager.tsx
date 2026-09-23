import { PwaInstallGuide, PwaUpdatePrompt } from '@/ui';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Install-as-app support: registers the service worker (also in development, see vite.config.ts), offers the
 * update when a new version is deployed, and hosts the install guide dialog.
 */
export function PwaManager({ appName }: { appName: string }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Look for a new deployment every hour while the app stays open.
      if (registration) window.setInterval(() => void registration.update(), 60 * 60 * 1000);
    },
  });

  return (
    <>
      <PwaInstallGuide appName={appName} />
      <PwaUpdatePrompt
        open={needRefresh && import.meta.env.PROD}
        onUpdate={() => void updateServiceWorker(true)}
        onDismiss={() => setNeedRefresh(false)}
      />
    </>
  );
}
