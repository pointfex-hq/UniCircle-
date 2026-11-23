# UniCircle — Frontend UI Fix & AI Implementation Handoff

**Document version:** 1.0 · **Date:** 23 November 2026  
**Audience:** UniCircle frontend developer and their AI coding assistant (Codex, Claude Code, Cursor, etc.)  
**Primary goal:** Correct the **existing** React/Vite UI to match the approved UniCircle v3.0 product and API contract **without redesigning or rebuilding working screens**.

> **THIS IS AN IMPLEMENTATION TASK BRIEF, NOT A REQUEST TO BUILD A NEW FRONTEND.** The backend is not implemented yet. Deliver a complete, demonstrable UI using isolated, contract-shaped development mocks; make it ready for later real-API integration. Do not implement backend services, invent API endpoints, change the product scope, deploy, or claim real email/database/storage services are working.

## 0. Source of truth and starting point

Use these files together; do not implement from this document alone if an approved contract contradicts it.

1. **Frontend starting code:** `UniCircle--feature-unicircle-frontend.zip` → `UniCircle--feature-unicircle-frontend/frontend/` (React 19, Vite 7, JavaScript/JSX, plain CSS).
2. **Product:** `PRD.md` v3.0.
3. **HTTP API:** `API_CONTRACT.md` v3.0 **and** `openapi.yaml` (36 operations, `/api/v1`); both are already the frozen internal implementation baseline.
4. **Design/topology:** `ARCHITECTURE.md`; **data:** `DATABASE.md`; coding constraints: `AGENTS.md`.
5. The separately provided `UniCircle-Marketplace-Demo (4).html` is a **visual reference only** and not the authoritative source tree. Do not blindly copy it over React screens.

**If a contradiction is discovered:** Record the exact files/fields in a `BLOCKERS.md` or final report. Do not silently alter a frozen API path, JSON key, enum, requirement, or backend decision. For UI-only uncertainty, use the smallest consistent behavior and document it.

### What is already usable — preserve it

- Existing UniCircle branding, page shell, colors, typography, hero, product/listing cards, responsive CSS, and primary navigation style.
- Marketplace search field, category rail, type selector, Free toggle and filter layout.
- Existing conditional Sell/Rent/Exchange/Create/Edit form design; listing detail page and request form structure.
- My Activity's three sections, request-status cards and most action-button presentation.
- Basic admin listing moderation form with a required hide reason.
- Existing `src/visuals.jsx` placeholders and the design language in `src/style.css`.

**Do not:** replace React with a different framework, convert the whole frontend to TypeScript, import a new UI kit, restyle all pages, introduce chat/payment/delivery/multi-university/account-deletion features, or add API endpoints not in the frozen contract.

### Baseline source audit (before edits)

| Existing file (relative to `frontend/`) | Current code and issue | Preserve / modify |
|---|---|---|
| `src/main.jsx` | Hash routing, marketplace filters and cards, `demoStore` session, admin nav, demo account switcher | Preserve visuals; implement proper routes, auth states, 20-item pagination; remove production demo switcher |
| `src/screens.jsx` | `Account`, `ListingForm`, `ItemDetails`, `RequestCard`, `Activity`, `Admin`; currently mixed demo logic and forms | Update only necessary screens/handlers; split components if useful, but no redesign |
| `src/market.js` | Old `CATEGORIES`, `CONDITIONS`, `PICKUP_POINTS`, client-only `updateMarket()` state machine | Correct exact enums; isolate **development** state simulation; do not make it the production source of truth |
| `src/demo-store.js` | Browser `localStorage`, universal demo password and simulated verification | Migrate demo behavior to **development-only** mocks; never ship demo sign-in/verification in production |
| `src/style.css` | Existing site design and responsiveness | Keep, append only focused styles for new screens/dialogs/loading states |
| `src/visuals.jsx` | Card visuals and category-dependent placeholders | Preserve; fix any obsolete category-specific references |
| `src/market.test.js` | Four demo state tests | Keep or adapt to mocks; add UI/contract tests |

**Audit fact:** No real `/api/v1` HTTP integrations were present in the supplied ZIP. The four existing local tests passed on the supplied source. That does **not** mean the real API or production build was tested.

---

## 1. Fixed product rules that the UI must reflect

