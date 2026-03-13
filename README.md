# Result-Analyzer (Academic Performance Analyzer)

A full-stack web application for analyzing student examination results from Excel files. Upload a spreadsheet and get interactive dashboards, insights, and downloadable reports (Excel, PDF, Markdown).

## GitHub

- Repository: https://github.com/PRANESH-710/Result-Analyzer
- Issues: https://github.com/PRANESH-710/Result-Analyzer/issues

## Features

- Authentication with session-based login (`express-session`)
- Excel result analysis with configurable pass threshold and formatting
- Dashboards for subject and student-level performance
- Data preview for uploaded sheets
- Report export in Excel, PDF, and Markdown

## Tech Stack

- Monorepo: pnpm workspaces
- Language: TypeScript
- Frontend: React + Vite
- Backend: Express
- Validation: Zod / drizzle-zod
- Excel parsing: `xlsx`
- API tooling: OpenAPI + Orval
- DB layer: Drizzle ORM

## Repository Structure

```text
artifacts/
  api-server/         # Express API server
  exam-analyzer/      # React + Vite frontend
  mockup-sandbox/     # UI sandbox
lib/
  api-spec/           # OpenAPI spec + Orval config
  api-client-react/   # Generated React Query hooks
  api-zod/            # Generated Zod schemas
  db/                 # Drizzle schema + DB connection
scripts/              # Workspace scripts/utilities
```

## API Endpoints

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/analysis/upload`
- `POST /api/analysis/export/excel`
- `POST /api/analysis/export/pdf`
- `POST /api/analysis/export/markdown`

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm

### Clone and Install

```bash
git clone https://github.com/PRANESH-710/Result-Analyzer.git
cd Result-Analyzer
pnpm install
```

### Run Development Servers

```bash
pnpm --filter @workspace/api-server dev
pnpm --filter @workspace/exam-analyzer dev
```

## Environment Variables

Set these for the API server:

- `APP_USERNAME`
- `APP_PASSWORD`
- `SESSION_SECRET`

Example:

```env
APP_USERNAME=admin
APP_PASSWORD=admin123
SESSION_SECRET=replace_this_with_a_long_random_string
```

## License

MIT
