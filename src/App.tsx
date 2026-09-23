import { Compass } from 'lucide-react';
import { Link, Route, Routes } from 'react-router';
import { PublicOnly, RequireAuth } from './auth/RequireAuth';
import { AppShell } from './components/layout/AppShell';
import { Page } from '@/ui';
import { useI18n } from './i18n/I18nProvider';
import { ChangePasswordPage, LoginPage, RegisterPage } from './pages/AuthPages';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { HelpPage } from './pages/HelpPage';
import { ReceivablesPage } from './pages/ReceivablesPage';
import { SettingsPage } from './pages/SettingsPage';

function NotFoundPage() {
  const { t } = useI18n();
  return (
    <Page>
      <div className="flex flex-col items-center py-24 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-ink">
          <Compass className="h-7 w-7" />
        </span>
        <p className="text-sm font-semibold text-primary-ink">404</p>
        <h1 className="mt-1 text-2xl font-semibold">{t('notFound.title')}</h1>
        <Link to="/" className="mt-6 text-sm font-medium text-primary-ink hover:underline">
          {t('notFound.back')}
        </Link>
      </div>
    </Page>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route path="change-password" element={<ChangePasswordPage />} />
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="receivables" element={<ReceivablesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