| Topic | Approved rule |
|---|---|
| University | **One university** / one common marketplace; initial approved official email domain `seu.edu.bd` |
| Signup | `fullName`, `displayName`, `universityEmail`, `password` **only**; no university ID/manual review |
| Login | University email + password only; no hardcoded demo account or password |
| Email verification | Link valid **60 minutes**, single use; resend at most **5 times per account per rolling hour** |
| Forgot password | Link valid **30 minutes**, single use; generic acknowledgement if email is unknown |
| Account | **No self-service account deletion** in MVP |
| Listing actions | Owner can **Edit**, **Close**, **Delete Post** only when `status=available`, not hidden, not deleted; Delete is soft-delete and cancels pending requests |
| Admin-hidden | Owner sees Hidden + reason, cannot edit/close/delete/unhide; return confirmation still works for checked-out loans |
| Types | `sell`, `donate`, `rent`, `exchange`, `free_borrowing` |
| Categories | Exactly **8** fixed categories (table in Section 4) |
| Conditions | Exactly **5** fixed values (table in Section 4) |
| Photo | **0 or 1** per post; JPG/JPEG, PNG, WebP; **max 5 MiB = 5,242,880 bytes**; **Supabase Storage Free** direct signed browser upload, **not Cloudinary** |
| Marketplace | 20 per page + **Load More**; server cursor; resets on search/filter change |
| Pickup | Owner provides required **free-text** `pickupPoint` (3–120 chars) and future `pickupAt`; no fixed-location dropdown |
| Exchange | Owner-only explicit acknowledgement: **“I confirm that both items have been exchanged successfully.”** |
| Time and money | Campus timezone **Asia/Dhaka**; API timestamps ISO UTC; dates `YYYY-MM-DD`; amount strings like `"450.00"` |
| UI language | English UI labels, navigation, validation and statuses; user-written Bangla must display correctly |
| Admin | Domain add/activate/deactivate + listing moderation; no student approval queue, unhide or private pickup display |

Keep all authorization in the backend later. UI should hide unavailable actions **and** handle 403/409 errors correctly; hiding a button is not a security boundary.

---

## 2. PRIORITY P0 — Frontend UI changes required before handoff

Each item is a discrete AI task. Implement **minimum surgical diffs**; add tests for each group. The `src/screens.jsx` line locations below refer to the *original uploaded ZIP* and will shift after refactoring.

### FE-01 · Registration screen — replace manual-ID flow
**Baseline:** `src/screens.jsx` → `Account` (approx. lines 49–129); `src/demo-store.js`.

- Keep existing auth-page layout and Register tab. Remove **“Verify with a university ID instead”**, University ID input, “university email or student ID” copy, simulated approval states, and fixed demo password instructions.
- Add labeled required fields `fullName`, `displayName`, `universityEmail`, `password`; choose clear autocomplete attributes; password min length 8; show/hide password control may remain.
- Use `name@seu.edu.bd` as **placeholder/example**, not a permanently hardcoded exclusive frontend rule; backend approved domains may change.
- Show field errors (`error.details.fields`) inline without wiping valid entries; duplicate email and inactive domain errors should be understandable.
- On mock success, show **“Check your university email”** and navigation to status/sign-in, not instant verified access.
- **Acceptance:** no student-ID path, no fake verification, no publicly selectable user role; success uses `POST /api/v1/auth/register` DTO in mock.

### FE-02 · Sign in, sign out, session/status
**Baseline:** `src/screens.jsx` → `Account`; `src/main.jsx` approx. lines 91–148 and 161–181.

- Sign-in fields: `universityEmail`, `password`; no “University email or ID”, universal sample password or **Try demo account** button.
- Display wrong-credential generic error and 429 lockout/retry state; show loading while action is pending; prevent duplicate submissions.
- Represent these four states: signed out, signed in but `unverified`, signed in + `verified`, admin verified. Only verified members may reach marketplace routes.
- Add real-looking sign-out button; mock auth change follows contract; do **not** persist production auth/user state in localStorage.
- Existing self-profile editor in `Account` has **no PATCH profile endpoint in the frozen contract**. Remove the editable profile-save action; if a profile summary is useful, show **read-only** `displayName`/own email. Do not invent an endpoint.
- **Acceptance:** session-expired message and correct redirects; existing admin can still use regular member UI.

### FE-03 · Email verification and resend
**Baseline:** simulated “open verification link” under `Account`; no dedicated live-flow result page.

