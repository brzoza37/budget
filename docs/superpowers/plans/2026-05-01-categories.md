# Categories Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed default categories on registration, add a categories entry point in the Transactions toolbar, improve the categories list/form with icon picker and archive, and make category optional when adding transactions.

**Architecture:** Backend creates two default categories (General + Salary) on every user registration. The frontend Categories page gains icon rendering, archive action, and i18n. AddEditCategory gains an icon picker. AddEditTransaction makes category optional and filters archived categories.

**Tech Stack:** Symfony 7 (PHP), React 18, TypeScript, MUI, React Query, API Platform. All commands via `docker compose exec`.

---

## File Map

| File | Change |
|---|---|
| `backend/src/Controller/AuthController.php` | Create default categories in `register()` |
| `backend/tests/Controller/AuthControllerTest.php` | Test default categories are created |
| `frontend/src/i18n/en.json` | Add categories i18n keys |
| `frontend/src/i18n/pl.json` | Add categories i18n keys |
| `frontend/src/pages/Transactions.tsx` | Add categories icon button to toolbar |
| `frontend/src/hooks/useApi.ts` | Add `useArchiveCategory` PATCH hook |
| `frontend/src/pages/Categories.tsx` | Icon rendering, archive, i18n, filter archived |
| `frontend/src/pages/AddEditCategory.tsx` | Icon picker, save icon, i18n |
| `frontend/src/pages/AddEditTransaction.tsx` | Category optional, filter archived, fix empty payload |

---

## Task 1: Default categories on registration (backend)

**Files:**
- Modify: `backend/src/Controller/AuthController.php`
- Modify: `backend/tests/Controller/AuthControllerTest.php`

- [ ] **Step 1: Write failing test**

Add this test at the end of `AuthControllerTest.php`, before the closing `}`:

```php
public function testRegisterCreatesDefaultCategories(): void
{
    $client = static::createClient();
    $this->jsonPost($client, '/api/auth/register', [
        'email' => 'defaults@example.com',
        'password' => self::VALID_PASSWORD,
        'displayName' => 'Default User',
    ]);
    $this->assertResponseStatusCodeSame(201);
    $token = json_decode($client->getResponse()->getContent(), true)['token'];

    $client->request(
        'GET', '/api/categories', [], [],
        ['HTTP_AUTHORIZATION' => "Bearer $token"]
    );
    $this->assertResponseIsSuccessful();
    $data = json_decode($client->getResponse()->getContent(), true);
    $members = $data['hydra:member'];
    $this->assertCount(2, $members);

    $names = array_column($members, 'name');
    $this->assertContains('General', $names);
    $this->assertContains('Salary', $names);

    $types = array_column($members, 'type');
    $this->assertContains('EXPENSE', $types);
    $this->assertContains('INCOME', $types);
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose exec backend sh -c "cd /var/www/html && APP_ENV=test php bin/phpunit --filter testRegisterCreatesDefaultCategories 2>&1"
```

Expected: FAIL — 0 categories returned.

- [ ] **Step 3: Add Category import and create defaults in register()**

Add `use App\Entity\Category;` to the imports at the top of `backend/src/Controller/AuthController.php` (after the existing `use App\Entity\User;` line):

```php
use App\Entity\Category;
```

Then, in the `register()` method, replace the block:

```php
        $em->persist($user);
        $em->flush();

        return $this->json([
```

with:

```php
        $em->persist($user);

        $generalCategory = (new Category())
            ->setName('General')
            ->setType('EXPENSE')
            ->setColor('#9E9E9E')
            ->setIcon('category')
            ->setUser($user);

        $salaryCategory = (new Category())
            ->setName('Salary')
            ->setType('INCOME')
            ->setColor('#4CAF50')
            ->setIcon('payments')
            ->setUser($user);

        $em->persist($generalCategory);
        $em->persist($salaryCategory);

        $em->flush();

        return $this->json([
```

- [ ] **Step 4: Run all backend tests**

```bash
docker compose exec backend sh -c "cd /var/www/html && APP_ENV=test php bin/phpunit 2>&1"
```

Expected: all pass (was 25, now 26).

- [ ] **Step 5: Seed defaults for existing users**

```bash
docker compose exec db psql -U user -d budget -c "
INSERT INTO category (name, type, color, icon, is_archived, created_at, updated_at, user_id)
SELECT 'General', 'EXPENSE', '#9E9E9E', 'category', false, NOW(), NOW(), u.id
FROM \"user\" u
WHERE NOT EXISTS (SELECT 1 FROM category c WHERE c.user_id = u.id);

INSERT INTO category (name, type, color, icon, is_archived, created_at, updated_at, user_id)
SELECT 'Salary', 'INCOME', '#4CAF50', 'payments', false, NOW(), NOW(), u.id
FROM \"user\" u
WHERE NOT EXISTS (SELECT 1 FROM category c WHERE c.user_id = u.id AND c.name = 'Salary');
" 2>&1
```

