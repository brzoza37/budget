# Theme System Design

**Date:** 2026-05-01  
**Status:** Approved

## Goal

Replace the binary light/dark toggle with 6 named full-palette themes. Each theme has its own primary color and light/dark base, giving the app genuine visual personality. The selected theme is stored on the backend and follows the user across devices.

---

## Themes

| ID | Name | Primary | Base |
|---|---|---|---|
| `forest` | Forest | `#4CAF50` green | Light |
| `ocean` | Ocean | `#1E88E5` blue | Dark |
| `aubergine` | Aubergine | `#6A1B9A` purple | Dark |
| `sunset` | Sunset | `#FB8C00` amber | Light |
| `slate` | Slate | `#455A64` blue-grey | Dark |
| `rose` | Rose | `#E91E63` pink | Light |

`forest` is the default (current light green theme).

---

## Backend

### User entity
Add `theme` field:
```php
#[ORM\Column(length: 30)]
private string $theme = 'forest';
```

### Migration
```sql
ALTER TABLE "user" ADD theme VARCHAR(30) NOT NULL DEFAULT 'forest';
```

### Auth responses
Include `theme` alongside `locale` in every auth payload:
- `POST /api/auth/register` response
- `POST /api/auth/login` response (via `AuthenticationSuccessListener`)
- `GET /api/auth/me` response
- `PATCH /api/auth/me` response

### PATCH /api/auth/me
Accept `theme` field. Validate against:
```php
private const SUPPORTED_THEMES = ['forest', 'ocean', 'aubergine', 'sunset', 'slate', 'rose'];
```
Return HTTP 400 with translated error if value is not in the list.

### Translation keys (backend)
Add to `messages.en.yaml`:
```yaml
error:
  auth:
    invalid_theme: 'Invalid theme. Supported: forest, ocean, aubergine, sunset, slate, rose'
```
Add to `messages.pl.yaml`:
```yaml
error:
  auth:
    invalid_theme: 'Nieprawidłowy motyw. Obsługiwane: forest, ocean, aubergine, sunset, slate, rose'
```

### Tests
Extend `AuthControllerTest`:
- `testRegisterDefaultThemeIsForest` — default theme is `forest`
- `testPatchMeUpdatesTheme` — valid theme name accepted, returned in response
- `testPatchMeRejectsInvalidTheme` — unknown theme name returns 400

---

## Frontend

### `frontend/src/theme/theme.ts`
Add 5 new `createTheme()` exports (`oceanTheme`, `aubergineTheme`, `sunsetTheme`, `slateTheme`, `roseTheme`). Export:

```ts
export const THEMES: Record<string, Theme> = {
  forest: forestTheme,
  ocean: oceanTheme,
  aubergine: aubergineTheme,
  sunset: sunsetTheme,
  slate: slateTheme,
  rose: roseTheme,
};

export const THEME_META: { id: string; primary: string; labelKey: string }[] = [
  { id: 'forest',    primary: '#4CAF50', labelKey: 'settings.themes.forest' },
  { id: 'ocean',     primary: '#1E88E5', labelKey: 'settings.themes.ocean' },
  { id: 'aubergine', primary: '#6A1B9A', labelKey: 'settings.themes.aubergine' },
  { id: 'sunset',    primary: '#FB8C00', labelKey: 'settings.themes.sunset' },
  { id: 'slate',     primary: '#455A64', labelKey: 'settings.themes.slate' },
  { id: 'rose',      primary: '#E91E63', labelKey: 'settings.themes.rose' },
];
```

The current `lightTheme` becomes `forestTheme`; `darkTheme` is removed. Both named exports (`lightTheme`, `darkTheme`) are replaced by the `THEMES` map — no other file should import them directly after the refactor.

### `frontend/src/context/ThemeContext.tsx`
Replace `isDark: boolean` + `toggleTheme` with:
```ts
interface ThemeContextValue {
  themeName: string;
  setThemeName: (name: string) => void;
}
```
Reads initial value from `user.theme` (passed in or read from `auth_user` in localStorage). Applies `THEMES[themeName] ?? THEMES.forest`. No longer touches localStorage directly — the source of truth is the `AuthUser` object.

The provider reads `localStorage.getItem('auth_user')` on mount to initialise before auth context is available, identical to how locale is bootstrapped.

### `frontend/src/types/api.ts`
Add `theme: string` to `AuthUser`.

### `frontend/src/context/AuthContext.tsx`
Call `setThemeName(user.theme)` on init (useEffect) and inside `login()` — identical pattern to `i18next.changeLanguage(user.locale)`.

`updateUser` already handles partial updates — no changes needed there.

### `frontend/src/pages/Settings.tsx`
Replace the Appearance card (currently a dark mode Switch row) with a theme picker section:

- Section heading: `t('settings.themeSection')`
- 3×2 grid of swatch buttons, one per theme
- Each swatch: rounded square (48×48px) in `theme.primary` color, checkmark overlay if selected, theme name label below
- On tap: optimistic update — call `setThemeName(id)`, PATCH `/api/auth/me` with `{ theme: id }`, call `updateUser({ theme: id })` on success, revert + show Snackbar error on failure

The "Dark Mode" switch row is removed entirely.

### `frontend/src/i18n/en.json` and `pl.json`
Add under `settings`:
```json
"themeSection": "Theme",
"themes": {
  "forest": "Forest",
  "ocean": "Ocean",
  "aubergine": "Aubergine",
  "sunset": "Sunset",
  "slate": "Slate",
  "rose": "Rose"
}
```
Polish names (all stay English as they are color/nature words):
```json
"themeSection": "Motyw",
"themes": {
  "forest": "Forest",
  "ocean": "Ocean",
  "aubergine": "Aubergine",
  "sunset": "Sunset",
  "slate": "Slate",
  "rose": "Rose"
}
```

---

## Data flow

1. User logs in → `AuthUser.theme` comes from backend → `AuthContext.login()` calls `setThemeName(user.theme)` → MUI provider re-renders with correct palette
2. User taps a swatch in Settings → optimistic UI update → PATCH `/api/auth/me` → `updateUser({ theme })` persists to localStorage cache → on next login, backend returns new theme
3. App cold start (already logged in) → `auth_user` in localStorage has `theme` → `ThemeContext` reads it on mount → correct theme before first paint

---

## What is NOT in scope
- Custom color picker (user-defined hex colors)
- Per-section theming (e.g. different nav vs content colors)
- System-preference auto-detection (was removed with the toggle)
