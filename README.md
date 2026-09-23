# Solvia — Web app

The business web app of **Solvia**, a multi-tenant SaaS for credit management and collections for small and medium businesses. Each business (tenant) uses it to track what its customers owe, register payments, send WhatsApp reminders with payment links, share PDF account statements and follow its cash flow.

It is a single-page app built with React 19, TypeScript, Vite 7, TailwindCSS 4, React Router 7, React Query 5 and Recharts 3, plus `libphonenumber-js` and `country-flag-icons` for the phone field. It is installable as a PWA and talks to the Solvia API over same-origin `/api` and `/files` URLs.

---

## Features

- **Sign-in** with email and password, and optional "Sign in with Google" (enabled when the API returns a `googleClientId` from `GET /api/auth/config`).
- **Managed onboarding:**
  - When self sign-up is disabled on the API (`signupEnabled: false`, the default), the sign-in page has no "Crear cuenta" tab and shows "¿Aún no tienes cuenta? Solicita acceso". The link opens the landing page's request form (`${VITE_LANDING_URL}/#solicitar-acceso`), and `/register` redirects to `/login`.
  - Users who received a **temporary password** are sent to `/change-password` and can't open any other page until they set their own password. The same page is in the user menu ("Change password") for a voluntary change.
- **Dashboard:** outstanding and overdue totals, collections this month vs last month, amounts due in the next 7 days, aging buckets, 6-month collection trend, top debtors, risk distribution, overdue alerts and the latest monthly report.
- **Customers:** CRUD, search, risk filter, server-side sorting (name, date, outstanding, risk), and a risk score badge. The customer detail shows receivables, payments and the PDF account statement.
  - The customer form has a **phone field with a country picker**: an SVG flag, the calling code and a searchable list with frequent countries first. Peru (+51) is the default. The number is formatted as you type, validated for the chosen country and stored as E.164. Lists and the customer detail show phones in international format.
- **Receivables:** CRUD, status filters, sorting, and partial or full payments with an optional proof upload (JPEG/PNG/WEBP/PDF). Each receivable has a "remind now" action and a copyable payment link.
- **Projected cash flow:** outstanding amounts by week or month, as a chart with a table view.
- **Settings:** reminder rules, editable message templates (with placeholders and reset to default), the WhatsApp send log, preferences and, for admins only, **Users**.
  - **Users** is team management: add a user (admin or collector) with a generated temporary password, edit, deactivate or reactivate them, and reset their password. The temporary password is shown once, with copy and "send via WhatsApp" buttons. You can't change your own role or deactivate yourself, and the business always keeps at least one active admin.
- **Roles:** `admin` and `collector`. The UI hides admin-only actions, and the API enforces them.
- **Help and onboarding:** help center, guided tour (welcome modal on first sign-in) and the "Soli" assistant menu.
- **Across the app:** Spanish (default) and English, a light, dark or system theme, and a responsive layout (bottom navigation and bottom-sheet modals on phones). Reduced motion is respected.

## Requirements

