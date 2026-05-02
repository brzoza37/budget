# Budget PWA — Claude Context

Household budget PWA. Single user for now; multi-user/OAuth planned. Migrated from a Kotlin Android app.

## Stack

| Layer | Tech |
|---|---|
| Backend | Symfony 7, API Platform 3.2, Doctrine ORM 3, PHP 8.3 |
| Frontend | React 18, Vite, MUI v5, TanStack Query, React Router v6, i18next |
| DB | PostgreSQL 16 |
| Auth | lexik/jwt-authentication-bundle, email+password, JWT in localStorage |
| Infra | Docker Compose (backend, frontend, db, nginx, worker) |

## Docker — ALL commands must use docker compose exec

```bash
# Backend (PHP/Composer/PHPUnit)
docker compose exec backend php bin/console <cmd>
docker compose exec backend composer <cmd>
docker compose exec backend vendor/bin/phpunit

# Frontend (npm)
docker compose exec frontend npm run <cmd>

# DB (psql)
docker compose exec db psql -U user -d budget -c "<sql>"

# Pass env var override (e.g. for test DB schema commands)
docker compose exec -e DATABASE_URL="postgresql://user:password@db:5432/budget_test?serverVersion=16&charset=utf8" backend php bin/console doctrine:schema:create --env=test
```

Never run `php`, `composer`, or `npm` locally — always inside containers.

Before running commands, verify containers are up:
```bash
docker compose ps
```
If stopped, ask user to run `docker compose up -d`.

## Services

| Service | Port | Notes |
|---|---|---|
| nginx | 8000 | Reverse proxy; serves API + frontend |
| backend | — | PHP-FPM, `/var/www/html` |
| frontend | 3000 | Vite dev server, proxies `/api` → nginx |
| db | 5432 | PostgreSQL 16, user/password/budget |
| worker | — | Symfony Scheduler (exchange rate updates) |

## Repository Layout

```
backend/
  src/
    Entity/         # User, Account, Category, Transaction, Budget,
                    # RecurringEvent, PlannedItem, ExchangeRate
    Repository/     # One per entity; custom query methods
    Controller/     # AuthController, StatsController, PlanController
    Doctrine/       # CurrentUserExtension — filters all API Platform queries by user
    EventListener/  # AuthenticationSuccessListener, SetUserListener
    State/          # BudgetStateProvider, RecurringEventDeleteProcessor
    Service/        # RecurringEventGeneratorService
    Command/        # UpdateExchangeRatesCommand, AppSeedDataCommand
  config/packages/  # security.yaml, api_platform.yaml, framework.yaml, …
  migrations/       # Version20260429000001-3 (user table + user_id FKs)
  tests/
    bootstrap.php   # Auto-creates budget_test DB + rebuilds schema on every run
    Controller/     # AuthControllerTest, SecurityTest, StatsControllerTest
    Repository/     # ExchangeRateRepositoryTest
    Command/        # UpdateExchangeRatesCommandTest
frontend/
  src/
    pages/          # 17 pages (Dashboard, Transactions, Accounts, Budget, …)
    components/     # Layout, ProtectedRoute, ConfirmSheet
    context/        # AuthContext (JWT), ThemeContext (6 named themes)
    api/            # apiClient.ts — axios + Bearer interceptor + 401 redirect
    hooks/          # useApi.ts
    types/          # api.ts — all DTO interfaces including AuthUser
    i18n/           # en.json, pl.json
```

## Key Domain Facts

**User**: email, password, displayName, currency (3-letter ISO), locale (en/pl), theme, roles  
**Transaction**: INCOME | EXPENSE | TRANSFER, date, amount, category (nullable), account, note, originalCurrency/originalAmount (for foreign-currency transactions)  
**Account**: name, balance, currency, isArchived  
**Budget**: category, month, year, amount, spent (computed via BudgetStateProvider)  
**RecurringEvent**: generates PlannedItems automatically via worker  
**ExchangeRate**: EUR-pivot model; convert() handles all cross-rate math

## Authentication Flow

- `POST /api/auth/register` → 201 + `{token, user}`
- `POST /api/auth/login` → 200 + `{token, user}`
- `GET /api/auth/me` → current user
- `PATCH /api/auth/me` → update locale / currency / theme
- All `/api` routes except register/login require `ROLE_USER` (JWT Bearer)
- Frontend: token in `localStorage['auth_token']`, sent via axios interceptor

## User Scoping

Every data entity (Account, Category, Transaction, Budget, RecurringEvent, PlannedItem) has a `ManyToOne $user` FK (NOT NULL). Two mechanisms enforce scoping:
- **CurrentUserExtension** — API Platform Doctrine extension, adds `WHERE o.user = :current_user` to every collection/item query
- **SetUserListener** — Doctrine `prePersist` listener, auto-sets `$user` from Security on new entities

## Testing

```bash
docker compose exec backend vendor/bin/phpunit --testdox
```

`tests/bootstrap.php` runs before every suite:
1. `doctrine:database:create --if-not-exists` on `budget_test`
2. `doctrine:schema:drop --force` + `doctrine:schema:create` (rebuilds from entity mappings)

`phpunit.dist.xml` uses `<env force="true">` (not `<server>`) for `APP_ENV=test`, `DATABASE_URL=...budget_test...`, and `KERNEL_CLASS=App\Kernel` — this calls `putenv()` so `getenv()` overrides the OS env that the Docker container sets to `dev`/`budget`.

**Never run schema commands without the `-e DATABASE_URL=...budget_test...` override** — the OS env points to `budget` (dev DB).

## i18n

- Backend: Symfony Translator, `translations/messages.en.yaml` + `messages.pl.yaml`
- Frontend: i18next, `src/i18n/en.json` + `pl.json`
- Locale stored on User entity, sent in auth responses, set in `Accept-Language` header via axios interceptor

## Multi-Currency

- `ExchangeRate` entity stores EUR→X rates (date-keyed)
- `ExchangeRateRepository::convert(amount, from, to, date)` uses EUR as pivot
- Worker runs `UpdateExchangeRatesCommand` daily (frankfurter.app)
- Stats (balance, monthly totals) convert to user's preferred currency
- `missingRates[]` array on stats response lists currencies that couldn't be converted

## Known Gotchas

- **PostgreSQL date queries**: use `DateTimeImmutable` and `>=`/`<` range (not `BETWEEN`) to avoid timezone edge cases
- **Entity field names**: `$user` FK not `$owner`; `$isArchived` not `$archived`; `$displayName` not `$name`
- **Budget entity** uses custom API Platform state providers (`BudgetStateProvider`) — don't replace with standard Doctrine providers
- **RecurringEventGeneratorService**: must call `$item->setUser($event->getUser())` when generating PlannedItems, otherwise SetUserListener won't have a Security context (it runs in worker)
- **CORS**: configured in `nelmio_cors.yaml` for `localhost:*` — extend if deploying

## Current Status (as of 2026-05-02)

- **Phase 1** (make usable): ✅ complete
- **i18n** (en/pl): ✅ complete  
- **Themes** (6 named palettes): ✅ complete  
- **Multi-currency**: ✅ complete  
- **Phase 2 Auth** (JWT, user scoping, 11 tasks): ✅ complete  
- **PHPUnit infrastructure**: ✅ fixed and automated  
- **Deferred**: Google OAuth, 2FA, email confirmation, multi-user invite flow

## Git

Remote: `git@github.com:brzoza37/budget.git`  
Main branch: `master`