Expected: `INSERT 0 2` or `INSERT 0 1` per statement (inserts for users with no categories).

- [ ] **Step 6: Commit**

```bash
git add backend/src/Controller/AuthController.php backend/tests/Controller/AuthControllerTest.php
git commit -m "feat: create default General/Salary categories on user registration"
```

---

## Task 2: i18n keys for categories

**Files:**
- Modify: `frontend/src/i18n/en.json`
- Modify: `frontend/src/i18n/pl.json`

- [ ] **Step 1: Add keys to en.json**

Add a `"categories"` section after `"accounts"`:

```json
  "categories": {
    "title": "Categories",
    "expenses": "Expenses",
    "income": "Income",
    "addCategory": "Add Category",
    "editCategory": "Edit Category",
    "saveCategory": "Save Category",
    "updateCategory": "Update Category",
    "categoryName": "Category Name",
    "categoryNamePlaceholder": "e.g. Food, Salary, Gift",
    "categoryColor": "Category Color",
    "categoryIcon": "Icon",
    "noCategories": "No categories yet.",
    "archiveCategory": "Archive",
    "typeExpense": "Expense",
    "typeIncome": "Income"
  },
```

- [ ] **Step 2: Add keys to pl.json**

Add the same section to `pl.json`:

```json
  "categories": {
    "title": "Kategorie",
    "expenses": "Wydatki",
    "income": "Przychody",
    "addCategory": "Dodaj kategorię",
    "editCategory": "Edytuj kategorię",
    "saveCategory": "Zapisz kategorię",
    "updateCategory": "Zaktualizuj kategorię",
    "categoryName": "Nazwa kategorii",
    "categoryNamePlaceholder": "np. Jedzenie, Wynagrodzenie, Prezent",
    "categoryColor": "Kolor kategorii",
    "categoryIcon": "Ikona",
    "noCategories": "Brak kategorii.",
    "archiveCategory": "Archiwizuj",
    "typeExpense": "Wydatek",
    "typeIncome": "Przychód"
  },
```

- [ ] **Step 3: Verify TypeScript still compiles**

```bash
docker compose exec frontend sh -c "cd /app && npx tsc --noEmit 2>&1"
```

Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/i18n/en.json frontend/src/i18n/pl.json
git commit -m "feat: add i18n keys for categories management"
```

---

## Task 3: Categories entry point in Transactions toolbar

**Files:**
- Modify: `frontend/src/pages/Transactions.tsx`

- [ ] **Step 1: Add Sell icon import and navigate to categories**

In `Transactions.tsx`, add `Sell as CategoriesIcon` to the MUI icons import:

```tsx
import {
  Add as AddIcon, FilterList as FilterIcon, Sell as CategoriesIcon,
} from '@mui/icons-material';
```

- [ ] **Step 2: Add the icon button to the toolbar**

Find the block with the Export and Filter icon buttons (around line 98-103) and add the categories button before them:

```tsx
          <IconButton onClick={() => navigate('/categories')} aria-label="Manage categories">
            <CategoriesIcon />
          </IconButton>
          <IconButton onClick={handleExport} disabled={exporting} title={t('transactions.exportCsv')} aria-label={t('transactions.exportCsv')}>
