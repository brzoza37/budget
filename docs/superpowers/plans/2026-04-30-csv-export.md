# CSV Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Export CSV button to the Transactions page that downloads all currently-filtered transactions as a UTF-8 CSV file.

**Architecture:** Pure frontend implementation — no new backend endpoints. The `Transaction` entity's API Platform pagination cap is raised to 1000. A `exportToCsv.ts` utility converts a `Transaction[]` to a downloadable CSV blob. The Transactions page gets a download icon button that fetches all matching transactions with `itemsPerPage=1000` and calls the utility.

**Tech Stack:** React 18, TypeScript, MUI v5, Axios (via `apiClient`), API Platform 3 (Symfony)

**Docker commands:** All PHP commands run inside the backend container:
```
docker compose  exec backend <command>
```

---

## File Map

### Backend — modified
- `backend/src/Entity/Transaction.php` — add `paginationMaximumItemsPerPage: 1000` to `#[ApiResource]`

### Frontend — new
- `frontend/src/utils/exportToCsv.ts` — pure function: `Transaction[]` → CSV blob → browser download

### Frontend — modified
- `frontend/src/pages/Transactions.tsx` — add export button, fetch-all logic, loading/empty/error states

---

## Task 1: Raise Transaction Pagination Limit

**Files:**
- Modify: `backend/src/Entity/Transaction.php`

- [ ] **Step 1: Add `paginationMaximumItemsPerPage` to `#[ApiResource]`**

Open `backend/src/Entity/Transaction.php` and update the `#[ApiResource]` attribute to add the `paginationMaximumItemsPerPage` parameter:

```php
#[ApiResource(
    security: "is_granted('ROLE_USER')",
    operations: [
        new \ApiPlatform\Metadata\Get(),
        new \ApiPlatform\Metadata\GetCollection(),
        new \ApiPlatform\Metadata\Post(),
        new \ApiPlatform\Metadata\Put(),
        new \ApiPlatform\Metadata\Patch(),
        new \ApiPlatform\Metadata\Delete(),
    ],
    normalizationContext: ['groups' => ['transaction:read'], 'enable_max_depth' => true],
    denormalizationContext: ['groups' => ['transaction:write']],
    paginationMaximumItemsPerPage: 1000,
)]
```

- [ ] **Step 2: Clear cache and verify**

```bash
docker compose  exec backend php bin/console cache:clear
```

Expected: `[OK] Cache for the "dev" environment (debug=true) was successfully cleared.`

- [ ] **Step 3: Run existing tests to confirm nothing broke**

```bash
docker compose  exec -T \
  -e DATABASE_URL="postgresql://user:password@db:5432/budget_test?serverVersion=16&charset=utf8" \
  -e APP_ENV=test \
  backend vendor/bin/phpunit --testdox
```

Expected: `OK (10 tests, 20 assertions)`

- [ ] **Step 4: Commit**

```bash
git add backend/src/Entity/Transaction.php
git commit -m "feat: raise transaction pagination limit to 1000 for CSV export"
```

---

## Task 2: Create `exportToCsv` Utility

**Files:**
- Create: `frontend/src/utils/exportToCsv.ts`

- [ ] **Step 1: Create the utility**

Create `frontend/src/utils/exportToCsv.ts`:

```typescript
import type { Transaction } from '../types/api';

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCsv(transactions: Transaction[]): void {
  const header = ['Date', 'Type', 'Amount', 'Currency', 'Category', 'Account', 'Note'];

  const rows = transactions.map((tx) => [
    tx.date ? new Date(tx.date).toISOString().slice(0, 10) : '',
    tx.type ?? '',
    tx.amount != null ? String(tx.amount) : '',
    tx.account?.currency ?? '',
    tx.category?.name ?? '',
    tx.account?.name ?? '',
    tx.note ?? '',
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\r\n');

  const BOM = '﻿';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/utils/exportToCsv.ts
git commit -m "feat: add exportToCsv utility"
```

---