- Add `/verify-email?token=...` outcome UI with **Verifying...**, **Verified**, **Expired/Invalid/Already Used** states and retry guidance.
- Remove sensitive token from URL promptly after reading it; no printing token to console/logs, localStorage or analytics.
- Add `/status` for unverified signed-in user: clear verification pending message, Resend Verification action, server-driven `canResend`, 60-minute expiry explanation, rate-limit messaging (5/h).
- Remove “Simulate opening the link”, Pending manual review and Rejected university ID states.
- **Acceptance:** mocks for success, used/expired, unverified, 429, network failure; account cannot browse as verified merely by clicking a local UI toggle.

### FE-04 · Forgot Password / Reset Password screens
**Baseline:** missing from uploaded ZIP.

- On sign-in add **Forgot password?** link to `/forgot-password`.
- `/forgot-password`: labeled university email input, submit loading, **generic** acknowledgement regardless of whether account exists, 429 state.
- `/reset-password?token=...`: new password and confirm password; local match/min-8 checks, used/expired link UI; remove token from URL and never persist it; success returns to sign-in.
- State that reset links last 30 minutes; do not request old password, do not reveal account existence.
- **Acceptance:** all screens work with mock success/error scenarios; exact contract fields `{universityEmail}` and `{token,newPassword}`.

### FE-05 · Exact categories and conditions everywhere
**Baseline:** `src/market.js` top constants; `src/main.jsx` category rail and hero placeholder categories; `src/screens.jsx` listing form.

- Replace legacy categories with exact 8 seeded records (Section 4). Show **display names** in UI, submit category **ID** for listing create/edit, use `code` for feed filters.
- Replace condition strings with exact 5 label-to-enum mappings (Section 4); no old `Like new` or obsolete `Study Supplies` enum sent to API.
- Ensure listing cards, filters, create/edit, details and visual placeholders behave with all eight categories; use neutral fallback for `other`.
- **Acceptance:** no invalid old options; all eight and five appear accurately on mobile and desktop.

### FE-06 · Listing form: validation, type, edit/version
**Baseline:** `src/screens.jsx` → `ListingForm` approx. lines 143–243.

- Reuse existing one-form layout; preserve conditional Paid→Sell/Rent, Donate, Exchange and Free Borrowing flows.
- Submit exact enum DTOs (`sell/rent/...`), `amountBdt` fixed 2-decimal **string**, `exchangeTerms`, `categoryId` and `condition`; never send display labels or JS floating-point price as API values.
- Required: title 3–100 characters, description 10–2000, exchange terms 1–500 (server contract governs precise validation), paid amount positive and ≤9,999,999.99 BDT. Maintain client-side immediate feedback but do not silently coerce invalid data.
- On Edit, require `version` from loaded listing; if listing type/price/exchange terms change, warn: **“Changing these terms will cancel all pending requests.”** Show confirmation before save.
- On HTTP 409 `VERSION_MISMATCH`, preserve the unsaved form; offer **Reload latest listing** / Cancel rather than blindly overwrite.
- Never show Edit to owner for reserved, checked-out, hidden, completed, closed or deleted listing.
- **Acceptance:** preserving entered fields on 400/409/network error; no accidental wrong enum/price sent.

### FE-07 · Photo input and retry UI (Supabase Storage; not Cloudinary)
**Baseline:** `src/screens.jsx` `MAX_PHOTO_BYTES` near line 12; photo field approx. lines 224–238; existing FileReader/base64.

- Raise limit from 1 MiB to **5 MiB** and update UI hint and error text. Allow only JPEG, PNG, WebP; one optional image per listing.
- Show selected-photo **preview**, clear/change/remove current photo, uploading progress or working state, failure and **Retry**. Preserve all other form fields if upload fails; user can post without a photo.
- UI architecture: (1) `POST /listings/photos/sign` metadata → (2) browser **direct-to-Supabase** signed URL/token upload → (3) `POST /listings/photos/confirm` → (4) attach returned `photoAssetId` to create/edit form.
- Backend not built yet: use a mock upload adapter reproducing **these same states and response shapes**; never upload actual bytes to a made-up endpoint.
- Never store base64 in localStorage; never expose Supabase service-role key to the browser. No Cloudinary URL/SDK.
- **Acceptance:** exactly 5 MiB allowed by client validation; >5 MiB rejected; invalid type rejected; retry and post-without-photo work without loss of form state.

