### Current Application Summary (Kotlin Mobile App)

The existing Kotlin application is a personal finance management tool built with modern Android practices (Jetpack Compose, Room, Hilt).

#### Features:
- **Dashboard**: Total balance overview, monthly income/expense summary, forecasted balance (considering planned payments), account chips, and recent transactions.
- **Transactions**: List of all transactions with swipe-to-delete, type filtering (Income, Expense, Transfer), and category/account association.
- **Accounts**: Management of multiple financial accounts (Cash, Bank, Savings, etc.) with custom colors and icons.
- **Categories**: Hierarchical category structure for organizing expenses and income.
- **Budgeting**: Monthly budget limits for specific categories with spending progress tracking.
- **Planned Payments**: Scheduled future expenses/income with "paid" status tracking.
- **Reports**: Monthly breakdown of spending by category and trends.
- **Data Persistence**: Local Room database with future-ready fields for remote synchronization (`remoteId`, `syncStatus`).

---

### Target PWA Architecture

To faithfully reproduce the experience, we'll use a **Symfony API + React SPA** approach. This allows for rich client-side state management (matching the reactive Compose UI) while providing a robust backend for future multi-device synchronization.

- **Frontend**:
    - **React 18** + **TypeScript**: Component-driven UI.
    - **MUI (Material UI)**: To match the Android Material 3 design system.
    - **Tailwind CSS**: For fine-grained responsive styling and spacing.
    - **TanStack Query (React Query)**: For state management and API caching.
    - **React Router**: For client-side navigation that feels like the native app.
    - **Vite**: For fast development and optimized PWA builds.
    - **PWA Features**: Service workers for offline caching, Web App Manifest for installation.
- **Backend**:
    - **Symfony 7** + **API Platform**: Clean, documented REST API.
    - **PHP 8.3**: Latest features for performance and safety.
    - **PostgreSQL**: Reliable relational data storage.
- **Infrastructure**:
    - **Docker Compose**: PHP-FPM, Nginx, PostgreSQL, and Node.js for dev/build.
- **Persistence Strategy**:
    - Mobile-first approach where data is primarily synced to the server, but cached locally via IndexedDB/React Query for offline-first feeling.

---

### Migration Plan

| Kotlin Screen | PWA Equivalent | Web Adaptation / Fallback |
| :--- | :--- | :--- |
| **Dashboard** | `DashboardView` (React) | Maintain FAB for adding transactions; Responsive grid for desktop (multi-column summary). |
| **Transactions** | `TransactionListView` | Swipe actions simulated via `framer-motion` or MUI `SwipeableListItem`; Desktop uses a full table/detailed list. |
| **Add/Edit Flow** | `TransactionForm` | Bottom sheet on mobile; Modal or side-panel on desktop to preserve context. |
| **Accounts/Categories** | `EntityListView` | Preservation of custom colors and icons via CSS variables and SVG icon sets. |
| **Room Entities** | **PostgreSQL Schema** | Direct mapping of `Long` IDs to `BIGINT`, `LocalDateTime` to `TIMESTAMP`. |
| **Safe Area Insets** | `viewport-fit=cover` | CSS `env(safe-area-inset-*)` used to avoid UI overlapping with notches on mobile. |
| **Haptic Feedback** | `Vibration API` | Fallback to visual feedback where `navigator.vibrate` is not supported. |

---

### Native-to-PWA Differences & Fallbacks

1.  **Haptic Feedback**: Browsers have limited access to vibration. **Fallback**: Subtle visual animations (e.g., slight scaling on click) to provide tactile-like feedback.
2.  **Native Nav Gestures**: Standard browser "back" swipe may conflict with custom UI. **Fallback**: Intentional "Back" buttons in the top bar (preserved from the Kotlin app) to ensure navigation clarity.
3.  **Local Persistence**: Kotlin uses Room (SQLite). **Fallback**: PostgreSQL as the source of truth, with IndexedDB caching for offline access during network interruptions.
4.  **Notification Triggers**: Native apps use AlarmManager for reminders. **Fallback**: Web Push API for planned payment reminders (requires user permission).

---

### Setup & Docker Instructions

#### Prerequisites
- Docker and Docker Compose installed.

#### Local Development Setup
1. Clone the repository and navigate to the `budget-pwa` directory.
2. Start all services (backend, frontend, nginx, database):
   ```bash
   docker compose up -d
   ```
3. Install backend dependencies and apply the database schema:
   ```bash
   docker compose exec backend composer install
   docker compose exec backend php bin/console doctrine:schema:create --no-interaction
   ```
4. (Optional) Seed sample data for testing:
   ```bash
   docker compose exec backend php bin/console app:seed-data
   ```
5. Install frontend dependencies (the dev server starts automatically):
   ```bash
   docker compose exec frontend npm install
   ```
6. Access the application:
   - Frontend: `http://localhost:3000`
   - API: `http://localhost:8000/api`

#### PWA Verification
- Open the application in a mobile browser (or Chrome on desktop).
- Look for the "Install App" or "Add to Home Screen" prompt.
- Test offline behavior by enabling "Offline" mode in the browser's developer tools (Network tab).

---

### Git Workflow & Collaboration

- **Feature Branches**: Use `feature/` prefix for new functionality.
- **Pull Requests**: Required for merging into `main`. Ensure all tests pass.
- **Linting**: Run `npm run lint` in the frontend and `vendor/bin/php-cs-fixer fix` in the backend before committing.

### Testing Strategy

- **Frontend**: Unit tests with Vitest, Integration tests for core flows (React Testing Library).
- **Backend**: PHPUnit for business logic and API Platform functional tests for endpoints.
