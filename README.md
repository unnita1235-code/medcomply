# MedComply — medical compliance SaaS (monorepo)

This repository is arranged as a monorepo: `frontend` (Next.js 15, App Router, Tailwind, shadcn UI), `backend` (FastAPI under the `api` package), and `supabase` SQL migrations (organizations, app users, documents, and RBAC).

## Continuous integration

Every push and pull request to `main` runs [GitHub Actions](https://github.com/unnita1235-code/medcomply/actions): Python compile + import check, `npm run lint` + `npm run build` for the frontend, and a full **Docker** build of `backend` and `frontend` images. [Dependabot](.github/dependabot.yml) opens weekly PRs for npm, pip, and Action updates.

## Prereqs

- Node 20+ and npm
- Python 3.11+ (tested on 3.14) with `pip`
- Docker Desktop or Docker Engine (optional, for the compose stack)
- A Supabase project (optional until you run migrations and wire auth)

## Run locally (without Docker)

1. **API** — from the `backend` directory:

   ```bash
   py -m pip install -r requirements.txt
   py -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
   ```

2. **Web** — copy `frontend/.env.local.example` to `frontend/.env.local`, then:

   ```bash
   npm install --prefix frontend
   npm run dev --prefix frontend
   ```

3. Open `http://127.0.0.1:3000` (UI) and `http://127.0.0.1:8000/docs` (OpenAPI). The default profile uses `NEXT_PUBLIC_AUTH_PROVIDER=mock` and a dev FastAPI user when `API_ALLOW_DEV_USER=1` (default).

## Run with Docker Compose (frontend + backend + Postgres)

Use this to smoke-test a production-like stack on your machine, including a **local PostgreSQL 16** instance for SQL tooling, future migrations, or app wiring. The current FastAPI code uses **Chroma** for vectors and (optionally) **Supabase** for auth/audit; it does not open a TCP connection to this Postgres by default, but the services share a Docker network so the DB is reachable as **`db:5432`** from the backend container if you add one later.

1. In the **repository root**, add environment variables. The easiest way is to copy the template to `.env` (this filename is what Docker Compose loads by default) and set at least `OPENAI_API_KEY`:

   ```bash
   cp docker.env.example .env
   # edit .env (gitignored) — set at least OPENAI_API_KEY
   ```

2. Build and start:

   ```bash
   docker compose up --build
   ```

3. Open **http://localhost:3000** (Next.js) and **http://localhost:8000/docs** (API). The browser calls the API at `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).

4. **Postgres (host access):** from your machine, connect to `localhost:5432` with the user / password / database from `docker.env` (defaults: `medcomply` / `medcomply` / `medcomply`).

5. Volumes: Chroma and JSONL audit data persist under the named volumes `medcomply_chroma` and `medcomply_audit` until you `docker compose down -v`.

### Backend image only

To build the FastAPI image (for example, to push to a registry without compose):

```bash
docker build -t medcomply-api:local ./backend
```

---

## Deploying the frontend to Vercel

Vercel is a natural home for the **Next.js** app in this monorepo. The **Python API** (FastAPI, long-lived SSE, Chroma on disk) is not a good fit for Vercel’s default serverless model as-is, so in production you should host the API on a service that supports a **stateful** or long-running process (or refactor to managed vector DB and serverless workers). The steps below wire the Vercel site to a separate API base URL.

### 1. Create a Vercel project

1. Push this repository to GitHub (or GitLab / Bitbucket).
2. In the [Vercel dashboard](https://vercel.com), **Import** the repository.
3. **Root Directory:** set to `frontend` (this monorepo is not only Next.js; the app lives in that folder).
4. **Framework Preset:** Next.js (Vercel should auto-detect).
5. **Build & Output:** defaults are usually fine: install `npm install`, build `npm run build`, output as detected from Next 15.
6. **Node.js version:** 20.x (match `frontend` engines if you add one in `package.json`).

### 2. Environment variables (Vercel)

In the project **Settings → Environment Variables**, set at least:

| Name | Value | Notes |
|------|--------|--------|
| `NEXT_PUBLIC_API_URL` | `https://api.your-domain.com` | Public. Must be the **browser-visible** base URL of your deployed FastAPI (include `https://`, no trailing slash). |
| `NEXT_PUBLIC_AUTH_PROVIDER` | `clerk` or `supabase` or `mock` | Match your production auth. |
| Clerk or Supabase keys | As required by your `frontend` code | e.g. `NEXT_PUBLIC_CLERK_*` or Supabase URL + anon key; keep **service** keys off the client. |

Redeploy after changing env vars. `NEXT_PUBLIC_*` values are embedded at build time; trigger a new deployment when you change them.

### 3. CORS and the API (not on Vercel)

Point your **FastAPI** deployment’s `API_CORS_ORIGINS` to your Vercel origin, for example:

- `https://your-app.vercel.app`
- Your custom domain: `https://app.yourdomain.com` (and `www` if used)

The backend’s `config` already accepts a comma-separated list from the environment. Do **not** commit production secrets; set them in your host’s secret store (Render, Fly, Cloud Run, Railway, etc.).

### 4. Where to deploy the FastAPI backend

Suitable options for this stack (SSE streaming, Chroma volumes, large uploads):

- **Render**, **Fly.io**, **Railway**, **Google Cloud Run** (with volume or external vector DB if you outgrow a single instance), or **AWS ECS/Fargate**
- For **only** the database: [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) or keep using **Supabase Postgres**; you would then connect the API to that DSN and migrate off local Chroma if you want fully managed infra.

**Summary:** Vercel hosts the **Next.js** frontend. Run **FastAPI** elsewhere, set `NEXT_PUBLIC_API_URL` to that API’s public URL, and align `API_CORS_ORIGINS` and auth headers between gateway and `backend/api/core/security.py` for real production (disable `API_ALLOW_DEV_USER` and verify JWTs or gateway-injected user headers).

---

## Supabase

Apply migrations with the [Supabase CLI](https://supabase.com/docs/guides/cli) from this repository root, or run the SQL in the dashboard. See `supabase/migrations/20260424120000_init_medcomply.sql` for the `Users`, `Organizations`, and `Documents` model plus RLS and org roles.

## Auth

Set `NEXT_PUBLIC_AUTH_PROVIDER` to `clerk` (with Clerk keys) or `supabase` (with Supabase URL and anon key). The UI falls back to mock flows when those keys are absent. Replace the dev headers / dev user in `backend/api/core/security.py` with verified tokens before production.

## RBAC

- **Database:** `organization_members.role` and RLS in Supabase.
- **API:** FastAPI dependencies in `api/core/rbac.py` and `api/core/security.py` — each protected route uses explicit role requirements.

The frontend calls the API through `lib/env.ts` (`NEXT_PUBLIC_API_URL`) and the compliance workspace uses `fetch` to the process-document and stream endpoints for analysis.