### FE-08 · Marketplace: keep design, add server-cursor pagination
**Baseline:** `src/main.jsx` → `Marketplace` approx. lines 28–89.

- Keep hero, card grid, search input, category rail, type buttons, Free toggle, clear filters.
- First page has **max 20** listings. **Load More** appends another page; hidden/disabled while loading; hide when `nextCursor:null`.
- Replace production `filterListings()` as data authority with API-shaped list queries `q`, `category` (code), `type` (enum), `free=true`, `limit=20`, `cursor`.
- On any search/filter change: discard old cursor/results, request page one; cancel/ignore stale in-flight responses to avoid mixing filters. Debounce title search sensibly. Never append duplicate IDs.
- `free=true` includes both Donate and Free Borrowing. Avoid contradictory type+free queries.
- Show loading skeleton/progress, empty no-match state, retriable error, and end-of-results feedback.
- **Acceptance:** mock dataset >40 posts yields 20/20/remainder correctly; filter reset and rapid searches never mix results.

### FE-09 · Listing details + request form
**Baseline:** `src/screens.jsx` → `ItemDetails` approx. lines 249–291.

- Keep details layout and Request Item action for available visible **other-owner** items only; no self-request.
- Sell/Donate: no date fields; Rent/Free Borrowing: date inputs, pickup date not before campus **today**, return strictly later and within 365 campus days; Exchange: offered-item description required.
- Rent price/day from API string; locally computed estimated fee may be shown as **estimate**, but accepted/response fee **must come from backend** when integrated; never float-authoritative.
- Show clear submitted request state, duplicate-active-request conflict and listing-gone conflict.
- **Acceptance:** UI only reveals fields relevant to selected listing type and handles all request statuses.

### FE-10 · Delete Post (new) + Close confirmation
**Baseline:** `src/screens.jsx` → `Activity` My Listings approx. lines 323–348.

- Add **Delete** action beside Edit/Close for owner-visible `available && !isHidden` undeleted posts; not to all listings.
- Confirmation modal must say: **“Delete this listing? All pending requests will be cancelled. This action cannot be undone.”** Have `Cancel` and `Delete Listing` actions; show an actual loading state and prevent double submit.
- Deleting posts is **soft delete**; UI removes the post from regular My Listings and Marketplace after confirmed success, but authorized request history may retain a historical snapshot.
- Keep **Close Listing** as a separate action, also with confirmation; do **not** equate Close with Delete.
- No Account Delete control in account page or navigation.
- **Acceptance:** delete only on allowed listings, 204 success handled with no JSON body, 409 preserved state and explanatory message; no accidental immediate deletion on single tap.

### FE-11 · My Activity: owner/requester lifecycle
**Baseline:** `src/screens.jsx` → `RequestCard` and `Activity` approx. lines 292–348.

- Keep **My Listings**, **Requests Sent**, **Requests Received** tabs. Show statuses `pending`, `accepted`, `declined`, `cancelled`, `checked_out`, `completed` with friendly English labels.
- Pending requester: Cancel; pending owner: Accept/Decline; accepted: either participant Cancel (before handover), owner Record Handover; checked_out owner Confirm Return; final statuses: history only.
- Dates, rental total, offer terms and pickup display must reflect API response. Pickup point/time visible **only to the exact owner/requester participants**; never expose via general listing cards or admin screens.
- Keep history for completed/closed; overdue text for checked-out loan when return date before campus today. All activity lists should support paginated result/empty/error states.
- **Acceptance:** button availability matrix matches contract; no UI action available for final request status; sender sees only own requests.

### FE-12 · Pickup Accept: free text, date/time constraints
**Baseline:** `src/screens.jsx` → `RequestCard` accept form approx. lines 309–318; `src/market.js` `PICKUP_POINTS` list.

- Replace `<select>` pickup locations with text input/textarea **`pickupPoint`**, required 3–120 characters. No predefined list, no admin location manager.
- `pickupAt` required with campus-local picker, convert to ISO UTC for API; time cannot be in the past. For Rent/Free Borrowing it must fall on the request's **proposed pickup calendar day** in Asia/Dhaka.
- If proposed pickup date has already passed by the time of acceptance, show explainable error; cannot accept a past pickup. Server remains final authority.
- **Acceptance:** no `PICKUP_POINTS` production use; correct handling of timezone and server validation errors.

