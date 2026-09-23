# solvia-app

Solvia web app for businesses: dashboard, customers, receivables, payments with proof, WhatsApp
reminders, PDF statements, settings and team users. Stack: React 19, TypeScript, Vite 7,
Tailwind v4, React Router 7, TanStack Query 5 and Recharts. Installable as an app (PWA).

It depends only on the **solvia-backend** API (`/api`, tenant realm). Related repositories:
`solvia-landing` (its "Solicitar acceso" form is linked from the sign-in page via
`VITE_LANDING_URL` + `#solicitar-acceso`) and `solvia-admin` (creates the businesses and users
that sign in here). See `../CLAUDE.md` if the workspace file is present.

## Commands

```bash
npm run dev          # http://localhost:5173 (proxies /api and /files to VITE_PROXY_TARGET, default :4000)
npm run lint         # ESLint              npm run format  # Prettier
npm run typecheck    # tsc -b --noEmit     npm run build   # tsc + vite build (+ service worker)
npm run preview      # serve the build     npm run icons   # regenerate PWA icons from public/favicon.svg
```

The API must be running (`solvia-backend`: `npm run db:local` + `npm run dev`). CI runs
`npm ci`, lint, format:check, build. Demo login: `admin@bodegasanmartin.pe` / `Password123!`.

## Structure

- `src/ui/` — **this app's copy of the Solvia UI kit**, imported as `@/ui` (never deep paths):
  components (Button, DataTable, Modal, Popover/menus, toasts + `confirm`, Form controls,
  PhoneInput, PasswordChecklist, TeamUsers, TemporaryPasswordDialog, KpiCard, Page…), brand
  (Logo, Soli `Mascot`), theme, i18n core, charts, API client factory, PWA install, `styles.css`
  (design tokens + motion). The same kit is copied in solvia-admin (and a subset in
  solvia-landing): when you fix a kit file, apply the same change there.
- `src/pages/` — routes (Customers, CustomerDetail, Receivables, Settings + UsersTab, Help,
  AuthPages with login/register/change-password) and `src/pages/dashboard/`: the dashboard is
  split into four views (`?view=summary|collection|portfolio|projection`), each with one purpose.
  Collection uses `GET /dashboard/analytics` with the period picker (`?from=&to=&g=`,
  `src/components/dashboard/period.ts` + `PeriodPicker.tsx`); the other views use
  `/dashboard/summary` and `/dashboard/cash-flow`. Shared helpers in `metrics.ts` (colors,
  change vs previous period, compact money for tiles).
- `src/components/` — `layout/` (AppShell, Sidebar, Topbar, BottomNav, AssistantMenu, PwaManager),
  `domain/` (forms/modals and columns for customers, receivables, payments), `charts/`, `auth/`.
- `src/hooks/queries.ts` — every API call as a TanStack Query hook (query keys + invalidation).
- `src/lib/api.ts` (client, session in `solvia.*` localStorage), `src/lib/types.ts` (**must mirror
  the backend responses**), `src/lib/config.ts` (URLs from env).
- `src/auth/` — AuthContext (login, Google, change password), RequireAuth (forces
  `/change-password` while `mustChangePassword`).
- `src/tour/` — guided tour steps (`data-tour` attributes mark targets).

## Rules

- UI text only through i18n: add keys to `src/i18n/messages/es.ts` (source of truth) and the same
  shape in `en.ts` (TypeScript enforces it). Kit strings live in `src/ui/i18n/messages.ts`.
- Styling with the semantic tokens (`bg-surface`, `text-muted`, `border-line`, `bg-primary`,
  status colors…) so light/dark themes work; no hardcoded hex colors in pages.
- Tables: `<Page fill>` + `<DataTable>` (content-sized, scrolls inside, never the page). Dialogs:
  `<Modal>`; confirmations: `useFeedback().confirm`; notifications: `useFeedback().toast`.
- New backend endpoint or field → update `src/lib/types.ts` + a hook in `src/hooks/queries.ts`;
  new backend error code → add its text under `errors.codes` in `src/ui/i18n/messages.ts`.
- Phones are stored as E.164 (`PhoneInput`, Peru default); money formatted with `fmt.money`.
- Before committing: `npm run lint && npm run build`, and check the change in the browser
  (light/dark, Spanish/English, phone width).