```

(Add it immediately before the export IconButton, keeping the filter button last.)

- [ ] **Step 3: Verify TypeScript compiles**

```bash
docker compose exec frontend sh -c "cd /app && npx tsc --noEmit 2>&1"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Transactions.tsx
git commit -m "feat: add categories icon button to transactions toolbar"
```

---

## Task 4: useArchiveCategory hook

**Files:**
- Modify: `frontend/src/hooks/useApi.ts`

- [ ] **Step 1: Add useArchiveCategory after useUpdateCategory**

Find `useDeleteCategory` in `useApi.ts` and add the archive hook immediately before it:

```ts
export const useArchiveCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch<Category>(`/categories/${id}`, { isArchived: true }, {
        headers: { 'Content-Type': 'application/merge-patch+json' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
docker compose exec frontend sh -c "cd /app && npx tsc --noEmit 2>&1"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useApi.ts
git commit -m "feat: add useArchiveCategory hook"
```

---

## Task 5: Categories page — icon rendering, archive, i18n, filter archived

**Files:**
- Modify: `frontend/src/pages/Categories.tsx`

- [ ] **Step 1: Replace the full file content**

```tsx
import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, IconButton,
  Fab, CircularProgress, Stack, Avatar, Tabs, Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Archive as ArchiveIcon,
  Restaurant as RestaurantIcon,
  Home as HomeIcon,
  DirectionsCar as DirectionsCarIcon,
  ShoppingCart as ShoppingCartIcon,
  LocalHospital as LocalHospitalIcon,
  School as SchoolIcon,
  FitnessCenter as FitnessCenterIcon,
  Flight as FlightIcon,
  Movie as MovieIcon,
  Category as CategoryIcon,
  Payments as PaymentsIcon,
  MoreHoriz as MoreHorizIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { useCategories, useArchiveCategory } from '../hooks/useApi';
import { Category } from '../types/api';

export const ICON_MAP: Record<string, React.ElementType> = {
  restaurant: RestaurantIcon,
  home: HomeIcon,
  directions_car: DirectionsCarIcon,
  shopping_cart: ShoppingCartIcon,
  local_hospital: LocalHospitalIcon,
  school: SchoolIcon,
  fitness_center: FitnessCenterIcon,
  flight: FlightIcon,
  movie: MovieIcon,
  category: CategoryIcon,
  payments: PaymentsIcon,
  more_horiz: MoreHorizIcon,
};

const Categories = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const { data: categories, isLoading } = useCategories();
  const archiveMutation = useArchiveCategory();

  const filteredCategories = categories?.filter(c =>
    !c.isArchived && (tab === 0 ? c.type === 'EXPENSE' : c.type === 'INCOME')
  ) || [];

  if (isLoading) {
    return (
      <Layout title={t('categories.title')}>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title={t('categories.title')}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab label={t('categories.expenses')} />
          <Tab label={t('categories.income')} />
        </Tabs>
      </Box>
      <Box p={2}>
        {filteredCategories.length === 0 && (
          <Typography color="text.secondary" textAlign="center" mt={4}>
            {t('categories.noCategories')}
          </Typography>
        )}
        <Stack spacing={1.5}>
          {filteredCategories.map((category) => (
            <CategoryListItem
              key={category.id}
              category={category}
              onClick={() => navigate(`/categories/edit/${category.id}`)}
              onArchive={() => archiveMutation.mutate(String(category.id))}
            />
          ))}
        </Stack>
      </Box>

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: { xs: 80, md: 16 }, right: 16 }}
        onClick={() => navigate('/categories/add')}
      >
        <AddIcon />
      </Fab>
    </Layout>
  );
};

const CategoryListItem = ({
  category,
  onClick,
  onArchive,
}: {
  category: Category;
  onClick: () => void;
  onArchive: () => void;
}) => {
  const { t } = useTranslation();
  const IconComponent = ICON_MAP[category.icon ?? 'category'] ?? CategoryIcon;

  return (
    <Card
      variant="outlined"
      sx={{ border: 'none', bgcolor: 'background.paper' }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '12px !important' }}>
        <Avatar
          onClick={onClick}
          sx={{ bgcolor: `${category.color}20`, color: category.color, width: 44, height: 44, cursor: 'pointer' }}
        >
          <IconComponent />
        </Avatar>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, flex: 1, cursor: 'pointer' }}
          onClick={onClick}
        >
          {category.name}
        </Typography>
        <IconButton
          size="small"
          onClick={onArchive}
          aria-label={t('categories.archiveCategory')}
          sx={{ color: 'text.disabled' }}
        >
          <ArchiveIcon fontSize="small" />
        </IconButton>
      </CardContent>
    </Card>
  );
};