- **Node.js 22** and npm.
- A running **Solvia API** (by default on `http://localhost:4000`). See [Related projects](#related-projects).

## Quick start

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

The dev server listens on port **5173** (`host: true`, so it is also reachable from your LAN) and proxies `/api` and `/files` to `VITE_PROXY_TARGET`.

With the API's demo data loaded, you can sign in as `admin@bodegasanmartin.pe` (business admin) or `collector@bodegasanmartin.pe` (collector). Both use the password `Password123!`. The sign-in page also has a button that fills in the demo admin.

## Environment variables

Vite inlines `VITE_*` values **at build time**. Change them in `.env` (development) or pass them as Docker build args (production), then rebuild.

| Variable            | Default                 | Read by                            | Description                                                                                       |
| ------------------- | ----------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`      | `/api`                  | `src/ui/lib/http.ts`               | Base URL of the Solvia API. Keep `/api` to go through the dev proxy or nginx                      |
| `VITE_PROXY_TARGET` | `http://localhost:4000` | `vite.config.ts` (dev server only) | Where the dev server proxies `/api` and `/files`                                                  |
| `VITE_CURRENCY`     | `PEN`                   | `src/ui/i18n/I18nProvider.tsx`     | ISO 4217 currency used to format amounts                                                          |
| `VITE_LANDING_URL`  | `http://localhost:5174` | `src/lib/config.ts`                | Public landing page. The "Solicita acceso" link points to `${VITE_LANDING_URL}/#solicitar-acceso` |

The login URL included in the "send via WhatsApp" message for new users is the app's own origin (`window.location.origin + '/login'`), so it needs no variable.

## Scripts

| Script                                    | What it does                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm run dev`                             | Vite dev server with HMR on port 5173 (PWA enabled in development too)                                  |
| `npm run build`                           | Type-check (`tsc -b`) and build to `dist/`                                                              |
| `npm run preview`                         | Serve the production build locally (reuses the dev proxy)                                               |
| `npm run typecheck`                       | `tsc -b --noEmit`, which also checks that `en.ts` has exactly the keys of `es.ts`                       |
| `npm run lint` / `npm run lint:fix`       | ESLint (flat config in `eslint.config.js`)                                                              |
| `npm run format` / `npm run format:check` | Prettier (`.prettierrc`)                                                                                |
| `npm run icons`                           | Regenerate the PWA icons from `public/favicon.svg` (`pwa-assets-generator`, see `pwa-assets.config.ts`) |

## Project structure

```
.
├── index.html               Theme pre-paint script, beforeinstallprompt capture, icon links
├── vite.config.ts           React, Tailwind, PWA (vite-plugin-pwa), @ alias, dev proxy, vendor chunks
├── pwa-assets.config.ts     Icon generation (npm run icons)
├── Dockerfile               Multi-stage build: Node 22 → nginx 1.27
├── nginx.conf.template      SPA fallback + proxy of /api and /files to ${API_UPSTREAM}
├── public/                  favicon.svg and the generated PWA icons
└── src/
    ├── main.tsx             ThemeProvider → I18nProvider → QueryClientProvider → BrowserRouter
    │                        → AuthProvider → FeedbackProvider → App + PwaManager
    ├── App.tsx              Routes: /login, /register (public) · /change-password · AppShell
    │                        (/, /customers, /customers/:id, /receivables, /settings, /help, 404)
    ├── ui/                  This project's copy of the Solvia UI kit, imported as '@/ui' (see below)
    ├── auth/                tokenStorage (localStorage "solvia.*"), AuthContext, RequireAuth / PublicOnly
    ├── lib/                 api.ts (API client), config.ts (landing URL), types.ts (API DTOs)
    ├── hooks/queries.ts     One React Query hook per endpoint, query keys, cache invalidation
    ├── i18n/                I18nProvider and typed useI18n; messages/es.ts (source of truth) and en.ts
    ├── components/
    │   ├── layout/          AppShell, Sidebar, Topbar (user menu), BottomNav, navItems, AssistantMenu, PwaManager
    │   ├── domain/          Badges, customer/receivable/payment form modals, receivable columns and actions
    │   ├── charts/          CashFlowChart, TrendChart, AgingStrip
    │   └── auth/            GoogleSignInButton (Google Identity Services)
    ├── tour/                Guided tour (TourProvider, steps)
    └── pages/               AuthPages (sign-in, sign-up, change password), Dashboard, Customers,
                             CustomerDetail, Receivables, Settings (+ UsersTab), Help
```

### The UI kit (`src/ui`)

`src/ui` holds the Solvia design system for this app: components (`Button`, `DataTable`, `Modal`, `Field`, `PhoneInput`, `KpiCard`, `Page`, `TeamUsers`, `TemporaryPasswordDialog`, …), the brand (logo and Soli the owl), the theme, the i18n core and formatters, charts, the API client, `useUrlState`, the PWA helpers and `styles.css` (design tokens, light and dark themes, motion).

- **Phone field:** `components/PhoneInput.tsx` + `components/phoneCountries.ts`.
  - It uses `libphonenumber-js/min` for calling codes, as-you-type formatting (`AsYouType`), validation (`isValidPhone`) and display (`formatPhone`).
  - Flags come from `country-flag-icons`. They are loaded per country through `import.meta.glob(..., { query: '?no-inline' })`, so each flag is a separate file downloaded only when shown.
  - Country names are localized with `Intl.DisplayNames`, the default country is `PE`, and the value is E.164 (`''` when empty).
- **Popovers inside modals:** `Popover` renders into the nearest open `<dialog>` (the browser's top layer) instead of `document.body`, so menus and the country picker work inside modals. The modal entrance animations use `backwards` fill, so no transform stays applied and fixed-position popovers inside the dialog are positioned against the viewport.

- Import it only as `'@/ui'`. The `@` alias maps to `src/` in `vite.config.ts` (`resolve.alias`) and in `tsconfig.app.json` (`paths`). Don't import deep paths.
- `src/index.css` is `@import 'tailwindcss'; @import './ui/styles.css';`.
- The kit is a **copy**, not a shared package. The backoffice has its own copy (they started out identical), and the landing page has a smaller one. A kit change that should reach the other frontends has to be made in each of them.

## Talking to the Solvia API

The browser only calls **same-origin** URLs: `/api/...` for the API and `/files/...` for payment proofs and statements. Nothing needs CORS.

- **Development:** the Vite dev server proxies `/api` and `/files` to `VITE_PROXY_TARGET` (default `http://localhost:4000`).
- **Docker / production:** nginx proxies `/api/` and `/files/` to `API_UPSTREAM` (default `http://backend:4000`). Set it to the API's origin without a path (for example `https://api.example.com`), because nginx keeps the `/api/...` path.
- **Sessions:** the client in `src/lib/api.ts` (`createApiClient` from `@/ui`) sends the bearer token, refreshes it once on a `401` via `/auth/refresh` and retries the request. The session is stored in `localStorage` under `solvia.*`.
- **Errors:** API errors have a stable `code`. `useErrorText()` translates it with `errors.codes.<CODE>` in `src/ui/i18n/messages.ts`, and falls back to the server's message.

## Docker

The `Dockerfile` builds the app with Node 22 (`npm ci && npm run build`) and serves `dist/` with nginx. The nginx image renders `nginx.conf.template` at startup and substitutes `API_UPSTREAM`.

| Build arg          | Default                 | Used by this app                                  |
| ------------------ | ----------------------- | ------------------------------------------------- |
| `VITE_API_URL`     | `/api`                  | yes                                               |
| `VITE_CURRENCY`    | `PEN`                   | yes                                               |
| `VITE_LANDING_URL` | `http://localhost:8081` | yes ("Solicita acceso" link)                      |
| `VITE_APP_URL`     | `http://localhost:8080` | no (declared for parity with the other frontends) |

| Runtime env    | Default               | Description                               |
| -------------- | --------------------- | ----------------------------------------- |
| `API_UPSTREAM` | `http://backend:4000` | Where nginx proxies `/api/` and `/files/` |

```bash
docker build -t solvia-app --build-arg VITE_LANDING_URL=https://solvia.example.com .
docker run --rm -p 8080:80 -e API_UPSTREAM=http://host.docker.internal:4000 solvia-app
# → http://localhost:8080
```

`.dockerignore` excludes `.env`, so a local `.env` never ends up in the image. Use build args instead.

nginx also serves `sw.js` and `manifest.webmanifest` with `Cache-Control: no-cache` (so new deployments are detected), caches `/assets/` for a year and falls back to `index.html` for client-side routes.

## PWA (installable app)

`vite-plugin-pwa` (in `vite.config.ts`) provides the manifest ("Solvia", `display: standalone`) and a Workbox service worker that precaches the build. The country flags (`assets/*.svg`, about 260 files) are excluded from the precache with `globIgnores` and load on demand. `/api/` and `/files/` are never served from the navigation fallback.

- **Development:** `devOptions.enabled` turns the service worker on in `npm run dev`, so you can test the browser's native install prompt locally. It generates `dev-dist/`, which is gitignored.
- **Updates:** `registerType: 'prompt'`. `PwaManager` checks for a new deployment every hour and shows an update card, and the user decides when to reload.
- **Install:** `index.html` captures `beforeinstallprompt` before React loads. The sign-in page shows an install chip, and the user menu has "Install as an app". When there is no native prompt, a guide shows per-platform steps.
- **Icons:** edit `public/favicon.svg`, run `npm run icons`, and commit the generated PNG/ICO files. If you rename or add icons, update `manifest.icons` in `vite.config.ts` and the `<link>` tags in `index.html`.
- HTTPS is required outside `localhost`.

## i18n and theming

- **Languages:** Spanish (default) and English. App strings live in `src/i18n/messages/es.ts` (the source of truth) and `en.ts`, which is typed from `es.ts`, so a missing key is a compile error. Kit strings and error codes live in `src/ui/i18n/messages.ts` (`uiEs` / `uiEn`). The locale is stored in `localStorage` (`solvia.locale`).
- **Theme:** light, dark or system, stored in `solvia.theme` and applied as `data-theme` on `<html>`. A pre-paint script in `index.html` sets it before React loads, so there is no flash. Colors are CSS variables in `src/ui/styles.css`, exposed to Tailwind through `@theme`. Add new tokens for both themes.
- Never hard-code UI text. Use `t('...')`, and format money and dates with `fmt.*`.

## CI

`.github/workflows/ci.yml` runs on pushes to `main` and on pull requests: Node 22, `npm ci`, `npm run lint`, `npm run format:check` and `npm run build`, which also type-checks with `tsc -b`. Run the same commands locally before pushing.

## Running it with the whole platform

The `solvia-backend` repository has the Docker Compose files for the full system. Clone the four repositories (`solvia-backend`, `solvia-app`, `solvia-admin`, `solvia-landing`) side by side, then run this from `solvia-backend`:

```bash
docker compose -f docker-compose.yml -f docker-compose.full.yml up -d --build
```

That builds this repository's image from `${SOLVIA_REPOS_DIR:-..}/<repo>`, with the same build args and `API_UPSTREAM=http://backend:4000`. To run only the API and database for local development, use `docker compose up -d --build` in `solvia-backend` and `npm run dev` here.

## Related projects

- **`solvia-backend`** (Solvia API): Node.js, Express 5, Prisma and PostgreSQL. It serves `/api` (with Swagger at `/api/docs`) and `/files`, runs the reminder and monthly-report jobs, and owns the self sign-up flag (`SELF_SIGNUP_ENABLED`).
- **`solvia-landing`** (landing page): the public marketing site. Its "Solicitar acceso" form creates the access requests that the Solvia team reviews, and its "Iniciar sesión" buttons open this app's `/login`.
- **`solvia-admin`** (backoffice): the platform admin console for Solvia staff. It creates businesses and their first admin (with a temporary password), manages every business's users and plan, and handles access requests.
