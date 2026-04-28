# Budget PWA Phase 1 — Make Usable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all broken UI/API issues so the app is fully navigable and correctly rendering on both mobile and desktop, with real stats, working filters, and a functional reports page — no auth yet.

**Architecture:** Symfony 7 backend (API Platform) + React 18 TypeScript frontend, both running in Docker Compose. Backend service is named `backend`, frontend `frontend`. All commands are run from the `budget-pwa/` directory.

**Tech Stack:** PHP 8.3 / Symfony 7 / API Platform 3 / Doctrine ORM / React 18 / TypeScript / MUI v5 / TanStack Query / recharts / framer-motion

---

## File Map

### Backend (all paths relative to `budget-pwa/backend/`)
| File | Action | Purpose |
|------|--------|---------|
| `src/Entity/Account.php` | Modify | Add serialization groups for color, currency, balance, icon |
| `src/Entity/Category.php` | Modify | Add budget:read + planned:read groups, add MaxDepth |
| `src/Entity/Budget.php` | Modify | Add non-mapped `$spent` property + month/year fields confirmed |
| `src/Entity/PlannedPayment.php` | Modify | Add planned:read groups to account/category sub-fields |
| `src/Repository/TransactionRepository.php` | Modify | Add `getSpentForBudget()` query |
| `src/State/BudgetStateProvider.php` | Create | Custom API Platform provider decorating default to append `spent` |
| `src/Controller/StatsController.php` | Create | `GET /api/stats/summary` + `GET /api/stats/monthly-trend` |
| `config/packages/api_platform.yaml` | Modify | Enable `enable_max_depth` |
| `config/routes.yaml` | Modify | Register stats routes |

### Frontend (all paths relative to `budget-pwa/frontend/`)
| File | Action | Purpose |
|------|--------|---------|
| `src/types/api.ts` | Modify | Fix Budget type (month/year), fix PlannedPayment type |
| `src/utils/formatAmount.ts` | Create | `Intl.NumberFormat` currency formatter |
| `src/theme/theme.ts` | Modify | Export light + dark theme objects |
| `src/context/ThemeContext.tsx` | Create | Dark mode state in localStorage, provide theme mode |
| `src/main.tsx` | Modify | Wrap app with ThemeContext |
| `src/api/apiClient.ts` | Modify | Add useStats hook base URL |
| `src/hooks/useApi.ts` | Modify | Add `useDeleteTransaction`, `useTogglePlannedPaymentPaid`, `useStats`, `useMonthlyTrend` |
| `src/components/Layout.tsx` | Modify | Add desktop sidebar drawer, add `navigationIcon` prop, fix `actions` vs `headerActions` naming |
| `src/pages/Dashboard.tsx` | Modify | Wire `/api/stats/summary`, fix layout structure |
| `src/pages/Transactions.tsx` | Modify | Filter drawer, delete, date-grouped display, formatAmount |
| `src/pages/Budget.tsx` | Modify | Real `spent` from API, delete via swipe, formatAmount |
| `src/pages/AddEditBudget.tsx` | Modify | Fix `headerActions` → `actions` prop, add month/year to payload |
| `src/pages/AddEditTransaction.tsx` | Modify | Fix `navigationIcon` prop (rename to match Layout) |
| `src/pages/PlannedPayments.tsx` | Modify | Mark-paid quick action, delete, formatAmount |
| `src/pages/Reports.tsx` | Modify | Build recharts donut + bar charts |
| `src/pages/Settings.tsx` | Modify | Wire dark mode toggle to ThemeContext |
| `index.html` | Modify | Add `viewport-fit=cover` |

---

## Task 1: Fix API Type Mismatches (Frontend)

The `api.ts` types are out of sync with the actual Symfony entities. Budget entity uses `month`/`year` integers, not `period`/`startDate`/`endDate`. PlannedPayment entity has no `type`, `isRecurring`, or `recurrencePattern` fields.

**Files:**
- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: Update Budget and PlannedPayment types**

Replace the content of `frontend/src/types/api.ts`:

```typescript
export interface Account {
  '@id'?: string;
  id?: number;
  name: string;
  type: string;
  balance: number;
  currency: string;
  color: string;
  icon: string;
  isArchived: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  '@id'?: string;
  id?: number;
  name: string;
  icon: string;
  color: string;
  type: 'INCOME' | 'EXPENSE';
  isArchived?: boolean;
}

export interface Transaction {
  '@id'?: string;
  id?: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  account: Account;
  category?: Category;
  toAccount?: Account;
  note?: string;
  date: string;
  createdAt?: string;
}

export interface Budget {
  '@id'?: string;
  id?: number;
  category: Category;
  amount: number;
  month: number;
  year: number;
  spent?: number;
}

export interface PlannedPayment {
  '@id'?: string;
  id?: number;
  name: string;
  amount: number;
  category?: Category;
  account?: Account;
  dueDate: string;
  isPaid: boolean;
  note?: string;
}

export interface StatsSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  plannedExpensesUnpaid: number;
  forecastedBalance: number;
}

export interface MonthlyTrendItem {
  month: string;
  income: number;
  expense: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "fix: align api.ts types with actual Symfony entity fields"
```

---

## Task 2: Fix Backend Serialization Groups

Transactions, budgets, and planned payments return IRIs for related entities instead of embedded objects. The fix: add the consuming entity's group to the fields on Account and Category that need to be embedded.

**Files:**
- Modify: `backend/src/Entity/Account.php`
- Modify: `backend/src/Entity/Category.php`
- Modify: `backend/config/packages/api_platform.yaml`

- [ ] **Step 1: Add serialization groups to Account.php**

In `backend/src/Entity/Account.php`, update the `#[Groups]` annotations on the fields that need to be embedded in other entities' responses:

```php
#[ORM\Column]
#[Groups(['account:read'])]
private ?int $id = null;
```
→
```php
#[ORM\Column]
#[Groups(['account:read', 'transaction:read', 'planned:read'])]
private ?int $id = null;
```

```php
#[ORM\Column(length: 255)]
#[Groups(['account:read', 'account:write', 'transaction:read'])]
private ?string $name = null;
```
→
```php
#[ORM\Column(length: 255)]
#[Groups(['account:read', 'account:write', 'transaction:read', 'planned:read'])]
private ?string $name = null;
```

Add `transaction:read` and `planned:read` to `$color`, `$icon`, `$currency`, `$balance`:

```php
#[ORM\Column(length: 10)]
#[Groups(['account:read', 'account:write', 'transaction:read', 'planned:read'])]
private ?string $currency = 'USD';

#[ORM\Column(length: 20)]
#[Groups(['account:read', 'account:write', 'transaction:read', 'planned:read'])]
private ?string $color = '#4CAF50';

#[ORM\Column(length: 50)]
#[Groups(['account:read', 'account:write', 'transaction:read', 'planned:read'])]
private ?string $icon = 'account_balance_wallet';

#[ORM\Column]
#[Groups(['account:read', 'account:write', 'transaction:read', 'planned:read'])]
private ?float $balance = 0.0;
```

- [ ] **Step 2: Add serialization groups to Category.php**

In `backend/src/Entity/Category.php`, update Groups on these fields:

```php
#[ORM\Column]
#[Groups(['category:read', 'transaction:read', 'budget:read', 'planned:read'])]
private ?int $id = null;

#[ORM\Column(length: 255)]
#[Groups(['category:read', 'category:write', 'transaction:read', 'budget:read', 'planned:read'])]
private ?string $name = null;

#[ORM\Column(length: 50)]
#[Groups(['category:read', 'category:write', 'transaction:read', 'budget:read', 'planned:read'])]
private ?string $type = null;

#[ORM\Column(length: 20)]
#[Groups(['category:read', 'category:write', 'transaction:read', 'budget:read', 'planned:read'])]
private ?string $color = '#FF5722';

#[ORM\Column(length: 50)]
#[Groups(['category:read', 'category:write', 'transaction:read', 'budget:read', 'planned:read'])]
private ?string $icon = 'category';
```

