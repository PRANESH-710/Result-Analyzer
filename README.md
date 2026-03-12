# Result-Analyzer

# Result-Analyzer (Academic Performance Analyzer)

A full-stack web application for analyzing student examination results from **Excel files**. Upload a spreadsheet and get interactive dashboards, insights, and downloadable reports (Excel/PDF/Markdown).

---

## Features

- **Authentication**
  - Session-based login (`express-session`)
  - Credentials via environment variables (`APP_USERNAME`, `APP_PASSWORD`)
- **Excel result analysis**
  - Upload Excel files and generate computed performance metrics
  - Configurable pass percentage threshold, decimal formatting, and student ID toggle
- **Dashboards & visualizations**
  - Executive summary cards and overall distributions
  - Subject performance (pass rates + averages)
  - Student-level analysis (subjects passed, pass-all vs fail-any)
  - Top performers (subject toppers + top 10 students)
  - Advanced charts (heatmap for smaller cohorts, box plots by subject)
- **Data preview**
  - Quick table preview of the first rows of the uploaded sheet
- **Exports**
  - Download reports as **Excel**, **PDF**, and **Markdown**

---

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Language**: TypeScript
- **Frontend**: React + Vite (UI: shadcn/ui, charts: Recharts, state: Zustand, animations: Framer Motion)
- **Backend**: Express (session-based auth)
- **Validation**: Zod / drizzle-zod
- **Excel parsing**: `xlsx`
- **API tooling**: OpenAPI + Orval (client + schema generation)
- **DB layer**: Drizzle ORM (in `/lib/db`)

---

## Repository Structure

```text
artifacts/
  api-server/         # Express API server (upload/analyze/export)
  exam-analyzer/      # React + Vite frontend
lib/
  api-spec/           # OpenAPI spec + Orval config
  api-client-react/   # Generated React Query hooks
  api-zod/            # Generated Zod schemas
  db/                 # Drizzle schema + DB connection
scripts/              # Workspace scripts/utilities


---

## API Endpoints

- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Check auth status
- `POST /api/auth/logout` — Logout
- `POST /api/analysis/upload` — Upload Excel & get analysis
- `POST /api/analysis/export/excel` — Export as Excel
- `POST /api/analysis/export/pdf` — Export as PDF
- `POST /api/analysis/export/markdown` — Export as Markdown

---

## Getting Started (Local)

### Prerequisites
- **Node.js 24+**
- **pnpm** (required)

> Note: this repo enforces pnpm usage (install scripts will fail if you use npm/yarn).

### Install
bash
pnpm install


### Run (development)
In separate terminals:

**API server**
bash
pnpm --filter @workspace/api-server dev


**Frontend**
bash
pnpm --filter @workspace/exam-analyzer dev


(If your frontend package name differs, tell me your `artifacts/exam-analyzer/package.json` name and I’ll correct the command.)

---

## Environment Variables

Create a `.env` for the API server (for example under `artifacts/api-server/`):

- `APP_USERNAME` (default: `admin`)
- `APP_PASSWORD` (default: `admin123`)
- `SESSION_SECRET` (has a default, but you should set your own in production)

Example:
env
APP_USERNAME=admin
APP_PASSWORD=admin123
SESSION_SECRET=replace_this_with_a_long_random_string


---

## Security Notes

- Change the default credentials before deploying.
- Use a strong `SESSION_SECRET` in production.

---

## License

MIT


### One quick question (so I can make it 100% accurate)