export default Categories;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
docker compose exec frontend sh -c "cd /app && npx tsc --noEmit 2>&1"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Categories.tsx
git commit -m "feat: improve categories page with icon rendering, archive action and i18n"
```

---

## Task 6: AddEditCategory — icon picker, save icon, i18n

**Files:**
- Modify: `frontend/src/pages/AddEditCategory.tsx`

- [ ] **Step 1: Replace the full file content**

```tsx
import React, { useState, useEffect } from 'react';
import {
  Box, IconButton, Stack, TextField, Button,
  CircularProgress, ToggleButtonGroup, ToggleButton, Typography, Avatar,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Check as SaveIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { useCategory, useCreateCategory, useUpdateCategory } from '../hooks/useApi';
import { ICON_MAP } from './Categories';

const COLORS = ['#9E9E9E', '#F44336', '#E91E63', '#9C27B0', '#2196F3', '#4CAF50', '#FF9800', '#795548'];
const ICONS = Object.keys(ICON_MAP);

const AddEditCategory = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const { data: category, isLoading } = useCategory(id);
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory(id || '');

  const [name, setName] = useState('');
  const [type, setType] = useState('EXPENSE');
  const [color, setColor] = useState('#9E9E9E');
  const [icon, setIcon] = useState('category');

  useEffect(() => {
    if (category) {
      setName(category.name);
      setType(category.type);
      setColor(category.color);
      setIcon(category.icon ?? 'category');
    }
  }, [category]);

  const handleSave = async () => {
    const payload = { name, type: type as 'INCOME' | 'EXPENSE', color, icon };
    if (isEdit) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
    navigate(-1);
  };

  if (isLoading) {
    return (
      <Layout title={isEdit ? t('categories.editCategory') : t('categories.addCategory')}>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout
      title={isEdit ? t('categories.editCategory') : t('categories.addCategory')}
      navigationIcon={<IconButton onClick={() => navigate(-1)}><ArrowBackIcon /></IconButton>}
      actions={
        <IconButton onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
          <SaveIcon />
        </IconButton>
      }
    >
      <Box p={2}>
        <Stack spacing={3}>
          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={(_, v) => v && setType(v)}
            fullWidth
            color="primary"
          >
            <ToggleButton value="EXPENSE">{t('categories.typeExpense')}</ToggleButton>
            <ToggleButton value="INCOME">{t('categories.typeIncome')}</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label={t('categories.categoryName')}
            variant="outlined"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('categories.categoryNamePlaceholder')}
          />

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {t('categories.categoryColor')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
              {COLORS.map((c) => (
                <Box
                  key={c}
                  onClick={() => setColor(c)}
                  sx={{
                    width: 36, height: 36, bgcolor: c, borderRadius: 1, cursor: 'pointer',
                    border: color === c ? '3px solid white' : 'none',
                    boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                  }}
                />
              ))}
            </Box>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {t('categories.categoryIcon')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
              {ICONS.map((iconName) => {
                const IconComponent = ICON_MAP[iconName];
                return (
                  <Avatar
                    key={iconName}
                    onClick={() => setIcon(iconName)}
                    sx={{
                      width: 40, height: 40, cursor: 'pointer',
                      bgcolor: icon === iconName ? `${color}30` : 'action.hover',
                      color: icon === iconName ? color : 'text.secondary',
                      border: icon === iconName ? `2px solid ${color}` : '2px solid transparent',
                    }}
                  >
                    <IconComponent fontSize="small" />
                  </Avatar>
                );
              })}
            </Box>
          </Box>

          <Button
            variant="contained"
            size="large"
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending || !name.trim()}
            sx={{ mt: 2, height: 56, borderRadius: 3 }}
          >
            {isEdit ? t('categories.updateCategory') : t('categories.saveCategory')}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
};

export default AddEditCategory;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
docker compose exec frontend sh -c "cd /app && npx tsc --noEmit 2>&1"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/AddEditCategory.tsx
git commit -m "feat: add icon picker, i18n and icon persistence to AddEditCategory"
```

---

## Task 7: AddEditTransaction — category optional, filter archived

**Files:**
- Modify: `frontend/src/pages/AddEditTransaction.tsx`

- [ ] **Step 1: Filter archived categories and add None option**

In `AddEditTransaction.tsx`, replace the `filteredCategories` line:

```ts
  const filteredCategories = categories?.filter(c => c.type === (type === 'TRANSFER' ? 'EXPENSE' : type)) || [];
```

with:

```ts
  const filteredCategories = categories?.filter(
    c => !c.isArchived && c.type === (type === 'TRANSFER' ? 'EXPENSE' : type)
  ) || [];
```

- [ ] **Step 2: Fix the category payload to not send empty string**

Replace in `handleSave`:

```ts
      category: type === 'TRANSFER' ? undefined : categoryId,
```

with:

```ts
      category: type === 'TRANSFER' ? undefined : (categoryId || undefined),
```

- [ ] **Step 3: Add a "None" option to the category picker**

Replace the category `TextField` block:

```tsx
          {type === 'TRANSFER' ? (
            <TextField
              select
              label="To Account"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              fullWidth
            >
              {accounts?.filter(a => a['@id'] !== accountId).map((option) => (
                <MenuItem key={option['@id']} value={option['@id']}>
                  {option.name}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              select
              label="Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              fullWidth
              disabled={filteredCategories.length === 0}
            >
              {filteredCategories.map((option) => (
                <MenuItem key={option['@id']} value={option['@id']}>
                  {option.name}
                </MenuItem>
              ))}
            </TextField>
          )}
```

with:

```tsx
          {type === 'TRANSFER' ? (
            <TextField
              select
              label="To Account"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              fullWidth
            >
              {accounts?.filter(a => a['@id'] !== accountId).map((option) => (
                <MenuItem key={option['@id']} value={option['@id']}>
                  {option.name}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              select
              label="Category (optional)"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              fullWidth
            >
              <MenuItem value="">— None —</MenuItem>
              {filteredCategories.map((option) => (
                <MenuItem key={option['@id']} value={option['@id']}>
                  {option.name}
                </MenuItem>
              ))}
            </TextField>
          )}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
docker compose exec frontend sh -c "cd /app && npx tsc --noEmit 2>&1"
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/AddEditTransaction.tsx
git commit -m "feat: make category optional in transaction form and filter archived categories"
```
