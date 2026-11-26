# UniCircle Vercel deployment readiness

This repository is prepared for two Vercel projects from the same repository:

- `frontend`: Root Directory `frontend`, using `frontend/vercel.json`
- `backend`: Root Directory `backend`, using `backend/vercel.json`

The frontend proxies `/api/v1/*` to the backend project, so browser requests remain same-origin at the public frontend URL. Update the destination in `frontend/vercel.json` if the backend production alias changes.

## Confirmed project classification

On 2026-11-24 the operator confirmed that UniCircle is a non-commercial class/group project. Vercel Hobby may be used while that remains true and nobody involved uses the deployment for financial gain. Re-evaluate the plan before any commercial or paid use.

## Vercel project settings

1. Import the repository twice: Root Directory `backend` for the API and `frontend` for the SPA.
2. Select Express for the backend and Vite for the frontend.
3. Select Node.js 22 for both projects.
4. Deploy the backend first and confirm its stable production alias matches the proxy destination in `frontend/vercel.json`.
5. Do not deploy until all environment variables below have been added to the intended Vercel environments.

## Backend environment variables

Set these as server-side Vercel environment variables. Never prefix server secrets with `VITE_`.

| Variable | Production requirement |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Scoped Atlas application-user connection string |
| `MONGODB_DB_NAME` | `UniCircle` |
| `UNIVERSITY_NAME` | `Southeast University` |
| `INITIAL_APPROVED_DOMAIN` | `seu.edu.bd` |
| `APP_BASE_URL` | Final HTTPS Vercel origin, no trailing path |
| `ALLOWED_ORIGINS` | Final HTTPS Vercel origin; comma-separated only if preview origins are explicitly allowed |
| `SESSION_COOKIE_NAME` | `uc_session` |
| `CSRF_SECRET` | Unique random secret of at least 32 characters |
| `EMAIL_FROM` | Verified Brevo sender address |
| `SMTP_HOST` | Brevo SMTP host |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Brevo SMTP login |
| `SMTP_PASS` | Brevo SMTP key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service-role key |
| `SUPABASE_LISTING_BUCKET` | `unicircle-listings` |

## Frontend build variables

| Variable | Production requirement |
|---|---|
| `VITE_MOCK_API` | `0` |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser-safe publishable key |

`UNICIRCLE_API_ORIGIN` is only for the local Vite proxy. Do not set it in Vercel because production API requests remain same-origin under `/api/v1`.

## Before the first deployment

- Review the complete Git diff and confirm no `.env`, generated output or credential is tracked.
- Run the contract check, frontend tests/build and backend typecheck/unit tests.
- Apply the idempotent Atlas migration explicitly; application startup does not run migrations.
- Confirm the Supabase bucket remains public-read but does not permit anonymous write/update/delete/list.
- Confirm the Brevo sender and SMTP key are active.
- Generate a fresh production `CSRF_SECRET`; do not reuse the development value.

## After the first preview deployment

- Set `APP_BASE_URL` and `ALLOWED_ORIGINS` to the selected stable HTTPS origin, then redeploy.
- Check direct SPA reloads, `/api/v1/health`, registration email delivery, login cookie flags, Origin/CSRF rejection and one real staging photo upload.
- Run the migration verification command against Atlas.
- Configure the protected daily orphan-photo cleanup and the external encrypted backup/restore process before claiming production readiness.

The repository is deployment-configured, but no deployment or production acceptance is claimed until these live checks pass.
