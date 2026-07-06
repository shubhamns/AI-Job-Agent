# AI-Job-Agent

AI-Job-Agent is a portfolio-grade full-stack job search workspace built around a simple principle: make the workflow explicit, deterministic, and trackable.

The app lets a candidate:

- register and sign in
- upload a PDF or DOCX resume
- review and edit a structured profile
- define job preferences, including required and preferred excluded technologies
- fetch normalized job matches from Adzuna
- sort and filter jobs deterministically
- track each job as `saved`, `applied`, or `skipped`
- monitor dashboard stats across the pipeline

This repository intentionally stops at the Phase 1 scope above. It does not add Phase 2 product features.

## Architecture

### Frontend

- React + TypeScript + Vite
- responsive dashboard-oriented UI
- token-based auth flow against the FastAPI backend
- views for dashboard, profile, preferences, jobs, and job detail

### Backend

- FastAPI
- async SQLAlchemy
- Alembic migrations
- Neon/Postgres-compatible configuration
- Adzuna async adapter behind a `JobSource` abstraction
- deterministic deduplication, filters, and scoring
- persistent job tracking and dashboard stats APIs

## Repository Layout

```text
ai-job-agent/
├── frontend/
├── backend/
├── .github/workflows/
├── docker-compose.yml
└── README.md
```

## API Summary

Auth:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

Profile:

- `GET /api/v1/profile`
- `PUT /api/v1/profile`
- `GET /api/v1/profile/preferences`
- `PUT /api/v1/profile/preferences`
- `POST /api/v1/resumes`

Jobs:

- `GET /api/v1/jobs/matches`
- `GET /api/v1/jobs/tracked`
- `POST /api/v1/jobs/actions`
- `GET /api/v1/jobs/{source}/{source_job_id}`
- `GET /api/v1/dashboard/stats`

## Local Development

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # first time only — then edit .env with your keys
alembic upgrade head
uvicorn app.main:app --reload
```

If `pip install` seems stuck, wait 1–2 minutes on first run (many packages download). Use `python3` on macOS — `python` may not exist.

If the venv looks wrong, reset it:

```bash
cd backend
deactivate 2>/dev/null || true
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
which python   # should show .../backend/.venv/bin/python
pip install -r requirements.txt
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend reads `API_BASE_URL` from [`frontend/.env.example`](/Users/heyshubham/shubham/mee/mee/projects/ai-job-agent/frontend/.env.example). By default it should point at `http://localhost:8000/api/v1`.

## Docker

Run the full stack locally with:

```bash
docker compose up --build
```

Services:

- frontend: `http://localhost:3000`
- backend: `http://localhost:8000`
- postgres: `localhost:5432`

## Deployment

### Vercel

The frontend includes [`frontend/vercel.json`](/Users/heyshubham/shubham/mee/mee/projects/ai-job-agent/frontend/vercel.json).

Suggested environment variable:

- `API_BASE_URL=https://your-backend-domain/api/v1`

## Environment Files

Backend example:

- [`backend/.env.example`](/Users/heyshubham/shubham/mee/mee/projects/ai-job-agent/backend/.env.example)

Frontend example:

- [`frontend/.env.example`](/Users/heyshubham/shubham/mee/mee/projects/ai-job-agent/frontend/.env.example)

No real secrets should be committed in this repository. Only placeholder/example values belong in example env files.

## Quality Gates

Backend:

```bash
cd backend
source .venv/bin/activate
ruff check .
pytest
alembic upgrade head --sql
```

Frontend:

- `cd frontend && npm run type-check`
- `cd frontend && npm run build`

## Current Scope Boundaries

Implemented:

- auth
- profile/preferences editing
- secure resume upload + extraction
- deterministic job matching
- job tracking
- dashboard stats
- responsive Phase 1 frontend

Not included:

- AI-generated job scoring
- Adzuna alternatives or multi-source federation
- interview prep, outreach automation, analytics expansions
- any additional Phase 2 product features
