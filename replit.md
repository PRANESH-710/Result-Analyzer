# Academic Performance Analyzer

## Overview

A full-stack web application for analyzing student examination results from Excel files. Built with React + Vite frontend and Express backend.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite, Recharts (charts), Zustand (state), Framer Motion (animations), shadcn/ui
- **API framework**: Express 5 with session-based auth
- **Validation**: Zod, drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **File parsing**: xlsx (Excel file processing)
- **Build**: esbuild (CJS bundle)

## Authentication

- Session-based login (express-session)
- Credentials configured via `APP_USERNAME` and `APP_PASSWORD` env vars (default: admin/admin123)
- Sessions expire after 24 hours

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   │   └── src/
│   │       ├── lib/        # Analysis engine, Excel parser, report generator
│   │       └── routes/     # auth.ts, analysis.ts, health.ts
│   └── exam-analyzer/      # React + Vite frontend
│       └── src/
│           ├── pages/      # login.tsx, dashboard.tsx, dashboard-tabs/
│           ├── components/ # shadcn/ui components
│           └── store/      # Zustand app store
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
```

## Key Features

- **Login Page**: Username/password login with feature showcase
- **Dashboard**: Sidebar with file upload, pass % slider, decimal places, student ID toggle
- **Executive Summary**: Metric cards, score distribution bar chart, pass/fail pie
- **Subject Performance**: Subject pass rates + average scores charts
- **Student Analysis**: Students-by-subjects-passed chart, passed-all vs failed-any pie
- **Top Performers**: Subject toppers table + top 10 students table
- **Data Preview**: Raw Excel data table (first 15 rows)
- **Advanced Charts**: Score heatmap (≤50 students), box plot by subject
- **Reports**: Download Excel, PDF, and Markdown reports

## API Endpoints

- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Check auth status
- `POST /api/auth/logout` - Logout
- `POST /api/analysis/upload` - Upload Excel, get analysis
- `POST /api/analysis/export/excel` - Export as Excel
- `POST /api/analysis/export/pdf` - Export as PDF
- `POST /api/analysis/export/markdown` - Export as Markdown

## Environment Variables

- `APP_USERNAME` - Login username (default: admin)
- `APP_PASSWORD` - Login password (default: admin123)
- `SESSION_SECRET` - Session secret (has default)