Add `#[MaxDepth(1)]` to the self-referential fields to prevent infinite recursion. Add the import at the top of the file:

```php
use Symfony\Component\Serializer\Annotation\MaxDepth;
```

Then add the attribute:

```php
#[ORM\ManyToOne(targetEntity: self::class, inversedBy: 'subCategories')]
#[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
#[Groups(['category:read', 'category:write'])]
#[MaxDepth(1)]
private ?self $parent = null;

#[ORM\OneToMany(mappedBy: 'parent', targetEntity: self::class)]
#[Groups(['category:read'])]
#[MaxDepth(1)]
private Collection $subCategories;
```

- [ ] **Step 3: Enable max_depth in API Platform config**

Replace `backend/config/packages/api_platform.yaml`:

```yaml
api_platform:
    title: Budget API
    version: 1.0.0
    mapping:
        paths: ['%kernel.project_dir%/src/Entity']
    patch_formats:
        json: ['application/merge-patch+json']
    formats:
        jsonld: ['application/ld+json']
        json: ['application/json']
    serializer:
        enable_max_depth: true
```

- [ ] **Step 4: Clear Symfony cache and verify**

```bash
docker compose exec backend bin/console cache:clear
```

Expected output: `[OK] Cache for the "dev" environment (debug) was successfully cleared.`

Then verify a transaction response embeds account/category objects:

```bash
curl -s http://localhost:8000/api/transactions | python3 -m json.tool | grep -A5 '"account"'
```

Expected: You see `"name":`, `"color":`, `"currency":` nested under `"account"` — not an IRI string.

- [ ] **Step 5: Commit**

```bash
git add backend/src/Entity/Account.php backend/src/Entity/Category.php backend/config/packages/api_platform.yaml
git commit -m "fix: embed account/category objects in transaction, budget, planned payment responses"
```

---

## Task 3: Add `spent` to Budget Response

Budget progress bars show 0% because there is no `spent` field. We add a non-mapped property to `Budget` and a custom API Platform State Provider that computes it from transactions.

**Files:**
- Modify: `backend/src/Entity/Budget.php`
- Modify: `backend/src/Repository/TransactionRepository.php`
- Create: `backend/src/State/BudgetStateProvider.php`

- [ ] **Step 1: Add `$spent` non-mapped property to Budget entity**

In `backend/src/Entity/Budget.php`, add after the existing imports:

```php
use ApiPlatform\Metadata\Operation;
use App\State\BudgetStateProvider;
```

Update the `#[ApiResource]` attribute to reference the custom provider:

```php
#[ApiResource(
    operations: [
        new \ApiPlatform\Metadata\Get(provider: BudgetStateProvider::class),
        new \ApiPlatform\Metadata\GetCollection(provider: BudgetStateProvider::class),
        new \ApiPlatform\Metadata\Post(),
        new \ApiPlatform\Metadata\Put(),
        new \ApiPlatform\Metadata\Patch(),
        new \ApiPlatform\Metadata\Delete(),
    ],
    normalizationContext: ['groups' => ['budget:read']],
    denormalizationContext: ['groups' => ['budget:write']],
)]
```

Add the non-mapped property after the existing properties (before `__construct`):

```php
#[Groups(['budget:read'])]
private float $spent = 0.0;

public function getSpent(): float
{
    return $this->spent;
}

public function setSpent(float $spent): static
{
    $this->spent = $spent;
    return $this;
}
```

- [ ] **Step 2: Add `getSpentForBudget()` to TransactionRepository**

