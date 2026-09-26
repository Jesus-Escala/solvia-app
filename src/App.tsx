import { lazy } from 'react';
import { Outlet, Route, Routes } from 'react-router';
import { TourProvider } from './tour/TourProvider';
import { ModuleRoute } from './components/modules/ModuleRoute';
import { PublicOnly, RequireAuth } from './auth/RequireAuth';
import { AppShell } from './components/layout/AppShell';
import { PageFrame } from './components/layout/PageErrorBoundary';
import { ChangePasswordPage, LoginPage, RegisterPage } from './pages/AuthPages';

// Each screen loads when it is opened, so the app starts fast (sign-in stays in the first load).
const CustomerDetailPage = lazy(() =>
  import('./pages/CustomerDetailPage').then((m) => ({ default: m.CustomerDetailPage })),
);
const CustomersPage = lazy(() =>
  import('./pages/CustomersPage').then((m) => ({ default: m.CustomersPage })),
);
const DashboardPage = lazy(() =>
  import('./pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const HelpPage = lazy(() => import('./pages/HelpPage').then((m) => ({ default: m.HelpPage })));
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const ProductsPage = lazy(() =>
  import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })),
);
const PurchasePosPage = lazy(() =>
  import('./pages/PurchasePosPage').then((m) => ({ default: m.PurchasePosPage })),
);
const PurchasesPage = lazy(() =>
  import('./pages/PurchasesPage').then((m) => ({ default: m.PurchasesPage })),
);
const SalePosPage = lazy(() =>
  import('./pages/SalePosPage').then((m) => ({ default: m.SalePosPage })),
);
const SalesPage = lazy(() => import('./pages/SalesPage').then((m) => ({ default: m.SalesPage })));
const SuppliersPage = lazy(() =>
  import('./pages/SuppliersPage').then((m) => ({ default: m.SuppliersPage })),
);
const LocationsPage = lazy(() =>
  import('./pages/LocationsPage').then((m) => ({ default: m.LocationsPage })),
);
const ReceivablesPage = lazy(() =>
  import('./pages/ReceivablesPage').then((m) => ({ default: m.ReceivablesPage })),
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

export function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route path="change-password" element={<ChangePasswordPage />} />
        <Route
          element={
            <TourProvider>
              <PageFrame>
                <Outlet />
              </PageFrame>
            </TourProvider>
          }
        >
          {/* Points of sale: full screens of their own, outside the app shell. */}
          <Route element={<ModuleRoute need="sales" />}>
            <Route path="sales/new" element={<SalePosPage />} />
          </Route>
          <Route element={<ModuleRoute need="inventory" />}>
            <Route path="purchases/new" element={<PurchasePosPage />} />
          </Route>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            {/* The dashboard shows the views of the modules the business has. */}
            <Route path="dashboard" element={<DashboardPage />} />
            <Route element={<ModuleRoute need="collections" />}>
              <Route path="receivables" element={<ReceivablesPage />} />
            </Route>
            <Route path="reports" element={<ReportsPage />} />
            <Route element={<ModuleRoute need="customers" />}>
              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />
            </Route>
            <Route path="products" element={<ProductsPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
