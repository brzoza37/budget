# Monthly Plan & Envelope Budgeting — Design Spec

**Date:** 2026-04-29  
**Status:** Approved  
**Scope:** Replaces the existing PlannedPayments feature with a unified Monthly Plan that covers both planned income and expenses, recurring events, and an envelope summary on the Dashboard.

---

## Overview

Users need to plan their spending and income per month — registering that rent is due on the 1st, salary arrives on the 30th, and seeing at a glance how much is left to freely allocate. The current `PlannedPayment` entity is a loose "upcoming bills" list with no recurring support, no income planning, and no connection to actual transactions.

This spec replaces that concept with two clean entities (`RecurringEvent` + `PlannedItem`) and adds an envelope summary card to the Dashboard.

---

## Data Model

### `RecurringEvent` (new entity — template/rule)

Stores the recurrence rule. Generates `PlannedItem` instances up to 12 months ahead.

| Field | Type | Notes |
|---|---|---|
| `id` | int | PK, auto |
| `name` | string(255) | e.g. "Rent", "Salary" |
| `amount` | float | default amount per instance |
| `type` | string(10) | `INCOME` or `EXPENSE` |
| `category` | ManyToOne Category | nullable for income events |
| `account` | ManyToOne Account | nullable — preferred account |
| `repeatEvery` | int | e.g. `1`, `2`, `3` |
| `repeatUnit` | string(10) | `days` / `weeks` / `months` / `years` |
| `dayOfMonth` | int(1–31) | nullable — anchor day for monthly/yearly events |
| `startDate` | DateTimeImmutable | date of first occurrence |
| `note` | text | nullable |
| `createdAt` | DateTimeImmutable | |
| `updatedAt` | DateTimeImmutable | |

**Cascade on delete:** removing a `RecurringEvent` deletes all linked `PlannedItem` instances where `isPaid = false`. Paid instances and their transactions are preserved.

### `PlannedItem` (replaces `PlannedPayment`)

One instance in a month's plan — either standalone (one-off) or generated from a `RecurringEvent`.

| Field | Type | Notes |
|---|---|---|
| `id` | int | PK, auto |
| `name` | string(255) | copied from template or user-entered |
| `amount` | float | may differ from template (per-instance edit) |
| `type` | string(10) | `INCOME` or `EXPENSE` |
| `category` | ManyToOne Category | nullable |
| `account` | ManyToOne Account | nullable |
| `dueDate` | DateTimeImmutable | when this instance is due |
| `isPaid` | bool | false = pending; true = confirmed |
| `paidAmount` | float | nullable — actual amount confirmed (supports partial) |
| `paidAt` | DateTimeImmutable | nullable — actual date confirmed |
| `paidTransaction` | ManyToOne Transaction | nullable — auto-created on confirm |
| `recurringEvent` | ManyToOne RecurringEvent | nullable — null = one-off |
| `note` | text | nullable |
| `createdAt` | DateTimeImmutable | |
| `updatedAt` | DateTimeImmutable | |

**Partial payment:** confirming a partial amount sets `isPaid = false` and `paidAmount` to the partial value, and creates a transaction for that amount. A partially paid item shows a distinct visual state. Subsequent confirmations create additional transactions and accumulate toward the full amount; `isPaid` flips to `true` when `paidAmount >= amount`.

### `Transaction` (one new field)

Add `plannedItem` (ManyToOne PlannedItem, nullable) — links a transaction back to the plan item that generated it. No other changes.

### Remove `PlannedPayment`

The old entity is dropped. A migration removes the table (or renames/transforms it — see Backend section).

---

## Backend

### New API Resources

**`RecurringEvent`** — full CRUD  
Serialization groups: `recurring:read`, `recurring:write`  
Normalization includes embedded `category` and `account` (name + color).

Custom operations:
- `POST /api/recurring-events/{id}/generate` — triggers instance generation for this template. Idempotent: skips months where an instance already exists. Generates from today up to 12 months ahead. Called automatically on create; available as a manual trigger.

