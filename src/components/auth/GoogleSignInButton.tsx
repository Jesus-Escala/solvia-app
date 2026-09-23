import { useEffect, useRef } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuthConfig } from '../../hooks/queries';
import { useTheme } from '@/ui';

/** Minimal typing for Google Identity Services (https://developers.google.com/identity/gsi/web). */
interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: { credential: string }) => void;
      }) => void;
      renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';
let gsiLoader: Promise<GoogleIdentity> | null = null;

function loadGoogleIdentity(): Promise<GoogleIdentity> {
  gsiLoader ??= new Promise((resolve, reject) => {
    if (window.google) return resolve(window.google);
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () =>
      window.google ? resolve(window.google) : reject(new Error('GSI unavailable'));
    script.onerror = () => {
      gsiLoader = null;
      reject(new Error('GSI failed to load'));
    };
    document.head.appendChild(script);
  });
  return gsiLoader;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

/**
 * "Continue with Google". Uses Google's official button (Google Identity Services) when the API
 * exposes a client ID (GOOGLE_CLIENT_ID); otherwise shows a disabled placeholder explaining why.
 */
export function GoogleSignInButton({
  onCredential,
}: {
  onCredential: (credential: string) => void;
}) {
  const { t, locale } = useI18n();
  const { resolved } = useTheme();
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);

  const config = useAuthConfig();
  const clientId = config.data?.googleClientId;

  useEffect(() => {
    if (!clientId || !container.current) return;
    let cancelled = false;
    void loadGoogleIdentity()
      .then((google) => {
        if (cancelled || !container.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => callback.current(response.credential),
        });
        container.current.innerHTML = '';
        google.accounts.id.renderButton(container.current, {
          theme: resolved === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'center',
          width: Math.min(400, container.current.offsetWidth || 320),
          locale,
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [clientId, resolved, locale]);

  if (clientId) {
    return <div ref={container} className="flex min-h-11 w-full justify-center" />;
  }

  return (
    <div>
      <button
        type="button"
        disabled
        title={t('auth.googleUnavailable')}
        className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-3 rounded-full border border-line bg-surface text-sm font-medium text-muted opacity-75"
      >
        <GoogleMark />
        {t('auth.google')}
      </button>
      {!config.isLoading && (
        <p className="mt-1.5 text-center text-[11px] text-subtle">{t('auth.googleUnavailable')}</p>
      )}
    </div>
  );
}
