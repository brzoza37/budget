# Budget PWA — Full Design Spec
_Date: 2026-04-28_

## Overview

Transform the existing skeleton Budget PWA (Symfony 7 + React 18) into a fully usable household finance app, installable on mobile as a PWA and fully navigable on desktop. The app supports multiple users (family/household), username+password and Google OAuth authentication, multi-currency accounts with automatic daily exchange rate updates, and extensible reporting.

---

## Architecture

```
Browser (PWA)
  └── React 18 + TypeScript + MUI v5
        ├── AuthContext (JWT in localStorage)
        ├── Axios client with auth interceptor (→ /login on 401)
        ├── TanStack Query (server state cache + invalidation)
        └── React Router v6 (protected routes)

Nginx (reverse proxy)
  ├── /api/* → PHP-FPM (Symfony 7)
  └── /* → React SPA static files + PWA assets

Symfony 7 + API Platform 3
  ├── User entity + lexik/jwt-authentication-bundle
  ├── Google OAuth via knpuniversity/oauth2-client-bundle
  ├── Data entities (Account, Category, Transaction, Budget, PlannedPayment)
  │     all scoped to User FK with API Platform security attributes
  ├── Custom stats controllers (summary, budget spent)
  ├── Exchange rate auto-update via Symfony Scheduler
  └── CSV export endpoint

Symfony Worker (separate Docker service)
  └── bin/console messenger:consume scheduler_default
        └── Daily exchange rate fetch (frankfurter.app, no API key)

PostgreSQL 16
  └── All tables with user_id FK
```

**Auth token storage:** JWT in `localStorage`. Acceptable for household use; can be migrated to httpOnly cookie later.

---

## Implementation Phases

### Phase 1 — Make Existing App Usable (no auth)

Get a working, correctly rendering, navigable app for a single (unauthenticated) user.

### Phase 2 — Multi-user & Auth

Add User entity, JWT auth, Google OAuth, scoped data, protected routes.

### Phase 3 — Extended Features

Multi-currency with auto-refreshing exchange rates, CSV export, Web Push notifications, configurable reports.

---

## Backend Design

### Serialization Groups (Phase 1)

Fix broken transaction/budget display where related entities render as raw IRIs.

**Changes:**
- `Transaction::$account` and `Transaction::$category` and `Transaction::$toAccount`: add group `transaction:read` to embed `id`, `name`, `color`, `icon` inline.
- `Budget::$category`: add group `budget:read` to embed `id`, `name`, `color`, `icon`.
- `PlannedPayment::$account` and `PlannedPayment::$category`: add group `planned_payment:read` to embed `id`, `name`.
- Enable `enable_max_depth: true` in `api_platform.yaml`.
- Add `#[MaxDepth(1)]` on relation fields to prevent circular serialization.

### Stats Summary Endpoint (Phase 1)

`GET /api/stats/summary?year=2026&month=4`

Plain Symfony controller (not API Platform). Returns:

```json
{
  "totalBalance": 12400.00,
  "monthlyIncome": 3200.00,
  "monthlyExpense": 1850.00,
  "plannedExpensesUnpaid": 450.00,
  "forecastedBalance": 11950.00
}
```

Computed via repository queries:
- `totalBalance`: SUM of non-archived account balances
- `monthlyIncome`: SUM of INCOME transactions in given month/year
- `monthlyExpense`: SUM of EXPENSE transactions in given month/year
- `plannedExpensesUnpaid`: SUM of unpaid PlannedPayments of type EXPENSE

### Budget Spent Field (Phase 1)

Extend `Budget` API response with a computed `spent` field: SUM of EXPENSE transactions for that budget's category in the current calendar month. Implemented via a custom API Platform State Provider that wraps the default Doctrine provider and appends `spent` after fetching.

### User Entity (Phase 2)

```php
class User implements UserInterface, PasswordAuthenticatedUserInterface {
    int $id;
    string $email;           // unique
    ?string $password;       // nullable (Google-only users have no password)
    ?string $googleId;       // nullable, unique
    string $displayName;
    string $currency = 'USD'; // preferred display currency
    DateTimeImmutable $createdAt;
}
```

All existing entities get `ManyToOne $user` FK. API Platform resources get:
```php
security: "is_granted('ROLE_USER') and object.getUser() == user"
```

### Auth Endpoints (Phase 2)

