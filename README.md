# Code-Analyzer

Code-Analyzer is a pnpm monorepo for analyzing exam result spreadsheets.
It includes a React dashboard, an Express API, and shared libraries for schema, API clients, and database access.

## What It Does

- Upload Excel files (`.xlsx`, `.xls`) and validate exam data
- Compute class insights with configurable pass percentage (global or subject-wise)
- Show student and subject performance in an interactive dashboard
- Export analysis reports in Excel, PDF, and Markdown
- Keep per-user analysis history

## Monorepo Layout

```text
artifacts/
  api-server/         Express API server
  exam-analyzer/      Main React + Vite frontend
  mockup-sandbox/     UI sandbox for mockups/components

lib/
  api-spec/           OpenAPI spec + Orval config
  api-client-react/   Generated React API client
  api-zod/            Generated Zod schemas
  db/                 Drizzle database connection + schema

scripts/              Workspace utility scripts
```

## Stack

- TypeScript (workspace-wide)
- Frontend: React + Vite
- Backend: Express + multer + express-session
- Database: PostgreSQL + Drizzle ORM
- API contracts: OpenAPI + Orval + Zod
- Excel handling: xlsx

## Prerequisites

- Node.js 24+
- pnpm (required)
- PostgreSQL database

## Quick Start

1. Install dependencies

```bash
pnpm install
```

2. Create `.env` in the project root

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/code_analyzer
SESSION_SECRET=replace_with_a_long_random_secret
APP_USERNAME=admin
APP_PASSWORD=admin123
PORT=3001
```

3. Start API server

```bash
pnpm --filter @workspace/api-server dev
```

4. Start frontend (new terminal)

```bash
pnpm --filter @workspace/exam-analyzer dev
```

5. Open app

- Frontend: http://localhost:5173
- API: http://localhost:3001

## Workspace Scripts

Run from repository root:

```bash
pnpm run typecheck
pnpm run build
```

Package-level examples:

```bash
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/exam-analyzer typecheck
pnpm --filter @workspace/mockup-sandbox dev
```

## API Overview

Auth routes:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`
- `POST /api/auth/forgot-password/request`
- `POST /api/auth/forgot-password/confirm`
- `GET /api/auth/accounts`
- `DELETE /api/auth/accounts/:username`

Analysis routes:

- `POST /api/analysis/upload`
- `POST /api/analysis/reanalyze`
- `POST /api/analysis/export/excel`
- `POST /api/analysis/export/pdf`
- `POST /api/analysis/export/markdown`
- `GET /api/analysis/history`
- `DELETE /api/analysis/history/:id`
- `DELETE /api/analysis/history`

## Notes

- CORS is configured with `origin: true` and `credentials: true` in development.
- Session auth uses `express-session` and stores the username in session.
- API server requires `DATABASE_URL` at startup.

## Repository

- Repository: https://github.com/PRANESH-710/Result-Analyzer
- Issues: https://github.com/PRANESH-710/Result-Analyzer/issues

## License

MIT
