# Categories Management — Design Spec

**Date:** 2026-05-01

## Overview

Allow users to manage their expense and income categories, and ensure the app works out of the box with sensible defaults. Category selection when adding a transaction becomes optional — "General" is the fallback shown when no category is assigned.

## What Already Exists

- `Category` entity with full CRUD via API Platform (`/api/categories`)
- `Categories.tsx` page (basic list with tabs, FAB to add)
- `AddEditCategory.tsx` page (add/edit form)
- Routes wired in `App.tsx`: `/categories`, `/categories/add`, `/categories/edit/:id`

## What Needs Building

### 1. Default categories on registration (backend)

`AuthController::register()` creates two default categories for every new user immediately after the user is persisted:

| Name | Type | Color | Icon |
|---|---|---|---|
| General | EXPENSE | `#9E9E9E` | `category` |
| Salary | INCOME | `#4CAF50` | `payments` |

One-off: insert the same two defaults for existing users who currently have zero categories (SQL run immediately as part of this change).

### 2. Categories entry point in Transactions toolbar

Add a `Sell` (or `Label`) icon button to the Transactions page toolbar, alongside the existing Export CSV and Filter buttons. Tapping navigates to `/categories`.

### 3. Categories page improvements

- Render the actual Material icon from `category.icon` instead of the generic `CategoryIcon`
- Add archive action (swipe icon or trailing icon button) — sets `isArchived: true` via PATCH; archived categories disappear from the list
- Add i18n keys (title, tab labels, empty state)
- Filter out archived categories from the list

### 4. AddEditCategory page improvements

- Icon picker: a small grid of ~12 fixed Material icons the user can tap to select
- Color picker: 8-colour fixed swatch (matches existing palette style)
- i18n keys

### 5. Transaction form — category becomes optional

In `AddEditTransaction.tsx`:
- Category field is not required; submitting without one sends no `category` field (backend already accepts nullable)
- Category picker shows only non-archived categories filtered to the transaction type (EXPENSE categories for expense transactions, INCOME for income)
- Transactions without a category show no category label in the list (already the case if `category` is null)

## Icon Palette (12 icons)

`restaurant`, `home`, `directions_car`, `shopping_cart`, `local_hospital`, `school`, `fitness_center`, `flight`, `movie`, `category`, `payments`, `more_horiz`

## Color Palette (8 colors)

`#9E9E9E`, `#F44336`, `#E91E63`, `#9C27B0`, `#2196F3`, `#4CAF50`, `#FF9800`, `#795548`

## Out of Scope

- Sub-categories UI (entity supports them, not exposed)
- Category reordering
- Per-category budget limits