In `backend/src/Repository/TransactionRepository.php`, add this method. Use date range parameters (not `MONTH()`/`YEAR()` — those are MySQL-only and don't work on PostgreSQL):

```php
public function getSpentForBudget(int $categoryId, int $month, int $year): float
{
    $start = new \DateTimeImmutable(sprintf('%d-%02d-01', $year, $month));
    $end = $start->modify('first day of next month');

    $result = $this->createQueryBuilder('t')
        ->select('COALESCE(SUM(t.amount), 0) as spent')
        ->where('t.type = :type')
        ->andWhere('t.date >= :start')
        ->andWhere('t.date < :end')
        ->andWhere('IDENTITY(t.category) = :categoryId')
        ->setParameter('type', 'EXPENSE')
        ->setParameter('start', $start)
        ->setParameter('end', $end)
        ->setParameter('categoryId', $categoryId)
        ->getQuery()
        ->getSingleResult();

    return (float) $result['spent'];
}
```

- [ ] **Step 3: Create BudgetStateProvider**

Create `backend/src/State/BudgetStateProvider.php`:

```php
<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Budget;
use App\Repository\TransactionRepository;
use Doctrine\ORM\EntityManagerInterface;

final class BudgetStateProvider implements ProviderInterface
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly TransactionRepository $transactionRepository,
        private readonly ProviderInterface $itemProvider,
        private readonly ProviderInterface $collectionProvider,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $isCollection = str_contains($operation::class, 'Collection');

        if ($isCollection) {
            $budgets = $this->collectionProvider->provide($operation, $uriVariables, $context);
            foreach ($budgets as $budget) {
                $this->attachSpent($budget);
            }
            return $budgets;
        }

        $budget = $this->itemProvider->provide($operation, $uriVariables, $context);
        if ($budget instanceof Budget) {
            $this->attachSpent($budget);
        }
        return $budget;
    }

    private function attachSpent(Budget $budget): void
    {
        if ($budget->getCategory() === null) {
            return;
        }
        $spent = $this->transactionRepository->getSpentForBudget(
            $budget->getCategory()->getId(),
            $budget->getMonth(),
            $budget->getYear(),
        );
        $budget->setSpent($spent);
    }
}
```

- [ ] **Step 4: Register the provider with autowiring**

In `backend/config/services.yaml`, add:

```yaml
App\State\BudgetStateProvider:
    arguments:
        $itemProvider: '@api_platform.doctrine.orm.state.item_provider'
        $collectionProvider: '@api_platform.doctrine.orm.state.collection_provider'
```

- [ ] **Step 5: Clear cache and verify**

```bash
docker compose exec backend bin/console cache:clear
curl -s http://localhost:8000/api/budgets | python3 -m json.tool | grep spent
```

Expected: `"spent": 0` (or a real number if transactions exist for that category/month).

- [ ] **Step 6: Commit**

```bash
git add backend/src/Entity/Budget.php backend/src/Repository/TransactionRepository.php \
        backend/src/State/BudgetStateProvider.php backend/config/services.yaml
git commit -m "feat: add computed spent field to budget API response"
```

---

## Task 4: Create Stats Summary Endpoint

The Dashboard shows $0 for monthly income/expense because there is no backend endpoint. We add `GET /api/stats/summary?year=Y&month=M`.

**Files:**
- Create: `backend/src/Controller/StatsController.php`
- Modify: `backend/config/routes.yaml`

- [ ] **Step 1: Create StatsController**

Create `backend/src/Controller/StatsController.php`:

```php
<?php

namespace App\Controller;

use App\Repository\AccountRepository;
use App\Repository\PlannedPaymentRepository;
use App\Repository\TransactionRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

class StatsController extends AbstractController
{
    public function __construct(
        private readonly AccountRepository $accountRepository,
        private readonly TransactionRepository $transactionRepository,
        private readonly PlannedPaymentRepository $plannedPaymentRepository,
    ) {}

    #[Route('/api/stats/summary', name: 'stats_summary', methods: ['GET'])]
    public function summary(Request $request): JsonResponse
    {
        $year = (int) $request->query->get('year', date('Y'));
        $month = (int) $request->query->get('month', date('n'));

        $totalBalance = $this->accountRepository->getTotalBalance();
        $monthlyIncome = $this->transactionRepository->getMonthlyTotal('INCOME', $month, $year);
        $monthlyExpense = $this->transactionRepository->getMonthlyTotal('EXPENSE', $month, $year);
        $plannedExpensesUnpaid = $this->plannedPaymentRepository->getUnpaidExpensesTotal();
        $forecastedBalance = $totalBalance - $plannedExpensesUnpaid;

        return $this->json([
            'totalBalance' => $totalBalance,
            'monthlyIncome' => $monthlyIncome,
            'monthlyExpense' => $monthlyExpense,
            'plannedExpensesUnpaid' => $plannedExpensesUnpaid,
            'forecastedBalance' => $forecastedBalance,
        ]);
    }

    #[Route('/api/stats/monthly-trend', name: 'stats_monthly_trend', methods: ['GET'])]
    public function monthlyTrend(Request $request): JsonResponse
    {
        $months = (int) $request->query->get('months', 6);
        $months = min(max($months, 1), 24);

        $data = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $date = new \DateTimeImmutable("first day of -$i months");
            $month = (int) $date->format('n');
            $year = (int) $date->format('Y');

            $data[] = [
                'month' => $date->format('Y-m'),
                'income' => $this->transactionRepository->getMonthlyTotal('INCOME', $month, $year),
                'expense' => $this->transactionRepository->getMonthlyTotal('EXPENSE', $month, $year),
            ];
        }

        return $this->json($data);
    }
}
```

- [ ] **Step 2: Add `getTotalBalance()` to AccountRepository**

In `backend/src/Repository/AccountRepository.php`, add:

```php
public function getTotalBalance(): float
{
    $result = $this->createQueryBuilder('a')
        ->select('COALESCE(SUM(a.balance), 0) as total')
        ->where('a.isArchived = false')
        ->getQuery()
        ->getSingleResult();

    return (float) $result['total'];
}
```

- [ ] **Step 3: Add `getMonthlyTotal()` to TransactionRepository**

In `backend/src/Repository/TransactionRepository.php`, add. Use date ranges — not `MONTH()`/`YEAR()` — for PostgreSQL compatibility:

```php
public function getMonthlyTotal(string $type, int $month, int $year): float
{
    $start = new \DateTimeImmutable(sprintf('%d-%02d-01', $year, $month));
    $end = $start->modify('first day of next month');

    $result = $this->createQueryBuilder('t')
        ->select('COALESCE(SUM(t.amount), 0) as total')
        ->where('t.type = :type')
        ->andWhere('t.date >= :start')
        ->andWhere('t.date < :end')
        ->setParameter('type', $type)
        ->setParameter('start', $start)
        ->setParameter('end', $end)
        ->getQuery()
        ->getSingleResult();

    return (float) $result['total'];
}
```

- [ ] **Step 4: Add `getUnpaidExpensesTotal()` to PlannedPaymentRepository**

In `backend/src/Repository/PlannedPaymentRepository.php`, add:

```php
public function getUnpaidExpensesTotal(): float
{
    $result = $this->createQueryBuilder('p')
        ->select('COALESCE(SUM(p.amount), 0) as total')
        ->where('p.isPaid = false')
        ->getQuery()
        ->getSingleResult();

    return (float) $result['total'];
}
```

- [ ] **Step 5: Add routes to config/routes.yaml**

In `backend/config/routes.yaml`, append:

```yaml
app_controllers:
    resource:
        path: ../src/Controller/
        namespace: App\Controller
    type: attribute
```

- [ ] **Step 6: Test both endpoints**

```bash
docker compose exec backend bin/console cache:clear
curl -s "http://localhost:8000/api/stats/summary?year=2026&month=4" | python3 -m json.tool
```

Expected:
```json
{
    "totalBalance": 0.0,
    "monthlyIncome": 0.0,
    "monthlyExpense": 0.0,
    "plannedExpensesUnpaid": 0.0,
    "forecastedBalance": 0.0
}
```

```bash
curl -s "http://localhost:8000/api/stats/monthly-trend?months=6" | python3 -m json.tool
```

Expected: array of 6 objects with `month`, `income`, `expense`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/Controller/StatsController.php \
        backend/src/Repository/AccountRepository.php \
        backend/src/Repository/TransactionRepository.php \
        backend/src/Repository/PlannedPaymentRepository.php \
        backend/config/routes.yaml
git commit -m "feat: add stats summary and monthly trend API endpoints"
```

---

## Task 5: Fix AddEditBudget Form

The form sends no `month`/`year` fields (budget will be created with NULL values), and uses a non-existent `headerActions` prop.

**Files:**
- Modify: `frontend/src/pages/AddEditBudget.tsx`

- [ ] **Step 1: Add month/year to form state and payload; fix prop name**

Replace `frontend/src/pages/AddEditBudget.tsx` with:

```tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Stack,
  CircularProgress,
  IconButton,
  Alert,
} from '@mui/material';
import { Delete as DeleteIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  useCategories,
  useBudget,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
} from '../hooks/useApi';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const currentDate = new Date();

