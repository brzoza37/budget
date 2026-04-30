# CSV Export — Design Spec

**Date:** 2026-04-30
**Scope:** Export transactions to CSV from the Transactions page, filtered by current active filters.

---

## Goal

Let users download their transaction history as a CSV file that opens in Excel, Google Sheets, or LibreOffice. Export respects whatever filters are active on the Transactions page (date range, type, category, account).

## What Is Exported

- **Data:** Transactions only (not planned items, budgets, or accounts).
- **Columns:** `Date, Type, Amount, Currency, Category, Account, Note`
- **Filename:** `transactions-YYYY-MM-DD.csv` (today's date)
- **Format:** CSV, UTF-8 with BOM (ensures correct encoding in Excel)

## Architecture Decision

CSV is generated **in the frontend** from the existing JSON API response. No new backend endpoint. This keeps the backend pure REST JSON — swapping the backend later requires no CSV-specific reimplementation, only the same API shape.

## Backend

No new endpoints or controllers required.

**One possible change:** Verify that `Transaction`'s `#[ApiResource]` allows `itemsPerPage` up to 1000. API Platform's default max is often 30 or 100. If capped below 1000, raise the `paginationMaximumItemsPerPage` on the `#[ApiResource]` attribute.

## Frontend

### New file: `src/utils/exportToCsv.ts`

Pure utility function — no side effects beyond triggering the browser download.

```
exportToCsv(transactions: Transaction[]): void
```

- Builds a header row: `Date,Type,Amount,Currency,Category,Account,Note`
- Builds one row per transaction
- Prepends UTF-8 BOM (`﻿`) so Excel opens it correctly
- Creates a `Blob` with `text/csv` MIME type
- Creates a temporary `<a>` element, clicks it, revokes the URL

### Modified: `src/pages/Transactions.tsx`

- Add **Export CSV** button in the page header, alongside existing controls.
- On click:
  1. Set button to loading state (disabled + spinner).
  2. Fetch all transactions matching current filters with `itemsPerPage=1000`.
  3. If result is empty → show snackbar "No transactions to export", restore button.
  4. If fetch fails → show error alert, restore button.
  5. Otherwise → call `exportToCsv(transactions)`, restore button.

## Error Handling

| Scenario | Behaviour |
|---|---|
| 0 results | Snackbar: "No transactions to export" |
| Network / API error | Error alert below page header |
| Double-click | Button disabled while loading — second click ignored |

## Out of Scope

- XLSX format (no PhpSpreadsheet dependency needed)
- Exporting planned items, budgets, accounts
- A dedicated export page or Settings export button
- Pagination across multiple API pages (1000 items per request is sufficient for household use)
