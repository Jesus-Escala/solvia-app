import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { Button, Mascot, Page, Spinner, smallButtonClass } from '@/ui';
import { useI18n } from '../../i18n/I18nProvider';

/**
 * After a new version is published, the old one may ask for pieces that no longer exist
 * ("Failed to fetch dynamically imported module"): the fix is to load the new version.
 */
function isStaleVersion(error: Error) {
  return /dynamically imported module|Importing a module script failed|Loading chunk/i.test(
    error.message,
  );
}

/**
 * Keeps a failing screen from taking the whole app down: the menu and the rest of Solvia keep
 * working and the screen offers to try again. Give it `key={pathname}` so another page starts
 * clean.
 */
export class PageErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen failed', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <PageError
          staleVersion={isStaleVersion(this.state.error)}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}

function PageError({ staleVersion, onRetry }: { staleVersion: boolean; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <Page>
      <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
        <Mascot size={96} mood={staleVersion ? 'wave' : 'happy'} />
        <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-warning-ink">
          <AlertTriangle className="h-4 w-4" />
          {t(staleVersion ? 'pageError.updateEyebrow' : 'pageError.eyebrow')}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          {t(staleVersion ? 'pageError.updateTitle' : 'pageError.title')}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {t(staleVersion ? 'pageError.updateDescription' : 'pageError.description')}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {staleVersion ? (
            <Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => location.reload()}>
              {t('pageError.update')}
            </Button>
          ) : (
            <Button icon={<RefreshCw className="h-4 w-4" />} onClick={onRetry}>
              {t('pageError.retry')}
            </Button>
          )}
          <Link to="/" className={smallButtonClass('sm')}>
            <Home className="h-4 w-4" />
            {t('pageError.home')}
          </Link>
        </div>
      </div>
    </Page>
  );
}

/** While a screen's code arrives (each screen loads when it is opened). */
function PageLoading() {
  return (
    <div className="flex h-full min-h-60 items-center justify-center" aria-busy="true">
      <Spinner className="h-6 w-6 text-primary" />
    </div>
  );
}

/** A screen: loaded when opened, and a failure stays inside it. */
export function PageFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <PageErrorBoundary key={pathname}>
      <Suspense fallback={<PageLoading />}>{children}</Suspense>
    </PageErrorBoundary>
  );
}
