# UniCircle — Frontend Screen → API Mapping and Change List

**Baseline:** supplied `UniCircle--feature-unicircle-frontend.zip` (React/Vite), NOT the separate HTML demo. **Frozen UI contract goal:** preserve existing UI and replace `demo-store` with typed/validated API calls, adding only missing screens/buttons.

## Source-code inventory (ZIP)

| ZIP file | Existing behavior | Required surgical work |
|---|---|---|
| `frontend/src/main.jsx` | Hash router, localStorage session, Marketplace card/filter logic, nav and route guards | Replace `useHash`, `demoStore` and local filtering; React Router path routes, authenticated API query hooks/data loads, 20-item Load More, loading/error/empty, redirect by `/auth/me` |
| `frontend/src/screens.jsx` | Registration/sign-in, forms, detail, activity, admin in one file | Keep visual/form structure; swap handlers; add fullName/email-only, verification/reset, delete dialog, explicit exchange confirm, admin domains, hiding reason, free text pickup |
| `frontend/src/market.js` | Demo categories, conditions, price/state mutation | Retain only pure display/format helpers where compatible; match enum labels; retire production `updateMarket()` writes and client-authoritative rental calculations |
| `frontend/src/demo-store.js` | LocalStorage accounts, shared visible demo password, fake email verification | Remove from production route imports; move isolated fixtures into `frontend/src/mocks/` only; no persistent demo auth in production |
| `frontend/src/market.test.js` | Four pure local tests | Preserve; add API contract/state/render tests, hidden return correct state |
| `frontend/src/style.css`, `visuals.jsx` | Existing visual styles and placeholders | Keep unless accessibility/new screen components require minimal changes |

## UI ↔ endpoint matrix

| Screen / UI action | Endpoints called | UI acceptance requirements |
|---|---|---|
| App boot + protected routes | `GET /auth/me`, `GET /auth/csrf` | Resolve loading vs signed-out vs unverified vs verified; never trust localStorage auth |
| `/register` | `POST /auth/register`, `GET /auth/csrf` | `fullName`, `displayName`, `universityEmail`, `password`; show example `name@seu.edu.bd`; no university ID or demo password; preserve field errors |
| `/signin` | `POST /auth/login`, `/auth/me`, `/auth/csrf` | Email-only login; lockout/invalid/generic errors; after sign-in use new CSRF token |
| Sign out | `POST /auth/logout` | Clear cached user data and redirect after server succeeds or terminal auth failure |
| `/status` | `GET /verification/status`, `POST /auth/resend-verification` | Unverified status, resend action; 5 rolling requests/hour; no manual review |
| `/verify-email?token=...` | `POST /auth/verify-email` | Remove token from URL immediately; success/invalid/expired; no token logs; optional sign-in after success |
| `/forgot-password` | `POST /auth/forgot-password` | Generic response for any email; do not reveal whether account exists |
| `/reset-password?token=...` | `POST /auth/reset-password` | Single-use 30-minute link; clear token from URL, success redirects sign-in |
| Marketplace feed | `GET /categories`, `GET /listings` | Fixed 8 categories; type/free filters, title search, default 20; Load More appends and search changes reset; no client-only source of truth |
| Listing detail `/listings/:id` | `GET /listings/:id`, `POST /listings/:id/requests` | Owner displayName only; request fields by listing type; display server-authoritative rental fee; no own-item request |
| New listing `/post` | `GET /categories`, `POST /listings`, photo sign+confirm routes | One optional photo, max 5 MiB accepted; form persists on upload failure; use `photoAssetId`, not base64 or a supplied URL |
| Edit `/listings/:id/edit` | `GET /listings/:id`, `PATCH /listings/:id`, optional photo routes | Submit `version`; warn about pending cancellations on terms edits; 409/version conflict handles reload; hidden/reserved edit forbidden |
| Close action | `POST /listings/:id/close` | Only eligible listing; show confirmation; pending cancelled |
| Delete action | `DELETE /listings/:id` | New Delete Post confirm (not Delete Account); status-only HTTP 204; no delete when hidden/reserved/checked_out/completed/closed |
| `/activity` My Listings | `GET /me/listings` | View own history, hidden reason to owner; Edit/Close/Delete only eligible |
| `/activity` Requests Sent | `GET /me/requests/sent`, `GET /requests/:id`, `POST /requests/:id/cancel` | Private pickup only own request; cancel pending or accepted before handover |
| `/activity` Requests Received | `GET /me/requests/received`, `GET /requests/:id` | Owner actions for pending/accepted/checked_out; no pickup visible to unrelated user/admin |
| Accept | `POST /requests/:id/accept` | Owner free-text pickupPoint (3–120 chars), pickupAt >= server now; rent/borrow same campus pickup day |
| Decline / Cancel | `POST /requests/:id/decline`, `/cancel` | Honor exact state; refresh activity after mutation |
| Record handover | `POST /requests/:id/handover` | Sell/donate complete; rent/borrow checked out; exchange requires explicit boolean+statement |
| Confirm return | `POST /requests/:id/return` | Owner only; checked_out -> request completed, listing available; if hidden it remains hidden, not closed |
| `/admin/domains` | `GET/POST /admin/domains`, `PATCH /admin/domains/:id` | Remove manual ID review queue; list/add/toggle domains; admin-only route |
| `/admin/listings` | `GET /admin/listings`, `GET /admin/listings/:id`, `POST /admin/listings/:id/hide` | Keep moderation design; hide reason required, no pickup data shown to unrelated admin |

## Component ownership and interaction shape

- `useSession`/auth provider owns `GET /auth/me`, CSRF token, guest/unverified/verified/admin decisions. Do **not** set privileged state from local UI toggles.
- Services `authService`, `listingsService`, `requestsService`, `adminService`; shared `apiClient` centralizes `credentials: 'include'`, `x-csrf-token`, JSON parsing, `Retry-After`, error mapping.
- UI uses exact enums: listing type `sell | donate | rent | exchange | free_borrowing`; category **code** from `/categories` or `categoryId` when submitting; condition `new | like_new | good | fair | poor`.
- Currency from API is a **decimal string** (e.g. `"450.00"`), never store as `450.0` floats in DTO. Dates `YYYY-MM-DD`; timestamps ISO. Never infer a pickup date/time from user's locale.
- Public listing/admin serializers must not include another member's email or pickup point/time; the logged-in account response may contain its own email.
- Server may return a field-level error under `error.details.fields`; show that field's message and preserve input.

## Testable 'done' definition

Every row above must show realistic success, 400, 401, 403/404, 409, 429 and network failure states via mock fixtures. Run keyboard+360px checks. On release replace `mockApi` with live service via environment-based explicit mock switch; never ship demo auth in production.

## Final authority

This frontend mapping is a task guide subordinate to `PRD.md` and `API_CONTRACT.md` / `openapi.yaml`. It records what is visible in the **submitted ZIP**, not a claim that real HTTP connections have been implemented. Reuse working UI; the frontend must stop using `localStorage` as production user/marketplace source of truth.