## Task 3: Add Export CSV Button to Transactions Page

**Files:**
- Modify: `frontend/src/pages/Transactions.tsx`

The current file imports `Button` from MUI and `useTransactions, useDeleteTransaction` from hooks. It does NOT import `apiClient` directly — that needs to be added.

- [ ] **Step 1: Update MUI and icon imports**

Replace the two import blocks at the top of `frontend/src/pages/Transactions.tsx`:

```typescript
import {
  Box, Typography, Card, CardContent, IconButton, Fab,
  CircularProgress, Stack, Drawer, ToggleButtonGroup, ToggleButton,
  Button, Snackbar, Alert,
} from '@mui/material';
import {
  Add as AddIcon, FilterList as FilterIcon,
  TrendingUp as IncomeIcon, TrendingDown as ExpenseIcon,
  ArrowForward as TransferIcon, Delete as DeleteIcon,
  FileDownload as DownloadIcon,
} from '@mui/icons-material';
```

- [ ] **Step 2: Add `apiClient` and `exportToCsv` imports**

After the existing import lines (after `import type { Transaction } from '../types/api';`), add:

```typescript
import apiClient from '../api/apiClient';
import { exportToCsv } from '../utils/exportToCsv';
```

- [ ] **Step 3: Add export state and handler inside the component**

Inside the `Transactions` component body, after the `params` construction and `useTransactions` / `useDeleteTransaction` calls, add:

```typescript
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportSnack, setExportSnack] = useState('');

  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    try {
      const exportParams = { ...params, itemsPerPage: 1000 };
      const { data } = await apiClient.get<{ 'hydra:member': Transaction[] }>('/transactions', { params: exportParams });
      const txs = data['hydra:member'];
      if (txs.length === 0) {
        setExportSnack('No transactions to export');
        return;
      }
      exportToCsv(txs);
    } catch {
      setExportError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };
```

- [ ] **Step 4: Replace the `actions` prop on `<Layout>`**

Find the existing `actions` prop:
```tsx
      actions={
        <IconButton onClick={() => setFilterOpen(true)}>
          <FilterIcon color={typeFilter !== 'ALL' ? 'primary' : 'inherit'} />
        </IconButton>
      }
```

Replace it with:
```tsx
      actions={
        <Box display="flex" gap={1}>
          <IconButton onClick={handleExport} disabled={exporting} title="Export CSV">
            {exporting ? <CircularProgress size={20} /> : <DownloadIcon />}
          </IconButton>
          <IconButton onClick={() => setFilterOpen(true)}>
            <FilterIcon color={typeFilter !== 'ALL' ? 'primary' : 'inherit'} />
          </IconButton>
        </Box>
      }
```

- [ ] **Step 5: Add error alert and snackbar to the JSX**

Inside the `<Layout>` return block, immediately before `<Box p={2}>`, add:

```tsx
      {exportError && (
        <Alert severity="error" onClose={() => setExportError('')} sx={{ mx: 2, mt: 1 }}>
          {exportError}
        </Alert>
      )}
      <Snackbar
        open={!!exportSnack}
        autoHideDuration={3000}
        onClose={() => setExportSnack('')}
        message={exportSnack}
      />
```

- [ ] **Step 6: Verify the build has no errors**

```bash
docker compose  exec -T frontend sh -c "npx vite build 2>&1 | tail -5"
```

Expected: `✓ built in ...`

- [ ] **Step 7: Manual test**

Open http://localhost:3000/transactions in the browser (log in first).

1. Click the download icon in the top-right → a `.csv` file downloads ✓
2. Open the CSV → columns are: `Date, Type, Amount, Currency, Category, Account, Note` ✓
3. Apply a type filter (e.g. EXPENSE), click download → only expense rows appear ✓
4. Apply a filter that matches nothing → snackbar "No transactions to export" appears ✓
5. Check filename format: `transactions-YYYY-MM-DD.csv` ✓

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/Transactions.tsx
git commit -m "feat: add Export CSV button to Transactions page"
```