### FE-13 · Explicit Exchange completion
**Baseline:** `RequestCard` → current generic “Confirm both handovers” action.

- For owner + **accepted exchange** only, show **Confirm Exchange** that opens a confirmation dialog.
- Dialog includes exact checkbox or explicit acknowledgement: **“I confirm that both items have been exchanged successfully.”** Button disabled until user acknowledges.
- Submit `POST /requests/:id/handover` with `{ "confirmBothItemsExchanged": true }` only after acknowledgement. Do not require requester to press a second button.
- Other types retain their existing handover/return UI.
- **Acceptance:** no one-click exchange completion; final status switches to `completed` only after simulated confirmed response.

### FE-14 · Admin-hidden listing: read-only owner visibility
**Baseline:** `src/screens.jsx` `Activity` and `RequestCard`; `src/market.js` `hide`/`return` demo cases.

- Show hidden own posts in My Listings with **Hidden** label and **exact admin reason**. No Edit, Close, Delete, Unhide buttons on hidden listings.
- Hide removes public feed item. When accepted/reserved listing is hidden, request becomes cancelled and listing remains invisible. If checked-out loan is hidden, return is still possible.
- **Critical:** on hidden checked-out return, request→`completed`, listing status→`available`, **`isHidden` stays true**. The old demo code incorrectly sets `Closed`: fix test/fixtures as well.
- **Acceptance:** admin cannot see another user's pickup details; owner can confirm return for hidden checked-out loan.

### FE-15 · Admin panel: domains + moderation; no manual approvals
**Baseline:** `src/screens.jsx` → `Admin` approx. lines 351–379.

- Remove **Verification Queue**, University ID Approve/Reject buttons, and obsolete University ID data from production UI.
- Add `/admin/domains`: table/list with `domain`, `isActive`, Add Domain input, Activate/Deactivate confirmation, field errors, success/failed request messages. The initial domain is `seu.edu.bd`; admin can add only other approved official same-university domains.
- Add `/admin/listings`: maintain existing moderation design; list/search/filter status/hidden, open listing info safe for admin, hide with mandatory reason (3–500 characters); no unhide button.
- Admin nav shows Domains / Listings. Member sees no admin routes or nav. Admin also has ordinary Marketplace access.
- **Do not add audit history UI** just because demo has one; audit logging is a backend responsibility. Avoid showing private pickup, university email, token details or other members' private information.
- **Acceptance:** admin-only guards in UI; mock unauthorized / empty / error states; domain toggle reason and effect clearly communicated (deactivation blocks new signups, not verified member sign-in).

### FE-16 · Remove outdated demo-only production UI
**Baseline:** `src/main.jsx` `demo-bar` (approx. lines 178–182), `src/demo-store.js`, `src/screens.jsx` auth copy.

- Remove demo account switching footer, universal demo login, fake student ID approval, fake “verify” button, hardcoded known password instructions, and localStorage as production source of auth/marketplace truth.
- Create an isolated mock implementation activated explicitly **only in development/tests** (`import.meta.env.DEV` plus explicit flag if needed). It may use in-memory fixtures, but production cannot silently fall back to mock data.
- Keep fixtures useful for visual review (verified member, unverified, admin, own/other listings, hidden/checked-out history, 50+ feed results, expired links, 409 and 429 errors).
- **Acceptance:** production build has no user-visible demo controls; test setup can still switch mock personas through a development-only harness.

---

## 3. PRIORITY P1 — UI readiness, routing, accessibility and reliability