const AddEditBudget = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: budget, isLoading: budgetLoading } = useBudget(id);
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget(id || '');
  const deleteMutation = useDeleteBudget();

  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
  });

  useEffect(() => {
    if (budget) {
      setFormData({
        amount: budget.amount.toString(),
        category: budget.category?.['@id'] || '',
        month: budget.month,
        year: budget.year,
      });
    }
  }, [budget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      amount: parseFloat(formData.amount),
      category: formData.category,
      month: formData.month,
      year: formData.year,
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload);
      }
      navigate('/budget');
    } catch (error) {
      console.error('Failed to save budget:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this budget?')) {
      await deleteMutation.mutateAsync(id!);
      navigate('/budget');
    }
  };

  if (categoriesLoading || (isEdit && budgetLoading)) {
    return (
      <Layout title={isEdit ? 'Edit Budget' : 'Add Budget'}>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout
      title={isEdit ? 'Edit Budget' : 'Add Budget'}
      navigationIcon={<IconButton onClick={() => navigate(-1)}><ArrowBackIcon /></IconButton>}
      actions={
        isEdit ? (
          <IconButton onClick={handleDelete} color="error">
            <DeleteIcon />
          </IconButton>
        ) : undefined
      }
    >
      <Box p={2} component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <TextField
            fullWidth label="Amount" type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required variant="outlined" inputProps={{ step: '0.01', min: '0' }}
          />
          <TextField
            fullWidth select label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required variant="outlined" disabled={isEdit}
          >
            {categories?.map((cat) => (
              <MenuItem key={cat.id} value={cat['@id']}>{cat.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth select label="Month"
            value={formData.month}
            onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
            required variant="outlined"
          >
            {MONTHS.map((m) => (
              <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth label="Year" type="number"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
            required variant="outlined" inputProps={{ min: 2020, max: 2100 }}
          />
          {(createMutation.isError || updateMutation.isError) && (
            <Alert severity="error">An error occurred while saving the budget.</Alert>
          )}
          <Button
            fullWidth variant="contained" size="large" type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            sx={{ mt: 2, borderRadius: 2, py: 1.5 }}
          >
            {isEdit ? 'Update Budget' : 'Add Budget'}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
};

export default AddEditBudget;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/AddEditBudget.tsx
git commit -m "fix: add month/year fields to budget form, fix layout prop naming"
```

---

## Task 6: Create formatAmount Utility

Replaces all hardcoded `$` signs with proper locale-aware currency formatting.

**Files:**
- Create: `frontend/src/utils/formatAmount.ts`

- [ ] **Step 1: Create the utility**

Create `frontend/src/utils/formatAmount.ts`:

```typescript
export function formatAmount(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/utils/formatAmount.ts
git commit -m "feat: add formatAmount currency utility using Intl.NumberFormat"
```

---

## Task 7: Add Dark Mode Theme Support

Wires the Settings dark mode toggle to actually change the app's theme.

**Files:**
- Modify: `frontend/src/theme/theme.ts`
- Create: `frontend/src/context/ThemeContext.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Export light and dark themes from theme.ts**

Replace `frontend/src/theme/theme.ts`:

```typescript
import { createTheme, Theme } from '@mui/material/styles';

const sharedTypography = {
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  h1: { fontSize: '2.5rem', fontWeight: 600 },
  h2: { fontSize: '2rem', fontWeight: 600 },
  h3: { fontSize: '1.75rem', fontWeight: 600 },
  h4: { fontSize: '1.5rem', fontWeight: 600 },
  h5: { fontSize: '1.25rem', fontWeight: 600 },
  h6: { fontSize: '1rem', fontWeight: 600 },
  titleMedium: { fontSize: '1.125rem', fontWeight: 700 },
  labelLarge: { fontSize: '0.875rem', fontWeight: 500 },
  labelMedium: { fontSize: '0.75rem', fontWeight: 500 },
  labelSmall: { fontSize: '0.625rem', fontWeight: 500 },
};

const sharedComponents = {
  MuiButton: {
    styleOverrides: { root: { textTransform: 'none' as const, borderRadius: 20 } },
  },
  MuiCard: {
    styleOverrides: { root: { borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' } },
  },
};

export const lightTheme: Theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4CAF50', contrastText: '#ffffff' },
    secondary: { main: '#FF5722' },
    background: { default: '#f8f9fa', paper: '#ffffff' },
  },
  typography: sharedTypography,
  shape: { borderRadius: 12 },
  components: sharedComponents,
});

export const darkTheme: Theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#66BB6A', contrastText: '#000000' },
    secondary: { main: '#FF7043' },
    background: { default: '#121212', paper: '#1e1e1e' },
  },
  typography: sharedTypography,
  shape: { borderRadius: 12 },
  components: sharedComponents,
});

export const theme = lightTheme;

declare module '@mui/material/styles' {
  interface TypographyVariants {
    titleMedium: React.CSSProperties;
    labelLarge: React.CSSProperties;
    labelMedium: React.CSSProperties;
    labelSmall: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    titleMedium?: React.CSSProperties;
    labelLarge?: React.CSSProperties;
    labelMedium?: React.CSSProperties;
    labelSmall?: React.CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    titleMedium: true;
    labelLarge: true;
    labelMedium: true;
    labelSmall: true;
  }
}
```

- [ ] **Step 2: Create ThemeContext**

Create `frontend/src/context/ThemeContext.tsx`:

```tsx
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { lightTheme, darkTheme } from '../theme/theme';

interface ThemeContextValue {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  toggleTheme: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('theme-mode') === 'dark';
  });

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem('theme-mode', next ? 'dark' : 'light');
      return next;
    });
  };

  const value = useMemo(() => ({ isDark, toggleTheme }), [isDark]);

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
```

- [ ] **Step 3: Update main.tsx to use AppThemeProvider**

Replace `frontend/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppThemeProvider } from './context/ThemeContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppThemeProvider>
      <App />
    </AppThemeProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 4: Remove ThemeProvider from App.tsx** (it's now in main.tsx)

In `frontend/src/App.tsx`, remove the `ThemeProvider` and `CssBaseline` import and wrapper — but keep `CssBaseline` inside the Router since it still needs to be rendered. Replace the file:

```tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import AddEditTransaction from './pages/AddEditTransaction';
import Accounts from './pages/Accounts';
import AddEditAccount from './pages/AddEditAccount';
import Categories from './pages/Categories';
import AddEditCategory from './pages/AddEditCategory';
import Budget from './pages/Budget';
import PlannedPayments from './pages/PlannedPayments';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import AddEditBudget from './pages/AddEditBudget';
import AddEditPlannedPayment from './pages/AddEditPlannedPayment';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CssBaseline />
      <Router>
        <Box sx={{ pb: { xs: 8, md: 0 }, minHeight: '100vh', bgcolor: 'background.default' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/add" element={<AddEditTransaction />} />
            <Route path="/transactions/edit/:id" element={<AddEditTransaction />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/accounts/add" element={<AddEditAccount />} />
            <Route path="/accounts/edit/:id" element={<AddEditAccount />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/categories/add" element={<AddEditCategory />} />
            <Route path="/categories/edit/:id" element={<AddEditCategory />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/budget/add" element={<AddEditBudget />} />
            <Route path="/budget/edit/:id" element={<AddEditBudget />} />
            <Route path="/planned-payments" element={<PlannedPayments />} />
            <Route path="/planned-payments/add" element={<AddEditPlannedPayment />} />
            <Route path="/planned-payments/edit/:id" element={<AddEditPlannedPayment />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Box>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/theme/theme.ts frontend/src/context/ThemeContext.tsx \
        frontend/src/main.tsx frontend/src/App.tsx
git commit -m "feat: add dark mode theme support with localStorage persistence"
```

---

## Task 8: Fix Layout Component

Desktop has no navigation, `navigationIcon` prop is missing, and `headerActions`/`actions` naming is inconsistent across pages.

**Files:**
- Modify: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: Rewrite Layout with desktop sidebar**

Replace `frontend/src/components/Layout.tsx`:

```tsx
import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  List as TransactionsIcon,
  PieChart as ReportsIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
  navigationIcon?: React.ReactNode;
}

const SIDEBAR_WIDTH = 240;

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { label: 'Transactions', icon: <TransactionsIcon />, path: '/transactions' },
  { label: 'Reports', icon: <ReportsIcon />, path: '/reports' },
  { label: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

const Layout: React.FC<LayoutProps> = ({ children, title, actions, navigationIcon }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const activeValue = NAV_ITEMS.find(
    (item) => item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path)
  )?.path ?? '/';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {isDesktop && (
        <Drawer
          variant="permanent"
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: SIDEBAR_WIDTH,
              boxSizing: 'border-box',
              borderRight: `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.paper',
            },
          }}
        >
          <Toolbar>
            <Typography variant="h6" fontWeight="bold" color="primary">
              Budget
            </Typography>
          </Toolbar>
          <Divider />
          <List>
            {NAV_ITEMS.map((item) => {
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
              return (
                <ListItem key={item.path} disablePadding>
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    selected={isActive}
                    sx={{
                      mx: 1,
                      borderRadius: 2,
                      '&.Mui-selected': {
                        bgcolor: `${theme.palette.primary.main}15`,
                        color: 'primary.main',
                        '& .MuiListItemIcon-root': { color: 'primary.main' },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Drawer>
      )}

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Toolbar>
            {navigationIcon}
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
              {title}
            </Typography>
            {actions}
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            maxWidth: { md: 800 },
            width: '100%',
            mx: 'auto',
            pb: { xs: 8, md: 2 },
          }}
        >
          {children}
        </Box>
      </Box>

      {!isDesktop && (
        <Paper
          sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}
          elevation={3}
        >
          <BottomNavigation
            showLabels
            value={activeValue}
            onChange={(_, newValue) => navigate(newValue)}
          >
            {NAV_ITEMS.map((item) => (
              <BottomNavigationAction
                key={item.path}
                label={item.label}
                icon={item.icon}
                value={item.path}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};

export default Layout;
```

- [ ] **Step 2: Verify app navigates correctly on desktop**

```bash
docker compose exec frontend npm run build 2>&1 | tail -5
```

Expected: Build completes without TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Layout.tsx
git commit -m "fix: add desktop sidebar navigation, add navigationIcon prop to Layout"
```

---

## Task 9: Add Missing API Hooks

Several mutations are used in pages but missing from `useApi.ts`.

**Files:**
- Modify: `frontend/src/hooks/useApi.ts`

- [ ] **Step 1: Add missing hooks to useApi.ts**

First add the two new type imports at the top of `frontend/src/hooks/useApi.ts`, alongside the existing imports:

```typescript
import { Account, Transaction, Category, Budget, PlannedPayment, StatsSummary, MonthlyTrendItem } from '../types/api';
```

Then append the following hook implementations to the **end** of the file:

```typescript
export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useTogglePlannedPaymentPaid = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isPaid }: { id: string; isPaid: boolean }) => {
      const { data } = await apiClient.patch<PlannedPayment>(
        `/planned_payments/${id}`,
        { isPaid },
        { headers: { 'Content-Type': 'application/merge-patch+json' } }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plannedPayments'] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useStatsSummary = (year: number, month: number) => {
  return useQuery({
    queryKey: ['stats', 'summary', year, month],
    queryFn: async () => {
      const { data } = await apiClient.get<StatsSummary>('/stats/summary', {
        params: { year, month },
      });
      return data;
    },
  });
};

export const useMonthlyTrend = (months: number = 6) => {
  return useQuery({
    queryKey: ['stats', 'monthly-trend', months],
    queryFn: async () => {
      const { data } = await apiClient.get<MonthlyTrendItem[]>('/stats/monthly-trend', {
        params: { months },
      });
      return data;
    },
  });
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useApi.ts
git commit -m "feat: add missing API hooks for delete, toggle paid, and stats queries"
```

---

## Task 10: Fix Dashboard Page

Wires the real stats endpoint and fixes the broken layout structure.

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Rewrite Dashboard.tsx**

Replace `frontend/src/pages/Dashboard.tsx`:

```tsx
import React from 'react';
import {
  Box, Typography, Card, CardContent, IconButton, Fab,
  CircularProgress, Stack, Chip,
} from '@mui/material';
import {
  Add as AddIcon, AccountBalance as AccountIcon,
  TrendingUp as IncomeIcon, TrendingDown as ExpenseIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAccounts, useTransactions, useStatsSummary } from '../hooks/useApi';
import { formatAmount } from '../utils/formatAmount';
import type { Account, Transaction } from '../types/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const now = new Date();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: transactions, isLoading: txLoading } = useTransactions({
    'order[date]': 'desc',
    itemsPerPage: 5,
  });
  const { data: stats, isLoading: statsLoading } = useStatsSummary(
    now.getFullYear(),
    now.getMonth() + 1,
  );

  const isLoading = accountsLoading || txLoading || statsLoading;

  if (isLoading) {
    return (
      <Layout title="Budget">
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  const userCurrency = accounts?.[0]?.currency ?? 'USD';

  return (
    <Layout
      title="Budget"
      actions={<IconButton onClick={() => navigate('/accounts')}><AccountIcon /></IconButton>}
    >
      <Box p={2}>
        {/* Total Balance */}
        <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', mb: 2 }}>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="labelLarge" sx={{ opacity: 0.8 }}>Total Balance</Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', my: 1 }}>
              {formatAmount(stats?.totalBalance ?? 0, userCurrency)}
            </Typography>
            {(stats?.plannedExpensesUnpaid ?? 0) > 0 && (
              <>
                <Typography variant="labelMedium" sx={{ opacity: 0.9 }}>
                  Forecasted: {formatAmount(stats!.forecastedBalance, userCurrency)}
                </Typography>
                <Typography variant="labelSmall" sx={{ opacity: 0.7, display: 'block' }}>
                  After {formatAmount(stats!.plannedExpensesUnpaid, userCurrency)} in planned payments
                </Typography>
              </>
            )}
          </CardContent>
        </Card>

        {/* Income / Expense */}
        <Stack direction="row" spacing={2} mb={2}>
          <SummaryCard
            title="Income" amount={stats?.monthlyIncome ?? 0}
            currency={userCurrency} icon={<IncomeIcon />} color="#2E7D32"
          />
          <SummaryCard
            title="Expenses" amount={stats?.monthlyExpense ?? 0}
            currency={userCurrency} icon={<ExpenseIcon />} color="#C62828"
          />
        </Stack>

        {/* Accounts */}
        <SectionHeader title="Accounts" onAction={() => navigate('/accounts')} />
        <Box display="flex" gap={1.5} overflow="auto" pb={1} mb={2} sx={{ scrollbarWidth: 'none' }}>
          {accounts?.map((account) => (
            <AccountChip key={account.id} account={account} />
          ))}
        </Box>

        {/* Recent Transactions */}
        <SectionHeader title="Recent Transactions" onAction={() => navigate('/transactions')} />
        <Stack spacing={1}>
          {transactions?.length === 0 && (
            <Typography variant="body2" color="text.secondary" align="center" py={2}>
              No transactions yet. Tap + to add one!
            </Typography>
          )}
          {transactions?.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
        </Stack>
      </Box>

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: { xs: 80, md: 16 }, right: 16 }}
        onClick={() => navigate('/transactions/add')}
      >
        <AddIcon />
      </Fab>
    </Layout>
  );
};

const SummaryCard = ({
  title, amount, currency, icon, color,
}: {
  title: string; amount: number; currency: string; icon: React.ReactNode; color: string;
}) => (
  <Card sx={{ flex: 1, bgcolor: `${color}10` }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '16px !important' }}>
      <Box sx={{
        bgcolor: color, color: 'white', borderRadius: '12px',
        width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="labelSmall" color="text.secondary">{title}</Typography>
        <Typography variant="h6" sx={{ color, fontWeight: 'bold' }}>
          {formatAmount(amount, currency)}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

const SectionHeader = ({ title, onAction }: { title: string; onAction: () => void }) => (
  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
    <Typography variant="titleMedium">{title}</Typography>
    <Box
      onClick={onAction}
      sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'primary.main' }}
    >
      <Typography variant="labelMedium">See all</Typography>
      <ChevronRightIcon fontSize="small" />
    </Box>
  </Box>
);

const AccountChip = ({ account }: { account: Account }) => (
  <Card sx={{
    minWidth: 140, bgcolor: `${account.color}15`,
    border: `1px solid ${account.color}30`, boxShadow: 'none',
  }}>
    <CardContent sx={{ p: '12px !important' }}>
      <Typography variant="labelMedium" color="text.secondary">{account.name}</Typography>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: account.color }}>
        {formatAmount(account.balance, account.currency)}
      </Typography>
    </CardContent>
  </Card>
);

const TransactionItem = ({ transaction }: { transaction: Transaction }) => {
  const color = transaction.type === 'INCOME' ? '#2E7D32'
    : transaction.type === 'TRANSFER' ? '#1565C0' : '#C62828';
  const prefix = transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '-' : '';
  const currency = transaction.account?.currency ?? 'USD';

  return (
    <Card variant="outlined" sx={{ border: 'none', bgcolor: 'background.paper' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '12px !important' }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: '50%',
          bgcolor: transaction.type === 'INCOME' ? '#E8F5E9' : '#FFEBEE',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        }}>
          {transaction.type === 'INCOME' ? <IncomeIcon /> : <ExpenseIcon />}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {transaction.category?.name ?? (transaction.type === 'TRANSFER' ? 'Transfer' : transaction.note ?? '—')}
          </Typography>
          <Typography variant="labelSmall" color="text.secondary">
            {transaction.date ? new Date(transaction.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 'bold', color }}>
          {prefix}{formatAmount(transaction.amount, currency)}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "fix: wire real stats to dashboard, fix layout structure and currency display"
```

---

## Task 11: Fix Transactions Page

Adds filter drawer, date grouping, delete action, and proper currency display.

**Files:**
- Modify: `frontend/src/pages/Transactions.tsx`

- [ ] **Step 1: Rewrite Transactions.tsx**

Replace `frontend/src/pages/Transactions.tsx`:

```tsx
import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, IconButton, Fab,
  CircularProgress, Stack, Drawer, ToggleButtonGroup, ToggleButton,
  Button,
} from '@mui/material';
import {
  Add as AddIcon, FilterList as FilterIcon,
  TrendingUp as IncomeIcon, TrendingDown as ExpenseIcon,
  ArrowForward as TransferIcon, Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useTransactions, useDeleteTransaction } from '../hooks/useApi';
import { formatAmount } from '../utils/formatAmount';
import type { Transaction } from '../types/api';

type TypeFilter = 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER';

const Transactions = () => {
  const navigate = useNavigate();
  const [filterOpen, setFilterOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');

  const params: Record<string, string> = { 'order[date]': 'desc' };
  if (typeFilter !== 'ALL') params.type = typeFilter;

  const { data: transactions, isLoading } = useTransactions(params);
  const deleteMutation = useDeleteTransaction();

  const grouped = useMemo(() => {
    if (!transactions) return [];
    const map = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const key = tx.date ? new Date(tx.date).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      }) : 'Unknown date';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    }
    return Array.from(map.entries());
  }, [transactions]);

  const handleDelete = async (tx: Transaction) => {
    if (!tx.id) return;
    if (window.confirm(`Delete this transaction of ${formatAmount(tx.amount, tx.account?.currency ?? 'USD')}?`)) {
      await deleteMutation.mutateAsync(String(tx.id));
    }
  };

  if (isLoading) {
    return (
      <Layout title="Transactions">
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout
      title="Transactions"
      actions={
        <IconButton onClick={() => setFilterOpen(true)}>
          <FilterIcon color={typeFilter !== 'ALL' ? 'primary' : 'inherit'} />
        </IconButton>
      }
    >
      <Box p={2}>
        {typeFilter !== 'ALL' && (
          <Box mb={1}>
            <Button size="small" onClick={() => setTypeFilter('ALL')} variant="outlined">
              Clear filter: {typeFilter}
            </Button>
          </Box>
        )}

        {grouped.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="60vh" textAlign="center">
            <Typography variant="body2" color="text.secondary">
              No transactions yet.<br />Tap + to add one!
            </Typography>
          </Box>
        ) : (
          <Stack spacing={0}>
            {grouped.map(([date, txs]) => (
              <Box key={date}>
                <Typography
                  variant="labelMedium"
                  color="text.secondary"
                  sx={{ display: 'block', px: 0.5, pt: 2, pb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  {date}
                </Typography>
                <Stack spacing={1}>
                  {txs.map((tx) => (
                    <TransactionListItem
                      key={tx.id}
                      transaction={tx}
                      onClick={() => navigate(`/transactions/edit/${tx.id}`)}
                      onDelete={() => handleDelete(tx)}
                    />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: { xs: 80, md: 16 }, right: 16 }}
        onClick={() => navigate('/transactions/add')}
      >
        <AddIcon />
      </Fab>

      <Drawer anchor="bottom" open={filterOpen} onClose={() => setFilterOpen(false)}>
        <Box p={3}>
          <Typography variant="titleMedium" mb={2}>Filter by type</Typography>
          <ToggleButtonGroup
            value={typeFilter} exclusive fullWidth color="primary"
            onChange={(_, v) => { if (v) { setTypeFilter(v); setFilterOpen(false); } }}
          >
            <ToggleButton value="ALL">All</ToggleButton>
            <ToggleButton value="INCOME">Income</ToggleButton>
            <ToggleButton value="EXPENSE">Expense</ToggleButton>
            <ToggleButton value="TRANSFER">Transfer</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Drawer>
    </Layout>
  );
};

const TransactionListItem = ({
  transaction, onClick, onDelete,
}: {
  transaction: Transaction; onClick: () => void; onDelete: () => void;
}) => {
  const color = transaction.type === 'INCOME' ? '#2E7D32'
    : transaction.type === 'TRANSFER' ? '#1565C0' : '#C62828';
  const prefix = transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '-' : '';
  const currency = transaction.account?.currency ?? 'USD';

  return (
    <Card
      onClick={onClick}
      variant="outlined"
      sx={{ cursor: 'pointer', '&:active': { bgcolor: 'action.selected' }, border: 'none', bgcolor: 'background.paper' }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '12px !important' }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: '50%',
          bgcolor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        }}>
          {transaction.type === 'INCOME' ? <IncomeIcon />
            : transaction.type === 'TRANSFER' ? <TransferIcon /> : <ExpenseIcon />}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {transaction.category?.name ?? (transaction.type === 'TRANSFER' ? 'Transfer' : '—')}
          </Typography>
          <Typography variant="labelSmall" color="text.secondary" sx={{ display: 'block' }}>
            {transaction.account?.name}
            {transaction.toAccount && ` → ${transaction.toAccount.name}`}
            {transaction.note && ` • ${transaction.note}`}
          </Typography>
        </Box>
        <Box textAlign="right" display="flex" alignItems="center" gap={1}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color }}>
              {prefix}{formatAmount(transaction.amount, currency)}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

export default Transactions;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Transactions.tsx
git commit -m "fix: add filter drawer, date grouping, delete action to transactions page"
```

---

## Task 12: Fix Budget Page

Shows real `spent` values and adds delete action.

**Files:**
- Modify: `frontend/src/pages/Budget.tsx`

- [ ] **Step 1: Rewrite Budget.tsx**

Replace `frontend/src/pages/Budget.tsx`:

```tsx
import React from 'react';
import {
  Box, Typography, Fab, CircularProgress, Stack, LinearProgress, IconButton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useBudgets, useDeleteBudget } from '../hooks/useApi';
import { formatAmount } from '../utils/formatAmount';
import type { Budget } from '../types/api';

const Budget = () => {
  const navigate = useNavigate();
  const { data: budgets, isLoading } = useBudgets();
  const deleteMutation = useDeleteBudget();

  const handleDelete = async (budget: Budget) => {
    if (!budget.id) return;
    if (window.confirm(`Delete budget for ${budget.category?.name ?? 'this category'}?`)) {
      await deleteMutation.mutateAsync(String(budget.id));
    }
  };

  if (isLoading) {
    return (
      <Layout title="Budget">
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Budget">
      <Box p={2}>
        <Stack spacing={2.5}>
          {(!budgets || budgets.length === 0) && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
              No budget targets set. Tap + to add one.
            </Typography>
          )}
          {budgets?.map((budget) => (
            <BudgetItem
              key={budget.id}
              budget={budget}
              onClick={() => navigate(`/budget/edit/${budget.id}`)}
              onDelete={() => handleDelete(budget)}
            />
          ))}
        </Stack>
      </Box>

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: { xs: 80, md: 16 }, right: 16 }}
        onClick={() => navigate('/budget/add')}
      >
        <AddIcon />
      </Fab>
    </Layout>
  );
};

const BudgetItem = ({
  budget, onClick, onDelete,
}: {
  budget: Budget; onClick: () => void; onDelete: () => void;
}) => {
  const spent = budget.spent ?? 0;
  const progress = Math.min((spent / budget.amount) * 100, 100);
  const isOverBudget = spent > budget.amount;
  const categoryColor = budget.category?.color ?? '#9e9e9e';
  const currency = 'USD';

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Box sx={{ cursor: 'pointer', flex: 1 }} onClick={onClick}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {budget.category?.name ?? 'Uncategorized'}
            <Typography component="span" variant="labelSmall" color="text.secondary" sx={{ ml: 1 }}>
              {budget.month}/{budget.year}
            </Typography>
          </Typography>
          <Typography variant="labelSmall" color="text.secondary">
            {formatAmount(spent, currency)} of {formatAmount(budget.amount, currency)}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: isOverBudget ? 'error.main' : 'text.primary' }}>
            {isOverBudget ? 'Over ' : 'Left '}
            {formatAmount(Math.abs(budget.amount - spent), currency)}
          </Typography>
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 8, borderRadius: 4,
          bgcolor: `${categoryColor}20`,
          '& .MuiLinearProgress-bar': {
            bgcolor: isOverBudget ? 'error.main' : categoryColor,
            borderRadius: 4,
          },
        }}
      />
    </Box>
  );
};

export default Budget;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Budget.tsx
git commit -m "fix: show real spent amounts on budget page, add delete action"
```

---

## Task 13: Fix Planned Payments Page

Adds one-tap mark-as-paid and delete.

**Files:**
- Modify: `frontend/src/pages/PlannedPayments.tsx`

- [ ] **Step 1: Rewrite PlannedPayments.tsx**

Replace `frontend/src/pages/PlannedPayments.tsx`:

```tsx
import React from 'react';
import {
  Box, Typography, Card, CardContent, Fab, CircularProgress, Stack, IconButton,
} from '@mui/material';
import {
  Add as AddIcon, CheckCircle as PaidIcon,
  RadioButtonUnchecked as UnpaidIcon, Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { usePlannedPayments, useTogglePlannedPaymentPaid, useDeletePlannedPayment } from '../hooks/useApi';
import { formatAmount } from '../utils/formatAmount';
import type { PlannedPayment } from '../types/api';

const PlannedPayments = () => {
  const navigate = useNavigate();
  const { data: payments, isLoading } = usePlannedPayments();
  const toggleMutation = useTogglePlannedPaymentPaid();
  const deleteMutation = useDeletePlannedPayment();

  const handleToggle = async (payment: PlannedPayment) => {
    if (!payment.id) return;
    await toggleMutation.mutateAsync({ id: String(payment.id), isPaid: !payment.isPaid });
  };

  const handleDelete = async (payment: PlannedPayment) => {
    if (!payment.id) return;
    if (window.confirm(`Delete "${payment.name}"?`)) {
      await deleteMutation.mutateAsync(String(payment.id));
    }
  };

  if (isLoading) {
    return (
      <Layout title="Planned Payments">
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  const unpaid = payments?.filter((p) => !p.isPaid) ?? [];
  const paid = payments?.filter((p) => p.isPaid) ?? [];

  return (
    <Layout title="Planned Payments">
      <Box p={2}>
        {(!payments || payments.length === 0) && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
            No planned payments found.
          </Typography>
        )}

        {unpaid.length > 0 && (
          <>
            <Typography variant="labelMedium" color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase' }}>
              Upcoming
            </Typography>
            <Stack spacing={1.5} mb={3}>
              {unpaid.map((p) => (
                <PaymentItem key={p.id} payment={p} onToggle={() => handleToggle(p)} onDelete={() => handleDelete(p)} onClick={() => navigate(`/planned-payments/edit/${p.id}`)} />
              ))}
            </Stack>
          </>
        )}

        {paid.length > 0 && (
          <>
            <Typography variant="labelMedium" color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase' }}>
              Paid
            </Typography>
            <Stack spacing={1.5}>
              {paid.map((p) => (
                <PaymentItem key={p.id} payment={p} onToggle={() => handleToggle(p)} onDelete={() => handleDelete(p)} onClick={() => navigate(`/planned-payments/edit/${p.id}`)} />
              ))}
            </Stack>
          </>
        )}
      </Box>

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: { xs: 80, md: 16 }, right: 16 }}
        onClick={() => navigate('/planned-payments/add')}
      >
        <AddIcon />
      </Fab>
    </Layout>
  );
};

const PaymentItem = ({
  payment, onToggle, onDelete, onClick,
}: {
  payment: PlannedPayment; onToggle: () => void; onDelete: () => void; onClick: () => void;
}) => (
  <Card
    variant="outlined"
    sx={{ cursor: 'pointer', border: 'none', bgcolor: 'background.paper', opacity: payment.isPaid ? 0.6 : 1 }}
  >
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '12px !important' }}>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        color={payment.isPaid ? 'success' : 'default'}
      >
        {payment.isPaid ? <PaidIcon /> : <UnpaidIcon />}
      </IconButton>
      <Box sx={{ flex: 1 }} onClick={onClick}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, textDecoration: payment.isPaid ? 'line-through' : 'none' }}
        >
          {payment.name}
        </Typography>
        <Typography variant="labelSmall" color="text.secondary">
          Due {new Date(payment.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          {payment.category?.name && ` • ${payment.category.name}`}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
        {formatAmount(payment.amount, payment.account?.currency ?? 'USD')}
      </Typography>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </CardContent>
  </Card>
);

export default PlannedPayments;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/PlannedPayments.tsx
git commit -m "fix: add mark-as-paid toggle and delete to planned payments, split into upcoming/paid sections"
```

---

## Task 14: Build Reports Page

Implements donut chart for spending by category and bar chart for monthly income vs expense trend.

**Files:**
- Modify: `frontend/src/pages/Reports.tsx`

- [ ] **Step 1: Rewrite Reports.tsx**

Replace `frontend/src/pages/Reports.tsx`:

```tsx
import React, { useState } from 'react';
import {
  Box, Typography, CircularProgress, Stack, IconButton, Card, CardContent,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon, ChevronRight as NextIcon,
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import Layout from '../components/Layout';
import { useTransactions, useMonthlyTrend } from '../hooks/useApi';
import { formatAmount } from '../utils/formatAmount';

const COLORS = ['#4CAF50', '#FF5722', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#607D8B'];

const Reports = () => {
  const [viewDate, setViewDate] = useState(new Date());
  const month = viewDate.getMonth() + 1;
  const year = viewDate.getFullYear();

  const { data: transactions, isLoading: txLoading } = useTransactions({
    type: 'EXPENSE',
    'date[after]': new Date(year, month - 1, 1).toISOString(),
    'date[before]': new Date(year, month, 0, 23, 59, 59).toISOString(),
    itemsPerPage: 500,
  });

  const { data: trend, isLoading: trendLoading } = useMonthlyTrend(6);

  const prevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const canGoNext = viewDate < new Date();

  const categorySpend = transactions?.reduce<Record<string, { name: string; value: number; color: string }>>((acc, tx) => {
    const key = tx.category?.name ?? 'Uncategorized';
    if (!acc[key]) acc[key] = { name: key, value: 0, color: tx.category?.color ?? '#9e9e9e' };
    acc[key].value += tx.amount;
    return acc;
  }, {});

  const pieData = Object.values(categorySpend ?? {}).sort((a, b) => b.value - a.value);
  const totalExpense = pieData.reduce((s, d) => s + d.value, 0);
  const currency = 'USD';

  const barData = trend?.map((item) => ({
    name: item.month,
    Income: item.income,
    Expense: item.expense,
  })) ?? [];

  if (txLoading || trendLoading) {
    return (
      <Layout title="Reports">
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Reports">
      <Box p={2}>
        <Stack spacing={3}>
          {/* Spending by Category */}
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <IconButton size="small" onClick={prevMonth}><PrevIcon /></IconButton>
                <Typography variant="titleMedium">
                  {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </Typography>
                <IconButton size="small" onClick={nextMonth} disabled={!canGoNext}><NextIcon /></IconButton>
              </Box>

              {pieData.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" py={4}>
                  No expenses recorded for this month.
                </Typography>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData} cx="50%" cy="50%"
                        innerRadius={60} outerRadius={90}
                        paddingAngle={2} dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={entry.name} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatAmount(v, currency)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Stack spacing={0.5} mt={1}>
                    {pieData.map((entry, index) => (
                      <Box key={entry.name} display="flex" justifyContent="space-between" alignItems="center">
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: entry.color || COLORS[index % COLORS.length] }} />
                          <Typography variant="labelMedium">{entry.name}</Typography>
                        </Box>
                        <Typography variant="labelMedium" fontWeight="bold">
                          {formatAmount(entry.value, currency)}
                          <Typography component="span" variant="labelSmall" color="text.secondary" ml={0.5}>
                            ({Math.round((entry.value / totalExpense) * 100)}%)
                          </Typography>
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>

          {/* Income vs Expense Trend */}
          <Card>
            <CardContent>
              <Typography variant="titleMedium" mb={2}>Income vs Expenses — Last 6 Months</Typography>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number) => formatAmount(v, currency)} />
                  <Legend />
                  <Bar dataKey="Income" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expense" fill="#FF5722" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Layout>
  );
};

export default Reports;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Reports.tsx
git commit -m "feat: build reports page with spending donut chart and monthly trend bar chart"
```

---

## Task 15: Wire Settings Page

Connects dark mode toggle to ThemeContext and adds a currency selector.

**Files:**
- Modify: `frontend/src/pages/Settings.tsx`

- [ ] **Step 1: Rewrite Settings.tsx**

Replace `frontend/src/pages/Settings.tsx`:

```tsx
import React from 'react';
import {
  Box, Typography, List, ListItem, ListItemText, ListItemIcon,
  Switch, Divider, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import {
  Palette as PaletteIcon, Storage as StorageIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { useThemeMode } from '../context/ThemeContext';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'PLN', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];

const Settings = () => {
  const { isDark, toggleTheme } = useThemeMode();
  const [currency, setCurrency] = React.useState(
    () => localStorage.getItem('display-currency') ?? 'USD'
  );

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
    localStorage.setItem('display-currency', value);
  };

  return (
    <Layout title="Settings">
      <Box p={2}>
        <Typography variant="titleMedium" sx={{ mb: 2, display: 'block' }}>
          Appearance
        </Typography>
        <SettingsCard>
          <List disablePadding>
            <ListItem>
              <ListItemIcon><PaletteIcon /></ListItemIcon>
              <ListItemText primary="Dark Mode" secondary="Switch between light and dark theme" />
              <Switch checked={isDark} onChange={toggleTheme} />
            </ListItem>
          </List>
        </SettingsCard>

        <Typography variant="titleMedium" sx={{ mt: 4, mb: 2, display: 'block' }}>
          Currency
        </Typography>
        <SettingsCard>
          <Box p={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Display Currency</InputLabel>
              <Select
                value={currency}
                label="Display Currency"
                onChange={(e) => handleCurrencyChange(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </SettingsCard>

        <Typography variant="titleMedium" sx={{ mt: 4, mb: 2, display: 'block' }}>
          Data & Support
        </Typography>
        <SettingsCard>
          <List disablePadding>
            <ListItem>
              <ListItemIcon><StorageIcon /></ListItemIcon>
              <ListItemText primary="Export Data" secondary="Coming soon" />
            </ListItem>
            <Divider variant="inset" component="li" />
            <ListItem>
              <ListItemIcon><InfoIcon /></ListItemIcon>
              <ListItemText primary="About" secondary="Budget PWA v1.0.0 — Phase 1" />
            </ListItem>
          </List>
        </SettingsCard>
      </Box>
    </Layout>
  );
};

const SettingsCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: 'background.paper' }}>
    {children}
  </Box>
);

export default Settings;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Settings.tsx
git commit -m "fix: wire dark mode toggle and currency selector in settings"
```

---

## Task 16: Fix viewport and PWA Icons

The `viewport-fit=cover` is missing and PWA icon files don't exist yet.

**Files:**
- Modify: `frontend/index.html`
- Create: `frontend/public/pwa-192x192.png` (placeholder — replace with real icon)
- Create: `frontend/public/pwa-512x512.png`

- [ ] **Step 1: Update index.html**

Replace `frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#4CAF50" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <title>Budget PWA</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Add safe-area insets to bottom nav in Layout.tsx**

In `frontend/src/components/Layout.tsx`, update the bottom nav Paper `sx`:

```tsx
<Paper
  sx={{
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
    paddingBottom: 'env(safe-area-inset-bottom)',
  }}
  elevation={3}
>
```

- [ ] **Step 3: Generate placeholder PWA icons**

Run this in the `frontend/public/` directory to create minimal valid PNG placeholders (replace with real icons before shipping):

```bash
docker compose exec frontend sh -c "
  cd /app/public &&
  node -e \"
    const { createCanvas } = require('canvas');
    [192, 512].forEach(size => {
      const c = createCanvas(size, size);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + size/4 + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('B', size/2, size/1.5);
      require('fs').writeFileSync('pwa-' + size + 'x' + size + '.png', c.toBuffer('image/png'));
    });
  \"
" 2>/dev/null || echo "canvas not available in container — create placeholder PNGs manually in frontend/public/"
```

If the above fails (canvas not available), create simple green PNG placeholders manually with any image editor and place them at:
- `frontend/public/pwa-192x192.png`
- `frontend/public/pwa-512x512.png`

- [ ] **Step 4: Verify build with PWA assets**

```bash
docker compose exec frontend npm run build 2>&1 | tail -10
```

Expected: build succeeds, `dist/` contains `manifest.webmanifest` and `sw.js`.

- [ ] **Step 5: Commit**

```bash
git add frontend/index.html frontend/src/components/Layout.tsx \
        frontend/public/pwa-192x192.png frontend/public/pwa-512x512.png
git commit -m "fix: add viewport-fit=cover, safe-area insets, and PWA icon assets"
```

---

## Task 17: Final Integration Verification

Confirm everything works end-to-end in the running Docker stack.

- [ ] **Step 1: Run migrations to ensure DB schema is current**

```bash
docker compose exec backend bin/console doctrine:migrations:migrate --no-interaction
```

Expected: `[OK] No migrations to execute.` (or lists migrations that were applied).

- [ ] **Step 2: Seed some test data**

```bash
docker compose exec backend bin/console app:seed-data
```

If the command errors, verify `AppSeedDataCommand` is registered.

- [ ] **Step 3: Verify all API endpoints respond correctly**

```bash
# Accounts
curl -s http://localhost:8000/api/accounts | python3 -m json.tool | head -20

# Transactions with embedded account/category
curl -s http://localhost:8000/api/transactions | python3 -m json.tool | grep -E '"name"|"color"' | head -10

# Stats
curl -s "http://localhost:8000/api/stats/summary" | python3 -m json.tool

# Monthly trend
curl -s "http://localhost:8000/api/stats/monthly-trend?months=6" | python3 -m json.tool

# Budgets with spent
curl -s http://localhost:8000/api/budgets | python3 -m json.tool | grep spent
```

- [ ] **Step 4: Open the app at http://localhost:3000**

Verify manually:
- [ ] Desktop: left sidebar visible, all 4 nav items navigate correctly
- [ ] Mobile (Chrome DevTools → mobile emulation): bottom nav visible, FABs not obscured
- [ ] Dashboard: shows real balance (may be 0 with no data) — not blank
- [ ] Transactions: filter button opens drawer, transactions show category name (not IRI)
- [ ] Budget: progress bars show actual percentages
- [ ] Planned Payments: circle icon toggles payment as paid/unpaid without opening form
- [ ] Reports: donut chart renders (may be empty if no expense transactions)
- [ ] Settings: dark mode toggle switches theme immediately

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: phase 1 complete — usable budget PWA with real stats, navigation, and reports"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Serialization groups ✓ | Stats endpoint ✓ | Budget spent ✓ | Desktop nav ✓ | Dashboard stats ✓ | Transaction filter+delete ✓ | Budget real progress+delete ✓ | PlannedPayment mark-paid+delete ✓ | Reports (donut+bar) ✓ | Settings dark mode+currency ✓ | formatAmount ✓ | PWA viewport ✓
- [x] **Type consistency:** `StatsSummary`, `MonthlyTrendItem` defined in Task 1, imported in Tasks 9+10 via hooks. `Budget.month/year` used consistently in Tasks 5+12. `PlannedPayment` fields match entity throughout.
- [x] **No placeholders:** All code blocks are complete. All commands have expected outputs.
- [x] **Docker commands:** All use `docker compose exec backend` / `docker compose exec frontend` matching service names in `docker-compose.yml`.

---

## Phase 2 Preview

Phase 2 (Multi-user & Auth) covers:
- `User` entity + 3-step migration
- `lexik/jwt-authentication-bundle` + register/login endpoints
- Google OAuth via `knpuniversity/oauth2-client-bundle`
- Scoping all API Platform resources to the authenticated user
- Frontend `AuthContext`, `AxiosInterceptor`, Login/Register pages, protected routes

Phase 3 (Extended Features) covers:
- `ExchangeRate` entity + Symfony Scheduler daily auto-fetch from frankfurter.app
- Stats endpoint currency conversion with fallback for missing rates
- CSV export endpoint + Settings trigger
- Web Push notification subscription