On `DELETE`: a Doctrine event listener (or custom `Delete` operation with a `StateProcessor`) removes all unpaid `PlannedItem` instances linked to this event before deleting the template.

**`PlannedItem`** — full CRUD  
Filter: `?month=5&year=2025` (custom Doctrine filter or API Platform filter on `dueDate`)  
Serialization groups: `plan:read`, `plan:write`  
Normalization includes embedded `category`, `account`, `recurringEvent` (id + name only), `paidTransaction` (id only).

Custom operation:
- `POST /api/planned-items/{id}/confirm` — mark as paid/received  
  Request body:
  ```json
  { "amount": 400.0, "accountId": 3, "date": "2025-05-01" }
  ```
  Logic:
  1. Create a `Transaction` (type = `PlannedItem.type`, amount, account, category, date, note = item name)
  2. Set `paidTransaction`, `paidAt`, `paidAmount` on the `PlannedItem`
  3. If `paidAmount >= amount`, set `isPaid = true`
  4. Return the updated `PlannedItem` with embedded transaction id

**`PlannedItem` edit scope** — when patching a `PlannedItem` that has a `recurringEvent`, an optional request param `scope` is accepted:
- `scope=this` (default) — detaches the item from its template (`recurringEvent = null`) and updates only this instance
- `scope=future` — updates this instance AND all future unpaid instances of the same template AND the template itself (amount, name, category, account, note)

### Instance Generation Service

`RecurringEventGeneratorService`:
- Accepts a `RecurringEvent` and a target end date (default: today + 12 months)
- Walks the date series using `repeatEvery` + `repeatUnit` + `dayOfMonth` from `startDate`
- For each computed date within range, checks if a `PlannedItem` for that date already exists (by `recurringEvent` FK + `dueDate` match)
- Creates missing instances; skips existing ones (idempotent)
- Called on `RecurringEvent` POST and the `/generate` endpoint

### Bulk Instance Generation Endpoint

`POST /api/planned-items/generate-month` — body: `{ "month": 5, "year": 2025 }`  
Runs `RecurringEventGeneratorService` for **all** active `RecurringEvent` records, scoped to produce instances covering the requested month. Idempotent. Called by the frontend whenever the user navigates to a month not yet loaded. Returns `{ "generated": N }`.

### Stats Endpoint Update

`GET /api/stats/summary` — replace `plannedExpensesUnpaid` with three clearer fields:
- `plannedIncomeThisMonth`: sum of unpaid `PlannedItem` type INCOME with dueDate in current month
- `plannedExpensesThisMonth`: sum of unpaid `PlannedItem` type EXPENSE with dueDate in current month
- `forecastedBalance`: `totalBalance` + `plannedIncomeThisMonth` − `plannedExpensesThisMonth`

The old `plannedExpensesUnpaid` field is removed; `forecastedBalance` now accounts for both planned income and planned expenses rather than expenses alone.

### Migration Strategy

1. Create `recurring_event` table
2. Create `planned_item` table (with FK to `recurring_event`, FK to `transaction`)
3. Migrate existing `planned_payment` rows to `planned_item` (type=EXPENSE, no recurringEvent)
4. Drop `planned_payment` table
5. Add `planned_item_id` nullable FK column to `transaction`

---

## Frontend

### Navigation

- Bottom nav and sidebar: rename "Planned Payments" → **"Plan"** (keep same icon: `EventNote` or `CalendarMonth`)
- Route: `/plan` (was `/planned-payments`). Old routes redirect.

### Monthly Plan Page (`/plan`)

Replaces `PlannedPayments.tsx`.

**Layout:**
- Month navigator at top (← April 2025 →) — same pattern as Reports page
- Two visual sections within the month:
  - **Income** (green accent) — `PlannedItem` type INCOME, sorted by dueDate
  - **Expenses** (default) — `PlannedItem` type EXPENSE, sorted by dueDate
