# CODEX_TASKS.md — Phased Build Plan (v3.0 Frozen Docs)

All phases refer to `AGENTS.md`, `PRD.md`, `API_CONTRACT.md`, `openapi.yaml`, `DATABASE.md` and `ARCHITECTURE.md`. **Run one phase per Codex task/PR, prove acceptance, then proceed.** The code is not built by this documentation pack.

## Phase 0 — Docs + repository inspection and baseline

- Inspect supplied `frontend/`, identify existing JS/JSX assets and confirm existing `npm test` results; do not rewrite working designs.
- Add this complete docs set to repo root and record current Git branch. Establish a CI workflow for OpenAPI parse/ref validation, frontend tests/build and backend tests once backend exists.
- Create incremental backend structure and project scripts; keep existing React package lock stable unless dependency changes are necessary.
- Deliver tree summary, a traceable implementation plan and known setup blockers. **Do not** claim endpoint integration works.

## Phase 1 — DB, migrations, shared contract, health

- Implement MongoDB Atlas/Mongoose connection with lazy caching, categories (8), university settings singleton and initial authorized `seu.edu.bd` approved-domain seed.
- Create schema validations, migrations/partial unique indexes, test fixture seed and transaction-capable local/CI MongoDB replica set.
- Implement `GET /api/v1/health` with sanitized dependency info. Test migration/idempotency/index collisions.

## Phase 2 — Authentication & accounts

- Implement `GET /auth/csrf`, register, verify, resend, sign in/out, me, verification status, forgot/reset, and secure cookies/CSRF/Origin checks.
- 60-minute email link, 5 resend/account/h, 30-minute reset, lockout, 30-minute idle + 7-day absolute sessions and five concurrent sessions.
- Wire existing auth screens with API client; add missing verify/forgot/reset screens; remove ID/manual applicant/demo account paths. Contract + IDOR + expiry tests.

## Phase 3 — Listings and image asset flow

- Implement seeded categories, feed/search/filters/cursor paging (20 default/50 max), create, edit versioning, close, soft delete.
- Implement `/listings/photos/sign` and `/confirm`: Supabase Storage direct upload, server-side object signature/size/owner checks, one-time photoAsset, 7-day orphan cleanup job.
- Preserve current listing cards/forms; fix category/condition, one image up to 5 MiB, loading/error and Delete Post confirm. Boundary tests.

## Phase 4 — Requests & race-safe transitions

- Implement rent/borrow dates and integer rental fees; request creation/snapshot/duplicate guards, owner accept+decline, cancel, handover, exchange confirmation and returns.
- Use MongoDB **multi-document transactions**, conditional mutations and partial unique indexes. Test 50 accept races; no orphan reservations. Hidden checked_out return preserves hidden flag.
- Integrate Request form, Activity tabs, pickup privacy and owner actions; confirm forbidden 403/404 cases.

## Phase 5 — Admin + moderation

- Implement add/list/activate/deactivate university domains, audit atomicity, listing hide and admin review DTOs. Remove manual review UI, add admin domains panel.
- Admin cannot modify other people's posts or see unrelated pickup. Hide reason owner-visible; hidden posts owner-read-only. Tests for domain deactivation / active user login.

## Phase 6 — Production readiness

- Verify same-origin `/api/v1` and SPA fallback on Vercel, security cookies, CORS/CSRF and frontend error display. Keep secret keys server-only.
- Real email sender verification and live Supabase staging photo upload; monitor free-tier quotas.
- Run complete PRD PAC-01–PAC-62 acceptance suite, 360px responsive, keyboard, major browsers, 1,000-listing performance test.
- Verify daily encrypted backups retained 30 days and isolated restore; hosting plan compliance (Hobby noncommercial restriction).
- Document passing tests + unverified blockers; do not claim production launched without actual deployment evidence.

## Prompt template for Codex

> Read root `AGENTS.md`, `PRD.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API_CONTRACT.md`, and `openapi.yaml` before coding. Work on Phase **N** of `CODEX_TASKS.md` only. Preserve the existing React UI, implement exactly the frozen API contract and document changed files, migration steps, actual test commands/results and any blockers. Do not deploy, merge, create new endpoints, change provider or change final business rules without explicit authorization.