Plain controllers at `/api/auth/*`:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account (email, password, displayName) → JWT |
| POST | `/api/auth/login` | Validate credentials → JWT |
| GET | `/api/auth/google` | Redirect to Google consent screen |
| GET | `/api/auth/google/callback` | Exchange code → upsert User → JWT |
| GET | `/api/auth/me` | Return current User profile |

JWT expiry: 1 hour access token. No refresh token in Phase 2 (add later).

### Migration Strategy (Phase 2)

Three sequential migrations:
1. Create `user` table, add `user_id NULLABLE` to all data tables
2. Insert a seed user, assign all existing rows to seed user
3. Make `user_id NOT NULL` on all data tables

### Exchange Rates (Phase 3)

**`ExchangeRate` entity:**
```
id              BIGINT PK
base_currency   VARCHAR(3) NOT NULL
target_currency VARCHAR(3) NOT NULL
rate            DECIMAL(20,8) NOT NULL
is_manual       BOOLEAN DEFAULT false  -- user-set rates take priority
updated_at      TIMESTAMP NOT NULL
UNIQUE(base_currency, target_currency)
```

**Auto-update via Symfony Scheduler:**
- Install `symfony/scheduler`
- `UpdateExchangeRatesCommand` fetches from `https://api.frankfurter.app/latest?from=EUR` (ECB data, free, no API key)
- `ExchangeRateSchedule` registers a `RecurringMessage` firing daily at 02:00 UTC
- Docker Compose adds a `worker` service running `bin/console messenger:consume scheduler_default`
- `is_manual = false` rates are overwritten on each fetch; `is_manual = true` rates are never overwritten

**Stats integration:** The summary endpoint converts all account balances to `User::$currency` using stored rates before summing `totalBalance` and `forecastedBalance`. If a rate for a given currency pair is not found in the database, the balance is included unconverted (rate = 1.0) and the API response includes a `missingRates: ["GBP→USD"]` warning array so the frontend can show a "Some rates unavailable" notice.

### CSV Export (Phase 3)

`GET /api/export/transactions.csv` — streams a CSV of all user's transactions with headers: date, type, amount, currency, account, category, note.

---

## Frontend Design

### Layout Component (Phase 1)

**Current problem:** Desktop has zero navigation. Mobile bottom nav is the only navigation.

**Fix:**
- `Layout` renders a permanent left drawer (240px) on `md+` screens with the same 4 nav items.
- On `xs`/`sm`, existing bottom nav remains.
- Add `navigationIcon?: React.ReactNode` prop to `LayoutProps` — rendered left of the title in the AppBar (used by form pages for back button).
- Desktop main content area: `ml: '240px'` offset when sidebar visible.

### Auth Pages + Context (Phase 2)

**New files:**
- `src/context/AuthContext.tsx` — provides `user`, `token`, `login()`, `logout()`, `isAuthenticated`
- `src/components/ProtectedRoute.tsx` — wraps routes, redirects to `/login` if no token
- `src/api/apiClient.ts` — add request interceptor attaching `Authorization` header; add response interceptor redirecting on 401
- `src/pages/Login.tsx` — email/password form + "Continue with Google" button
- `src/pages/Register.tsx` — displayName + email + password form

### Dashboard (Phase 1)

- Replace client-side stats calculation with `useQuery` calling `/api/stats/summary`
- Fix layout: sections (Accounts chips, Recent Transactions) become separate stacked `Box` blocks, not children of the same `Stack`
- Monthly income/expense summary cards show real values

### Transactions (Phase 1)

- Filter: `FilterIcon` button opens `Drawer` (mobile) / `Popover` (desktop) with type toggle + date range + account select
- Grouping: transactions grouped by date with sticky `Typography` date headers
- Delete: swipe-to-delete on mobile via `framer-motion`; delete `IconButton` visible on desktop hover
- Missing `useDeleteTransaction` hook added to `useApi.ts`

### Budget (Phase 1)

- `BudgetItem` uses `budget.spent` from API response (no longer defaults to 0)
- Delete via swipe/icon (add `useDeleteBudget` — already exists in `useApi.ts`)

### Planned Payments (Phase 1)

- Add "mark as paid" `IconButton` directly on the list item (single tap, no need to open edit form)
- Add `useTogglePlannedPaymentPaid` mutation in `useApi.ts` (PATCH `isPaid`)
- Delete via swipe/icon

### Reports Page (Phase 1)