- Each item row: type icon (↑ income / ↓ expense), name, due date, amount, category chip, ↻ icon if recurring, partial-pay indicator if paidAmount > 0

**Item actions:**
- Tap item body → opens edit form
- **Confirm button** (checkmark icon) on each unpaid item → opens Confirm Sheet:
  - Toggle: Full / Partial
  - If Partial: amount field (pre-filled with planned amount minus already paid)
  - Account selector (dropdown, pre-filled from item's account or first account)
  - Date picker (defaults to today)
  - Confirm → calls `/confirm` endpoint
- Delete icon → confirm dialog; for recurring items warns "Only this occurrence" (single delete, leaves template)

**Recurring item edit flow:**
- Tapping a recurring-linked item to edit → bottom sheet appears first:
  - "Edit just this occurrence" → detaches and opens form
  - "Edit this and all future" → opens form, patches with `scope=future`

**FAB (+):** Opens an Add sheet with two tabs:
- **One-off** — name, type toggle (Income/Expense), amount, category, account, due date, note
- **Recurring** — same fields + repeat section:
  - "Repeats every" [N] [days / weeks / months / years]
  - "On day" [1–31] (shown when unit is months or years)
  - "Starting" date picker

**Month loading:** on navigating to a new month, the frontend calls `POST /api/recurring-events/{id}/generate` (or a bulk endpoint) before fetching the month's items. In practice: when the month changes, the frontend calls `POST /api/planned-items/generate-month?month=X&year=Y` (a lightweight endpoint that runs the generator for all active recurring events for that month) then fetches `GET /api/planned-items?month=X&year=Y`.

### Dashboard Envelope Card

New card below the Total Balance card.

```
┌─────────────────────────────────┐
│  May 2025 Plan                  │
│                                 │
│  ↑ Planned in    5 500 PLN      │
│  ↓ Committed    -3 200 PLN      │
│  ────────────────────────────   │
│  ✦ Free to plan  2 300 PLN      │
└─────────────────────────────────┘
```

- "Planned in" = sum of unpaid `PlannedItem` type INCOME this month (from stats endpoint)
- "Committed" = sum of unpaid `PlannedItem` type EXPENSE this month
- "Free to plan" = Planned in − Committed; shown in red if negative
- Tapping the card navigates to `/plan` for the current month

### New/Modified Files

| File | Action |
|---|---|
| `src/pages/MonthlyPlan.tsx` | New — replaces PlannedPayments.tsx |
| `src/pages/AddEditPlannedItem.tsx` | New — replaces AddEditPlannedPayment.tsx |
| `src/components/ConfirmPaymentSheet.tsx` | New — pay/receive bottom sheet |
| `src/components/RecurringEventForm.tsx` | New — recurrence fields sub-form |
| `src/pages/Dashboard.tsx` | Modified — add envelope card |
| `src/hooks/useApi.ts` | Modified — add hooks for RecurringEvent, PlannedItem, confirm action |
| `src/types/api.ts` | Modified — add RecurringEvent, PlannedItem types; update Transaction |
| `src/App.tsx` | Modified — update routes |
| `src/components/Layout.tsx` | Modified — rename nav label |

---

## Scope Boundaries (not in this spec)

- No push notifications for upcoming planned items (Phase 3)
- No CSV export of the plan
- No multi-currency planned items (all amounts in display currency)
- No "savings goal" envelope type — just INCOME / EXPENSE for now
- No carry-forward of unspent envelope balance to next month

---

## Open Questions (resolved)

- **Income timing vs calendar months** → solved by planning income explicitly as `PlannedItem` type INCOME, independent of when transactions land
- **Recurring without end date** → generate 12 months ahead, rolling; delete template removes future unpaid instances
- **Partial payment** → supported; multiple confirmations allowed; `isPaid` flips when paidAmount ≥ amount
- **Edit scope** → "this only" (detach) or "this and all future" (update template + future unpaid)
