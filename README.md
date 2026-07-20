# AI-Job-Agent

<img width="1465" height="731" alt="image" src="https://github.com/user-attachments/assets/a7fd7e43-0aff-4df9-8c36-ba39d54a0fb1" />
<img width="1468" height="755" alt="image" src="https://github.com/user-attachments/assets/7b49f498-4eca-4c7a-a773-2b736bbc51e5" />
<img width="1453" height="2221" alt="image" src="https://github.com/user-attachments/assets/72c8ce6f-a035-4734-8598-2effd73690d2" />

https://github.com/user-attachments/assets/98c802d7-d488-4425-b2da-fd9016e1bfed

AI-Job-Agent is a portfolio-grade full-stack job search workspace built around a simple principle: make the workflow explicit, deterministic, and trackable.

The app lets a candidate:

- register and sign in
- upload a PDF or DOCX resume
- review and edit a structured profile
- define job preferences, including required and preferred excluded technologies
- fetch normalized job matches from Adzuna
- sort and filter jobs deterministically and by AI fit score
- track each job as `saved`, `applied`, `skipped`, or through the full pipeline (`interview`, `rejected`, `offer`, `no_response`)
- monitor dashboard stats, follow-ups, and pipeline conversion
- analyze which role types, skills, locations, salary bands, and sources produce interviews
- get strategy recommendations with evidence clearly separated from AI suggestions
- generate tailored application packs with ATS checks and verified claims
- optionally receive Telegram job alerts

## Product phases

All five phases are implemented.

| Phase | Feature |
| --- | --- |
| 1 | Resume upload → structured profile → Adzuna jobs → deterministic + AI fit scoring → dashboard → save/ignore |
| 2 | Application tracker with notes and follow-up dates |
| 3 | Outcome intelligence from observed application results |
| 4 | Strategy agent distinguishing evidence from AI suggestions |
| 5 | Tailored application pack (CV suggestions, cover letter, interview questions, ATS checks) |

## Frontend routes

| Route | Purpose |
| --- | --- |
| `/login` | Sign in or register |
| `/` | Dashboard with stats, follow-ups, and top matches |
| `/jobs` | Browse, filter, score, and track job matches |
| `/tracker` | Manage application pipeline, notes, and follow-ups |
| `/insights` | Outcome intelligence from tracked applications |
| `/strategy` | Evidence-backed recommendations vs AI suggestions |
| `/profile` | Profile editing, resume upload, Telegram linking |
| `/preferences` | Job search preferences and exclusion rules |

## Architecture

### Frontend

- React + TypeScript + Vite
- TanStack Query for server state
- Token-based auth with refresh flow
- Pages handle data fetching; feature components handle presentation

### Backend

- FastAPI with async SQLAlchemy
- Alembic migrations
- SQLite for local dev; Postgres for Docker/production
- Adzuna async adapter behind a `JobSource` abstraction
- Deterministic deduplication, filters, and scoring
- Optional OpenAI-compatible AI scoring, strategy suggestions, and application packs
- Persistent job tracking, pipeline analytics, and dashboard stats APIs
- Background scheduler for Telegram polling and daily job checks

## Repository layout

```text
ai-job-agent/
├── frontend/          React app
├── backend/           FastAPI app + Alembic migrations
├── .github/workflows/ CI and deploy
├── docker-compose.yml Postgres + backend + frontend
└── README.md
```

## API summary

Auth:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
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
- `GET /api/v1/jobs/{source}/{source_job_id}`
- `PATCH /api/v1/jobs/tracked/{source}/{source_job_id}`
- `POST /api/v1/jobs/actions`
- `DELETE /api/v1/jobs/tracked`

Analytics:

- `GET /api/v1/analytics/outcomes`
- `GET /api/v1/analytics/strategy`

Applications:

- `POST /api/v1/applications/{source}/{source_job_id}/pack`

Dashboard:

- `GET /api/v1/dashboard/stats`

Telegram:

