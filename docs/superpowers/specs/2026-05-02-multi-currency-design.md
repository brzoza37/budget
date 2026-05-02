# Multi-Currency Exchange Rates — Design Spec
_Date: 2026-05-02_

## Overview

Fix the dashboard total balance to correctly combine accounts in different currencies, and allow transactions to optionally record the original foreign currency amount when the user pays abroad with their domestic account.

**Two distinct problems solved:**

1. **Dashboard accuracy** — `AccountRepository` currently sums all account balances without conversion. A user with a PLN account and a EUR savings account gets a meaningless total.
2. **Transaction foreign currency** — when a user pays abroad with their PLN card, the bank charges its own rate. The user wants to record €50 as the conceptual amount while the PLN debit stays as the authoritative account amount.

---

## Architecture

```
frankfurter.app (free, no API key)
  └── UpdateExchangeRatesCommand (daily @ 02:00 UTC)
        └── ExchangeRate table (8 rows, EUR-based)
              └── ExchangeRateRepository::convert(amount, from, to)
                    ├── AccountRepository::getTotalBalance()  → stats/summary
                    └── TransactionRepository (monthly totals) → stats/summary

Transaction entity
  └── originalCurrency (nullable) + originalAmount (nullable)
        └── AddEditTransaction frontend → payload on save
        └── Transaction list → secondary display text
```

---

## Data Model

### `ExchangeRate` entity (new)

| Field | Type | Notes |
|---|---|---|
| `id` | int | PK, auto-increment |
| `targetCurrency` | string(3) | e.g. `USD`, `PLN`, `GBP` — always relative to EUR base |
| `rate` | float | EUR → targetCurrency (e.g. EUR→PLN = 4.25) |
| `fetchedAt` | datetime | Last updated timestamp |

- Unique constraint on `targetCurrency`
- 8 rows maximum (all supported currencies except EUR itself)
- No `is_manual` flag — manual overrides are out of scope

**Supported currencies:** USD, EUR, GBP, PLN, JPY, CAD, AUD, CHF, CNY

**Cross-rate formula** (EUR as pivot):
- EUR → X: use `rate` directly
- X → EUR: `1 / rate(EUR→X)`
- A → B: `rate(EUR→B) / rate(EUR→A)`

### `Transaction` entity (modified)

Two nullable fields added:

| Field | Type | Notes |
|---|---|---|
| `originalCurrency` | string(3) \| null | e.g. `EUR` |
| `originalAmount` | float \| null | e.g. `50.00` |

- Both must be set together or both null (validated at controller level)
- `amount` remains in the account's native currency — the authoritative value
- Derived bank rate = `amount ÷ originalAmount` (computed on display, not stored)

---

## Backend

### Exchange Rate Fetching

**Command:** `App\Command\UpdateExchangeRatesCommand`
- Calls `GET https://api.frankfurter.app/latest` (EUR base, all currencies)
- Upserts each target currency row: update `rate` + `fetchedAt` if exists, insert if not
- On HTTP or parse failure: logs a warning, exits 0 — previous rates remain valid

**Schedule:** `App\Scheduler\UpdateExchangeRatesSchedule`
- `#[AsSchedule]` attribute, runs daily at 02:00 UTC
- Uses Symfony Scheduler via `messenger:consume scheduler_default`

**Worker service** (`docker-compose.yml`):
```yaml
worker:
  build: ./backend
  command: bin/console messenger:consume scheduler_default --time-limit=3600
  restart: unless-stopped
  depends_on: [db]
  env_file: ./backend/.env
```

### `ExchangeRateRepository`

```php
public function convert(float $amount, string $from, string $to): ?float
```

Returns `null` if either rate is missing (caller handles the missing-rate case). Uses EUR-pivot formula. Returns `$amount` unchanged if `$from === $to`.

### Stats Conversion

**`AccountRepository::getTotalBalance(User $user)`** — refactored:
1. Fetch all non-archived accounts with `(balance, currency)`
2. For each account, call `ExchangeRateRepository::convert(balance, accountCurrency, userCurrency)`
3. Sum converted values; collect currencies where `convert()` returned `null` into `$missingCurrencies`
4. Return `['total' => float, 'missingCurrencies' => string[]]`

**`TransactionRepository`** — `getMonthlyTotal()` applies the same per-row conversion.

**`StatsController` response** gains `missingRates` field:

```json
{
  "totalBalance": 12400.00,
  "monthlyIncome": 3200.00,
  "monthlyExpense": 1850.00,
  "plannedExpensesUnpaid": 450.00,
  "forecastedBalance": 11950.00,
  "missingRates": []
}
```

`missingRates` is `[]` on success, or e.g. `["GBP"]` when a rate row is absent.

### Transaction Validation

In `TransactionController` (or API Platform denormalizer): if `originalCurrency` is set, `originalAmount` must also be set and vice versa. Return HTTP 400 otherwise.

### Migration

Add two nullable columns to `transaction`:
```sql
ALTER TABLE transaction
  ADD COLUMN original_currency VARCHAR(3) NULL,
  ADD COLUMN original_amount DOUBLE PRECISION NULL;
```

---

## Frontend

### `AddEditTransaction`

Below the amount field, a collapsible *"Paid in foreign currency?"* toggle (collapsed by default).

When expanded:
- **Currency picker** — same 9-currency `Select` as Settings
- **Original amount field** — numeric, step 0.01
- **Derived rate hint** (read-only) — shown when both fields are filled: *"Rate: 1 EUR = 4.30 PLN"*

On save: if both fields are filled, include `originalCurrency` and `originalAmount` in the payload. If either is empty, omit both fields entirely (send `undefined`).

On load (edit mode): if transaction has `originalCurrency`, expand the section and populate both fields.

### Transaction List (`Transactions.tsx`)

When `transaction.originalAmount` is set, show as secondary text on the row beneath the PLN amount:

```
215.00 PLN
€50.00
```

### Dashboard

No UI changes. Once the backend converts correctly the numbers become accurate automatically. When `missingRates` is non-empty, show a small `Alert` at the top of the dashboard:

> *Balance may be incomplete — exchange rate unavailable for: GBP*

---

## API Changes

### `GET /api/stats/summary`

Response adds `missingRates: string[]`.

### `POST /api/transactions` / `PATCH /api/transactions/{id}`

Accepts optional `originalCurrency: string` and `originalAmount: number`. Both or neither.

### `GET /api/transactions`

Each transaction item includes `originalCurrency: string|null` and `originalAmount: number|null`.

---

## Testing

**Backend:**
- `UpdateExchangeRatesCommandTest` — mock HTTP client, assert rows upserted correctly
- `ExchangeRateRepositoryTest` — assert cross-rate formula: EUR→PLN, USD→PLN, PLN→PLN (identity)
- `StatsControllerTest` — assert `totalBalance` converts correctly when accounts have mixed currencies; assert `missingRates` when a rate row is absent
- `TransactionControllerTest` — assert 400 when only one of `originalCurrency`/`originalAmount` is provided

**Frontend:**
- TypeScript build (`npm run build`) — no errors
- Manual: add a transaction with foreign currency fields, verify derived rate hint, verify secondary text in list

---

## Out of Scope

- Manual exchange rate overrides (no `is_manual` flag)
- Per-transaction rate storage (rate is always derived)
- Web Push notifications
- Multi-currency transfer handling (transfers stay same-currency for now)
