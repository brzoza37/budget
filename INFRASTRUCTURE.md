# Infrastructure and Local Development

The project uses Docker Compose to orchestrate the backend, frontend, and database for a consistent development experience.

## Services

1.  **`php`**: Symfony 7 application running on PHP 8.3-FPM.
2.  **`nginx`**: Web server to serve both the API (Symfony) and the built PWA (React).
3.  **`db`**: PostgreSQL 16 database.
4.  **`node`**: Node.js 20 for Vite dev server and PWA build process.

## Environment Configuration

- `.env`: Global environment variables (shared by all services).
- `backend/.env`: Symfony-specific configuration.
- `frontend/.env`: React/Vite-specific configuration.

## Setup Instructions

1.  Clone the repository.
2.  Copy `.env.example` to `.env`.
3.  Run `docker compose up -d`.
4.  Access the PWA at `http://localhost:3000`.
5.  Access the API documentation at `http://localhost:8000/api`.

## Development Workflow

- **Backend**: Entity-driven development using API Platform. Migrations are managed via `php bin/console make:migration` inside the `php` container.
- **Frontend**: Vite with HMR. Styles are built using Tailwind CSS.
- **Git**: Feature branch workflow. Ensure all commits are linted and formatted.

## CI/CD Readiness

- Dockerfiles are optimized for production builds.
- PHP and JS linting/formatting are included in the build scripts.
- Unit and integration tests can be run in isolation via Docker.