- `GET /api/v1/telegram/link`
- `GET /api/v1/telegram/status`
- `PATCH /api/v1/telegram/settings`

Health:

- `GET /health`

## Local development

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

Backend runs at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

**Database:** `.env.example` defaults to SQLite (`sqlite+aiosqlite:///./ai_job_agent.db`), which works without installing Postgres. For Postgres locally, start Postgres and set:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_job_agent
```

Then run `alembic upgrade head` again.

**Required for job search:** set `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` in `backend/.env`. Get keys at [developer.adzuna.com](https://developer.adzuna.com/).

**Recommended:** set a real `JWT_SECRET_KEY` before using auth in anything other than local dev.

If `pip install` seems stuck, wait 1–2 minutes on first run. Use `python3` on macOS — `python` may not exist.

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

Restart uvicorn after changing `.env` so settings and the database connection reload cleanly.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

Copy [`frontend/.env.example`](frontend/.env.example) to `frontend/.env` if needed. Default API target:

```env
API_BASE_URL=http://localhost:8000/api/v1
```

## Docker

Run the full stack locally with:

```bash
docker compose up --build
```

Services:

- frontend: `http://localhost:3000`
- backend: `http://localhost:8000`
- postgres: `localhost:5432`

Docker uses Postgres. Copy `backend/.env.example` to `backend/.env` and add your Adzuna keys before starting.

## Deployment

### Vercel

The frontend includes [`frontend/vercel.json`](frontend/vercel.json).

Suggested environment variable:

- `API_BASE_URL=https://your-backend-domain/api/v1`

## Environment variables

Backend — see [`backend/.env.example`](backend/.env.example):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite locally; Postgres in Docker/production |
| `JWT_SECRET_KEY` | Auth token signing |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Job search provider |
| `ADZUNA_COUNTRY` | Adzuna market (default `in`) |
| `OPENAI_API_KEY` | Optional LLM for AI scoring, strategy, and packs |
| `AI_SCORING_ENABLED` | Toggle AI fit scoring |
| `TELEGRAM_BOT_TOKEN` | Optional Telegram bot |
| `TELEGRAM_MODE` | `polling`, `webhook`, or `disabled` |
| `CRON_ENABLED` | Background job checks and Telegram polling |

Frontend — see [`frontend/.env.example`](frontend/.env.example):

| Variable | Purpose |
| --- | --- |
| `API_BASE_URL` | Backend API base URL |

No real secrets should be committed. Only placeholder values belong in example env files.

## Optional features

**OpenAI / LLM**

Set `OPENAI_API_KEY` to enable LLM-backed AI fit scoring, strategy suggestions, and application packs. Without it, the app uses deterministic and heuristic fallbacks.

**Telegram alerts**

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Set `TELEGRAM_BOT_TOKEN` in `backend/.env`
3. For local dev, use `TELEGRAM_MODE=polling` or `TELEGRAM_MODE=disabled` to avoid webhook conflicts
4. Link your account from the Profile page

## Quality gates

Backend:

```bash
cd backend
source .venv/bin/activate
ruff check .
pytest
```

Frontend:

```bash
cd frontend
npm run type-check
npm run build
```

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Login returns 500 | Postgres URL set but Postgres not running | Use SQLite default or start Postgres |
| Jobs return 503 | Missing Adzuna keys | Add `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`, restart backend |
| Telegram 409 errors | Multiple pollers on same bot | Set `TELEGRAM_MODE=disabled` locally |
| Stale config after `.env` edit | Settings cached at startup | Restart uvicorn |

## Scope boundaries

Implemented:

- auth with refresh tokens
- profile and preferences editing
- secure resume upload and extraction
- deterministic job matching plus heuristic/LLM AI fit scoring
- full application pipeline tracking
- outcome intelligence and strategy recommendations
- tailored application packs with claim verification
- dashboard stats and follow-up reminders
- optional Telegram notifications
- responsive frontend across all phases

Not included:

- Adzuna alternatives or multi-source federation
- outreach automation or email sending
