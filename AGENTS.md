# AGENTS.md — UniCircle Codex Implementation Instructions (FINAL v3.0)

> **Scope:** This file is a repository-level instruction file for Codex. Product policy and interfaces are frozen for this internal implementation baseline; infrastructure, code and external approval are **not** automatically complete.

## 0. Read in this order (mandatory)

1. `PRD.md` — approved business rules, scope, PAC-01…PAC-62.
2. `API_CONTRACT.md` — 36 REST operations and exact role/state behavior.
3. `openapi.yaml` — request/response shapes, statuses, parameters, component schemas.
4. `DATABASE.md` — MongoDB/Mongoose collections, indexes, transactions.
5. `ARCHITECTURE.md` — Vercel, Atlas, Supabase Storage, email, CSRF, backup/restore.
6. `FRONTEND_API_MAPPING.md` — exact existing React screens and API integration changes.
7. `CODEX_TASKS.md` — staged coding tasks and tests.

**Precedence:** product invariants in `PRD.md` override examples; **API_CONTRACT.md + openapi.yaml together** own the HTTP wire contract; `DATABASE.md` owns persistence design; `ARCHITECTURE.md` owns provider integration. If two frozen files contradict, **do not invent** a reconciliation: report exact file/section conflict and propose a targeted versioned patch before changing code.

## 1. Fixed decisions (never silently change)

- **One university**; single shared marketplace. Active domain `seu.edu.bd` is the initial approved email domain (operator-authorized seed). Admin can later add/toggle other **official same-university** domains; disabling one prevents *new signup and pending verification*, not login for already-verified members.
- Signup: only university email, no university ID/manual applicant review. Login university email + password; 60-minute single-use verification; 5 resends/account/rolling hour; 30-minute reset links; revoke sessions after reset.
- 5 listing types: `sell`, `donate`, `rent`, `exchange`, `free_borrowing`; 8 seeded categories; 5 item conditions; English-only UI.
- Owner-only Edit/Close/**Soft Delete** on available unhidden undeleted listing. Pending requests canceled on Close/Delete or terms edits. Admin-hidden owner sees reason but cannot edit/close/delete/unhide.
- Pickup is free text and future timestamp, private to the listing owner + that requester. Exchange completes only after owner explicitly confirms both items exchanged. Rent/free-borrow return completes via owner confirmation.
- One optional photo per listing, ≤5 MiB, JPEG/PNG/WebP; **Supabase Storage Free** only for photos, signed browser-direct upload + server-side verification. **Never use Cloudinary** or proxy the 5 MiB body through Vercel Functions.
- **MongoDB Atlas** is application DB; Mongoose; integer poisha for BDT; transactional race safety; no SQL/Postgres, Supabase Auth, payment/chat/account-delete features.
- Deploy target **Vercel** for React SPA and Express API, with real commercial-plan compliance check; free Hobby must not be assumed permissible for public commercial marketplace.

## 2. Existing frontend: preserve, don't rewrite

The user's source is `UniCircle--feature-unicircle-frontend.zip`, containing `frontend/src/{main.jsx,screens.jsx,market.js,demo-store.js,style.css,visuals.jsx}`. Keep correct page layouts, cards, styles, interactions, and existing tests. Remove demo `localStorage` authentication/data mutation **from production behavior**; move mock fixtures to dev/tests only. Implement missing verification/reset, delete confirmation, admin domains, free-text pickup, 8 categories, 5 conditions, 20-item Load More, and correct hidden/exchange status UI. The separate HTML demo is visual reference, **not** the authoritative source tree.

Do not mass-convert the existing JS/JSX frontend to TypeScript unless required by a narrowly justified task; backend/shared modules may use strict TypeScript. No unnecessary UI redesign or new frontend framework.

## 3. Backend API and security implementation

- Base `/api/v1`; implement **exactly 36 operations** from `openapi.yaml` without inventing paths. Human-readable rules are in `API_CONTRACT.md`.
- Response JSON `{data:...}` or `204` empty; errors `{error:{code,message,details}}`; exact lower_snake enum values, camelCase keys, fixed 2-decimal BDT strings, Mongo ObjectId string `id`, timestamps UTC ISO, campus days Asia/Dhaka.
- Session in MongoDB; `uc_session` HttpOnly Secure SameSite=Lax cookie; `credentials:'include'`; Origin + CSRF token on unsafe writes. `GET /auth/csrf` bootstraps public forms. No bearer tokens/localStorage auth.
- Enforce Zod input/body/query/param guards on server and ownership/role in services. Public client validation is supplementary. Never expose other members' university email, private pickup info, password/token hashes or upload/signing secrets.
- Use explicit Mongoose indexes/migrations, Mongo transactions + conditional listing updates + partial unique indexes; 50 repeated concurrent-accept races must produce exactly one accepted request and correct listing state.
- Photo API: `POST /listings/photos/sign` and `/confirm`. Server signs generated Supabase paths and validates actual uploaded file **bytes + size + MIME + magic** on confirmation; only an authenticated same-owner `photoAssetId` can attach once. Retain/delete safely with 7-day orphan grace. Never expose Supabase service-role key client-side.
- Serverless-safe: Mongo pooled/lazy connection; no in-memory sessions/locks/cron; server-only environment secrets, no `app.listen` in Vercel Function entry; local dev entrypoint may listen.

## 4. Task workflow (every Codex run)

1. Inspect the actual repository tree and report the relevant source files. Do not assume the backend exists or that frontend APIs already work.
2. Select **one bounded phase** from `CODEX_TASKS.md` and the corresponding PRD feature/PAC IDs. State which files will change.
3. Add/modify code with minimal diffs; use DTOs from `openapi.yaml`, never ad-hoc field names or unsupported endpoints.
4. Write unit tests plus integration/contract/security tests for the phase. Use a local **transaction-capable MongoDB replica set** in integration tests; mocks alone cannot prove transactional correctness.
5. Run actual available commands (lint/typecheck/test/build/schema-check) and report exact results. If dependencies/network/services are unavailable, report **not tested**; never claim success based on code inspection.
6. Provide change summary, files changed, test evidence, unresolved deployment inputs and next task. Do not automatically merge or deploy to production without user instruction.
7. When updating the contract, change **PRD + API_CONTRACT + openapi.yaml + DATABASE/ARCHITECTURE as applicable + tests** together and record the version. Never silently revive older handoff pack instructions.

## 5. Quality / release blockers

- All 36 endpoints contract-valid; cookies and CSRF work end-to-end on Vercel, including direct reloads.
- No IDOR or private pickup/email leaks; admin not privileged over unrelated transactions.
- State machines, soft-delete history and hidden checked-out return correct. Fifty accept-race tests and invalid-state tests pass.
- Supabase object size/signature/ownership and one-photo cap tested for exactly 5 MiB, >5 MiB and disallowed formats; retries preserve form.
- Admin email-domain seed genuine/authorized; real sender provisioned and tested. Verification and password reset emails deliver successfully.
- Encrypted daily backup/30-day retention + isolated restore proof; RPO/RTO goal tested; CI and frontend build pass.
- Compliant hosting plan established; **Vercel Hobby noncommercial terms must be evaluated** for this marketplace before public launch.

## 6. Explicit non-goals

No Cloudinary, no PostgreSQL, no university ID approvals, no multitenancy, no account deletion UI/API, no payments, no chat, no delivery, no admin viewing unrelated pickup, no audit UI beyond specified, no hidden listing owner modifications, and no extra endpoints for convenience without change control.