Two sections using `recharts`:

**Spending by Category:**
- Donut (`PieChart`) showing EXPENSE transactions for selected month grouped by category
- Month navigation (prev/next `IconButton` arrows)
- Legend below chart

**Income vs Expense Trend:**
- `BarChart` (grouped bars) for last 6 months
- Income bar (green) vs Expense bar (red) per month
- Data from `/api/stats/monthly-trend?months=6`

New endpoint `GET /api/stats/monthly-trend?months=6` returns array of `{month: "2026-03", income: 3200.00, expense: 1850.00}`, ordered oldest to newest. Computed via repository query grouping INCOME/EXPENSE transactions by calendar month.

**Future extensibility:** Both sections accept a `config` prop. A disabled "Configure" button is shown in the header for Phase 3 hookup.

### Settings (Phase 1 + Phase 3)

**Phase 1:**
- Dark mode toggle: state in `localStorage` (`theme-mode`), applied via `ThemeProvider` wrapping `App`
- Currency picker: `Select` of common currencies stored in `localStorage` for Phase 1, migrated to User entity in Phase 2

**Phase 3:**
- Currency picker → API call to `PATCH /api/auth/me` updating `User::$currency`
- Export Data button → `GET /api/export/transactions.csv` → `window.location` download
- Notifications toggle → `Notification.requestPermission()` + Web Push subscription registration

### Currency Display (Phase 1)

Replace all hardcoded `$` with:
```typescript
// src/utils/formatAmount.ts
export function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
```

Applied to every amount rendered in Dashboard, Transactions, Accounts, Budget, PlannedPayments, Reports.

---

## Data Model Summary

### New Tables

| Table | Key Fields |
|-------|-----------|
| `user` | id, email, password?, google_id?, display_name, currency, created_at |
| `exchange_rate` | id, base_currency, target_currency, rate, is_manual, updated_at |

### Modified Tables

| Table | Change |
|-------|--------|
| `account` | + user_id FK |
| `category` | + user_id FK |
| `transaction` | + user_id FK |
| `budget` | + user_id FK |
| `planned_payment` | + user_id FK |

---

## PWA Verification (Phase 1)

- `manifest.webmanifest`: name="Budget", short_name="Budget", display="standalone", theme_color matches MUI primary, background_color matches MUI background, icons at 192×192 and 512×512
- `vite.config.ts`: verify `VitePWA` plugin config has `registerType: 'autoUpdate'`, `workbox.navigateFallback: 'index.html'`
- Service worker strategies: `NetworkFirst` for `/api/*`, `CacheFirst` for static assets
- Offline fallback: cached dashboard shown when API unreachable, with banner "You're offline — showing cached data"
- `index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
- CSS: `padding-bottom: env(safe-area-inset-bottom)` on bottom nav

---

## Docker Compose Changes (Phase 3)

Add `worker` service to `docker-compose.yml`:
```yaml
worker:
  build: ./docker/php
  command: php bin/console messenger:consume scheduler_default --time-limit=3600
  restart: unless-stopped
  depends_on:
    - db
  environment:
    - APP_ENV=prod
```

The worker restarts hourly (`--time-limit=3600`) so memory doesn't accumulate. Docker's `restart: unless-stopped` relaunches it automatically.

---

## Key Libraries to Add

### Backend (Composer)
| Package | Purpose |
|---------|---------|
| `lexik/jwt-authentication-bundle` | JWT generation + validation |
| `knpuniversity/oauth2-client-bundle` | OAuth2 client framework |
| `league/oauth2-google` | Google OAuth provider |
| `symfony/scheduler` | Daily exchange rate cron |
| `symfony/http-client` | HTTP calls to frankfurter.app |
| `nelmio/cors-bundle` | Already installed — verify config for auth headers |

### Frontend (npm)
No new packages needed — `recharts`, `framer-motion`, `date-fns` are already in `package.json`.

---

## Out of Scope

- Real-time sync between multiple devices (offline-first with periodic refresh is sufficient)
- Native push notifications (Web Push is Phase 3, not guaranteed cross-platform)
- LLM/AI reporting integration (architecture is designed to accommodate it: clean stats endpoints, pluggable Reports config — implementation deferred)
- Live exchange rates (daily batch via Scheduler is sufficient for personal finance)
- Multi-tenancy isolation beyond user FK scoping (no org/household entity needed yet)