### FE-17 · Client routing and navigation
- Support `/`, `/signin`, `/register`, `/verify-email`, `/status`, `/forgot-password`, `/reset-password`, `/marketplace`, `/listings/:id`, `/post`, `/listings/:id/edit`, `/activity`, `/admin/domains`, `/admin/listings`.
- Use React Router or the smallest maintainable equivalent; preserve the existing visual navigation. Handle direct URL reload on Vercel SPA using an appropriate rewrite/fallback configuration (coordinate with deployment owner; don't deploy yourself).
- Distinguish guest, unverified, verified member, admin; avoid redirect loops, flashes of unauthorized private UI or arbitrary local role toggles.

### FE-18 · Shared API adapter (contract-ready; not real backend implementation)
- Add a small typed-by-contract JS service layer, e.g. `src/services/apiClient.js`, `authService.js`, `listingService.js`, `requestService.js`, `adminService.js`, `photoService.js`.
- API requests use base `/api/v1`, `credentials: 'include'`, `x-csrf-token` on writes, unified `{data:...}` parsing, `204` with no body, `error.code`, field errors, `Retry-After` for 429.
- Without a backend, use **dev-only contract-shaped mock implementations**; avoid hardcoding a fabricated live host or using secrets. The frontend should be able to switch adapters without changing UI component state logic.
- Keep per-request private data separate; do not store university email or pickup details in public listing cache.

### FE-19 · Comprehensive loading / error / empty states
- Screen loading skeleton/indicator and disabled submit while in flight.
- 400 field validation, 401 session expiry, 403 unverified/forbidden, 404 unavailable, 409 conflict/stale version/duplicate request, 413/415 photo invalid, 429 lockout/rate limit with retry instructions, 500/502/transport failure with retry.
- Keep user-entered form values and file selection when possible; never display success before mock/API actually resolves.
- No `alert()` dependence for essential information; use inline alert/status/dialog patterns.

### FE-20 · Responsive + accessible UI, English strings
- At 360px, 375px, 768px and desktop: no horizontal page overflow, clipped dialogs or unreadable tables. Keep current design identity.
- Keyboard navigation and focus visible; dialog focus trap/escape/restore; labels, error `aria-describedby`, live regions for asynchronous status, action buttons named correctly.
- Do not rely on color alone for statuses; use readable text. Minimum 44px primary touch controls where practical.
- UI chrome in English only; safe rendering of student-entered Bangla; no `dangerouslySetInnerHTML`.
- Centralize new UI strings in a lightweight strings/constants module without rewriting every unchanged label.

### FE-21 · Test fixtures, automated tests and screenshot evidence
- Keep/update four existing tests. Add tests for FE-01–FE-20: auth states, exact 8/5 enums, rent date validation, partial edit/version, 20-page cursor handling, delete dialog, hidden-return state, explicit exchange confirmation, admin permissions, mock error states.
- Run actual `npm test` and `npm run build`. If packages are missing, install with lockfile or report the dependency blocker honestly; do not claim the build passed based on code inspection.
- Verify browser behavior at 360px and desktop, and capture evidence listed in Section 8.

---

## 4. Exact dropdowns, enums, DTO shape (no improvisation)

### Eight categories

| UI label | API category `code` |
|---|---|
| Books & Notes | `books_notes` |
| Electronics | `electronics` |
| Stationery | `stationery` |
| Lab Equipment | `lab_equipment` |
| Furniture | `furniture` |
| Clothing | `clothing` |
| Sports | `sports` |
| Other | `other` |

- Fetch categories from `GET /api/v1/categories`; for Create/Edit, send **`categoryId`** from the returned category record. For Marketplace filter, send **`category` code**.
- Provide these eight categories in dev fixtures; the production UI must not invent its own category IDs.

### Five conditions

| UI label | API `condition` |
|---|---|
| New | `new` |
| Like New | `like_new` |
| Good | `good` |
| Fair | `fair` |
| Poor | `poor` |

### Listing types

| UI display | API `listingType` | Money/other required field |
|---|---|---|
| Sell | `sell` | `amountBdt:"450.00"` |
| Donate | `donate` | amount omitted or `"0.00"` |
| Rent | `rent` | `amountBdt:"100.00"` **daily rate** |
| Exchange | `exchange` | `exchangeTerms` (no amount field) |
| Free Borrowing | `free_borrowing` | amount omitted or `"0.00"` |

**Contract-shaped samples (illustrative object IDs only):**

```json
{
  "title": "Scientific Calculator",
  "categoryId": "665ca7a10000000000000021",
  "description": "Calculator in good working condition.",
  "condition": "good",
  "listingType": "sell",
  "amountBdt": "450.00"
}
```

```json
{
  "data": {
    "items": [],
    "nextCursor": null
  }
}
```

**Envelope:** successful JSON `{ "data": ... }`, error `{ "error": { "code": "...", "message": "...", "details": { "fields": {} } } }`; empty-body `204` for Delete and Logout. For complete request/response schemas, **`openapi.yaml` is mandatory**.

---

## 5. Screen ↔ existing frozen API mapping (for frontend service adapters)

| UI screen/action | Frozen endpoint(s) |
|---|---|
| App startup / session / CSRF | `GET /auth/me`, `GET /auth/csrf` |
| Register | `POST /auth/register` |
| Verify/resend/status | `POST /auth/verify-email`, `POST /auth/resend-verification`, `GET /verification/status` |
| Sign in / out | `POST /auth/login`, `POST /auth/logout` |
| Forgot / Reset | `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Marketplace | `GET /categories`, `GET /listings` |
| Detail / Create / Edit | `GET /listings/:id`, `POST /listings`, `PATCH /listings/:id` |
| Close / Delete post | `POST /listings/:id/close`, `DELETE /listings/:id` |
| Photo | `POST /listings/photos/sign`, browser→Supabase signed upload, `POST /listings/photos/confirm` |
| Request item | `POST /listings/:id/requests`, `GET /requests/:id` |
| Accept / Decline / Cancel | `POST /requests/:id/accept`, `POST /requests/:id/decline`, `POST /requests/:id/cancel` |
| Handover / Exchange / Return | `POST /requests/:id/handover`, `POST /requests/:id/return` |
| My Activity | `GET /me/listings`, `GET /me/requests/sent`, `GET /me/requests/received` |
| Admin domains | `GET /admin/domains`, `POST /admin/domains`, `PATCH /admin/domains/:id` |
| Admin moderation | `GET /admin/listings`, `GET /admin/listings/:id`, `POST /admin/listings/:id/hide` |

All paths above are relative to **`/api/v1`**. This table is mapping only—not permission to build a backend now or to modify the frozen contract.

---

## 6. Mock demonstration scenarios required before backend exists

Add a mock adapter or fixtures that can exercise **every** scenario below without production credentials:

| Fixture | Expected UI |
|---|---|
| Guest | Login/register available, marketplace protected |
| Newly registered unverified | Status + resend, cannot enter marketplace |
| Verified member | Browse, create, own listings, requests |
| Verified admin | Marketplace + domains + moderation; no unrelated pickup visibility |
| Invalid domain registration | Field-level error without losing form |
| Expired verification / resend 429 | Useful error + retry-after guidance |
| Forgot unknown email | Same generic confirmation as known email |
| Expired reset / mismatched passwords | Correct recovery and validation |
| More than 45 visible listings | First 20 → next 20 → final remainder; no duplicates |
| Five listing types | Correct request-form fields and fee labels |
| Edit conflict | 409 + preserve changes + refresh option |
| Delete eligible vs reserved/hidden | Confirmation available only when eligible; invalid state feedback |
| Admin-hidden checked-out loan | Owner sees reason and can confirm return; still hidden after |
| Exchange accepted | Explicit confirmation required before completed |
| Upload 5 MiB / 5 MiB+1 / wrong type / failed upload | Allow / reject / reject / retry without losing form |
| Session expires while using UI | Auth state refresh, sign-in route, no private-data leak |

**Development fixtures are not real server evidence**. A `mockApi` switch must be explicitly disabled in production. Never imitate a real university email having been delivered.

---

## 7. Suggested AI implementation order (small, reviewable changes)

| Phase | Tickets | Scope | Gate |
|---|---|---|---|
| 0 | Audit + scaffolding | Inspect exact source, docs, tests; add no visual redesign; plan files | Existing `npm test` baseline recorded |
| 1 | FE-05, FE-16, FE-17, FE-18 | Shared enums, dev mock adapter, route/auth scaffolding | All routes accessible in dev mock and contract keys match |
| 2 | FE-01–FE-04 | Register/Login/Verify/Resend/Forgot/Reset/Status | Signed-out/unverified/verified flows and error states demonstrated |
| 3 | FE-06–FE-09 | Listing form, photo, Marketplace load more, item request | 5 types, 8/5 enums, 5 MiB states, pagination tests |
| 4 | FE-10–FE-14 | Delete, Close, lifecycle, pickup, exchange, hidden listings | Confirmation and permissions/state fixtures pass |
| 5 | FE-15 | Admin Domains + Listing Moderation | No manual ID review, no private pickup shown |
| 6 | FE-19–FE-21 | Error/empty/loading, mobile/a11y, final test/build | QA evidence and remaining blockers documented |

**AI execution rule:** Work phase-by-phase. At the end of *each* phase provide a short diff summary, affected files, test output, screenshots if possible, known issues, and next-phase readiness. Do not claim an entire phase passed without running the checks.

---

## 8. Definition of Done (send this proof back to the team)

- [ ] Existing design and layout preserved; no unnecessary rewrite or new UI library.
- [ ] No University ID/manual review, fake demo password, demo account switcher or fake verify button in production UI.
- [ ] Register/Login/Verify/Resend/Status/Forgot/Reset all render and work with development mocks.
- [ ] Exact 8 categories, 5 conditions and 5 listing types throughout cards/forms/details/filters.
- [ ] Photo selected/preview/remove/retry + 5 MiB client limit + Supabase upload adapter prepared.
- [ ] Marketplace 20/page Load More and cursor-reset/rapid-filter behavior tested.
- [ ] Eligible owner's Edit, Close and **Delete Post** exist; no Account Delete action.
- [ ] Delete and Close use distinct confirmation dialogs; 409 and 204 handled correctly.
- [ ] Free-text pickup and future-time constraints; exchange requires deliberate owner acknowledgement.
- [ ] Hidden listing shows owner hide reason, no owner editing controls; checked-out return works correctly.
- [ ] Admin Domains + Moderation implemented; no student manual approval queue.
- [ ] Error/empty/loading/retry states visible and accessible; user input preserved.
- [ ] Deep-link reloads work in local preview/Vercel SPA routing configuration is documented.
- [ ] Responsive at 360/375/768/desktop, accessible keyboard/dialog focus and English system strings.
- [ ] `npm test` and `npm run build` actually run and results included; no false build/deploy claims.
- [ ] A short implementation report includes a file-level change list, per-ticket checkboxes, blocked items, mock-vs-real distinctions and screenshot evidence.

**Evidence requested from frontend developer:** screenshots/video for Register, Login, Verify success/expired, Forgot/Reset, Marketplace Load More, New/Edit Listing + photo failure, Delete dialog, My Activity accepted/checked-out/history, Exchange confirmation, hidden listing reason, Admin Domains/Moderation, 360px mobile. Also submit a committed branch/PR (preferred) or updated frontend ZIP and a simple test results report.

---

## 9. Ready-to-paste AI coding prompt (give to the frontend developer)

```text
You are the frontend implementation engineer for UniCircle.

Read the attached UniCircle_Frontend_UI_Fix_Handoff_FINAL.md in full.
Read the repository's PRD.md, API_CONTRACT.md, openapi.yaml,
ARCHITECTURE.md, DATABASE.md and AGENTS.md before editing.

The supplied React/Vite frontend ZIP is the authoritative STARTING CODE.
Do not generate a new app, redesign existing pages, change framework,
replace CSS wholesale, create backend endpoints, or modify the frozen API.
Reuse existing components/styles and make minimal, testable changes.

Backend does not exist yet. Implement the UI against isolated,
contract-shaped development mocks and a swappable API service adapter.
No demo accounts, universal demo passwords, fake verification actions or
localStorage authentication may appear in a production build.

Implement FE-01 through FE-21 in the document in its specified phases.
Prioritize P0 before polishing. Use exact frozen API enum and DTO names,
Supabase Storage (not Cloudinary), university email registration,
20-item Load More, eligible Edit/Close/Delete, free-text pickup,
explicit owner-only exchange confirmation, and Admin Domains.

For each phase:
1. Inspect existing files and state exactly what you will modify.
2. Make small diffs; do not disturb working UI.
3. Add/update mock fixtures and automated UI/logic tests.
4. Run npm test and npm run build if dependencies are available.
5. Report changed files, test outputs, screenshots/verification,
   unfinished items, and API-contract questions.

Do not claim production APIs, email delivery, Supabase upload, Vercel deploy,
or end-to-end integration are operational. Stop at UI/contract readiness.
If product docs conflict, report the exact conflict; do not invent a rule.
Begin with Phase 0, then Phase 1.
```

---

## 10. Out of scope for this frontend task

- Real Node/Express backend implementation, MongoDB indexes/transactions, real email provider, database migrations, production secrets, domain DNS configuration, or Vercel production deployment.
- Changing frozen `/api/v1` endpoint methods/paths, adding a profile-update endpoint, new account deletion or manual verification workflows.
- Replacing Supabase Storage with Cloudinary or any other provider without explicit approved product/architecture change.
- Multi-university, payment gateways, message/chat, delivery system or features absent from PRD.

**Final handoff status:** This specification is ready to give to the frontend developer and their AI assistant. It describes **required work**, not completed code. The backend/API still needs implementing later; development mock success does not imply live-service readiness.
