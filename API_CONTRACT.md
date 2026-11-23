# UniCircle — FINAL Unified REST API Contract v3.0 (Frontend + Backend)

**Date:** 2026-11-23 · **Base path:** `/api/v1` · **Contract state:** **FROZEN INTERNAL IMPLEMENTATION BASELINE** (changes require versioned PRD + OpenAPI update).  
**Sources:** `PRD.md` v3.0 and the supplied React ZIP UI audit. This contract formalizes response bodies not completely specified by PRD. **DO NOT IMPLEMENT endpoints not listed here.**  
**Frozen providers:** Vercel target; `seu.edu.bd` initial domain; **Supabase Storage Free** direct signed uploads; MongoDB Atlas application database. No multipart photo API.

## A. Universal contracts

| Concern | Frozen contract choice |
|---|---|
| URL / JSON | `/api/v1`; UTF-8 JSON; camelCase keys; snake_case enum values; strict input validation |
| IDs | MongoDB `ObjectId` rendered as **24 lowercase hex-character** strings. Invalid IDs → 400 `VALIDATION_ERROR` |
| Success | `{ "data": <payload> }` for JSON responses; 204 has **no response body** |
| Failure | `{ "error": { "code": "...", "message": "safe English sentence", "details": { "fields": { "field": "error" } } } }` (`details` may be `{}`) |
| Pagination | `{ "data": { "items": [ ... ], "nextCursor": string|null } }`; default `limit=20`, max 50; signed/opaque cursor by `(createdAt,_id)`; stable sort newest first |
| Currency | Request/response money fixed 2-decimal BDT string, e.g. `"100.00"`; database uses **integer poisha** |
| Times | UTC ISO 8601 timestamps (`...Z`); campus dates are `YYYY-MM-DD` **Asia/Dhaka** calendar days |
| Auth | `uc_session` opaque HttpOnly/Secure/SameSite=Lax cookie; `credentials: 'include'`; no bearer/localStorage auth |
| CSRF | `GET /auth/csrf` establishes signed pre-auth token for public POST; `POST /auth/login` returns new session CSRF token; `x-csrf-token` required on all unsafe methods, Origin checked |
| Visibility | Verified users only for marketplace; owner can see own hidden listing with reason; request pickup data only to that **specific** owner/requester; admin may not see unrelated pickup |
| Server | Enforces validation, auth/role/ownership, rate limits, status machines, photo ownership, money and time math; never trust frontend mock state |
| Empty query | `items:[]`, `nextCursor:null`; not a server error |
| Caching | Auth/private JSON `Cache-Control: no-store`; no private responses in public/CDN caches |

### Response shapes (v3.0)

- `UserSelf`: `{id,fullName,displayName,universityEmail,role,verificationStatus}`; the authenticated user's **own** email may appear here.
- `OwnerPublic`: `{id,displayName}` only (no email/fullName).
- `Category`: `{id,code,name}`; seed eight immutable records.
- `ListingSummary`: `{id,title,category:{id,code,name},condition,listingType,amountBdt,exchangeTerms,photoUrl,owner:{id,displayName},status,createdAt}`; used in feed, excludes private data. `exchangeTerms` can be present on detail only if desired; the OpenAPI examples use nullable value.
- `ListingDetail`: `ListingSummary` plus `description,version,isHidden,hiddenReason?` (only owner can receive hiddenReason). No related user's universityEmail.
- `RequestDetail`: `{id,listingId,requester:{id,displayName},listingType,status,termsAmountBdt,listingExchangeTerms,proposedPickupDate,returnDate,rentalFeeBdt,offeredItemDescription,pickupPoint?,pickupAt?,handedOverAt?,returnedAt?,cancellationReason?,createdAt}`. `pickupPoint` and `pickupAt` only owner+that requester.
- `ApprovedDomain`: `{id,domain,isActive,createdAt,updatedAt}`.
- `PhotoAsset`: `{photoAssetId,secureUrl}` only after backend has verified Supabase Storage object metadata + magic bytes and ownership.

**Historical ambiguity resolved:** Earlier source versions used mixed success payloads; this final contract consistently uses `{data: ...}`. PRD v3.0 uses this envelope. Some fields such as `photoAssetId` are internal transient upload tokens; never allow arbitrary `photoUrl` POST.

## B. Auth and public endpoints (11)

| # | Method / path | Guard | Request | Success | Selected errors |
|---|---|---|---|---|---|
| 01 | `GET /health` | Public | None | `200 {data:{status:"ok"}}` | 503 outage (sanitized) |
| 02 | `GET /auth/csrf` | Public | None | `200 {data:{csrfToken}}` + signed preauth CSRF cookie | 500 |
| 03 | `POST /auth/register` | Public + CSRF | `{fullName,displayName,universityEmail,password}` | `201 {data:{account:{id,verificationStatus:"unverified"},emailSent:boolean}}` | 400 invalid/inactive domain/fields; 409 already registered; 429 |
| 04 | `POST /auth/verify-email` | Public + CSRF | `{token}` | `200 {data:{verificationStatus:"verified"}}` | 400 token invalid/used/expired/inactive domain |
| 05 | `POST /auth/resend-verification` | Public + CSRF | `{universityEmail}` | `202 {data:{message:"If eligible, a verification email will be sent."}}` | 429 rate-limit; nonexisting email gets same 202 |
| 06 | `POST /auth/login` | Public + CSRF | `{universityEmail,password}` | `200 {data:{user:UserSelf,csrfToken}}` + session cookie | 401 generic; 429 lockout |
| 07 | `POST /auth/logout` | Auth + CSRF | `{}` or no JSON body | `204` + clear cookie | 401/403 |
| 08 | `GET /auth/me` | Auth | None | `200 {data:{user:UserSelf}}` | 401 |
| 09 | `GET /verification/status` | Auth | None | `200 {data:{verificationStatus,canResend}}` | 401 |
| 10 | `POST /auth/forgot-password` | Public + CSRF | `{universityEmail}` | `202 {data:{message:"If the account exists, a reset email will be sent."}}` | 429; nonexisting email same 202 |
| 11 | `POST /auth/reset-password` | Public + CSRF | `{token,newPassword}` | `200 {data:{message:"Password updated. Please sign in again."}}` | 400 invalid/expired, short password, 429 |

Registration domain matching: normalize lower-case, extract full part after `@`, exact-match `seu.edu.bd` (no suffix/substring, no `evilseu.edu.bd`). Admin may activate more official **same university** domains later. Domain deactivation blocks new registration and pending verification from that domain; **already verified members keep sign-in/marketplace access**. No university-ID or manual-review API. Email verification 60 minutes; resend ≤5/account/rolling hour. Password reset 30 minutes; revoke all sessions. Login lockout ≥5 failed attempts/15 minutes → block 15 minutes. Idle session 30 min; absolute 7 days; max 5 active sessions.

### Auth example

```http
POST /api/v1/auth/register
Content-Type: application/json
x-csrf-token: <csrf-token>

{"fullName":"Example Member","displayName":"Example","universityEmail":"example@seu.edu.bd","password":"ExamplePass123!"}
```

```json
{"data":{"account":{"id":"665ca7a10000000000000001","verificationStatus":"unverified"},"emailSent":true}}
```

`GET /auth/csrf` must make a server-verifiable anti-CSRF cookie available for **public** forms. CSRF bootstrap does *not* sign a user in. Authentication after verification may require login.

## C. Categories, listings and signed photos (9)

| # | Method / path | Guard | Request | Success | Errors |
|---|---|---|---|---|---|
| 12 | `GET /categories` | Verified | None | `200 {data:{items:Category[8]}}` | 401/403 |
| 13 | `GET /listings` | Verified | `q?,category?,type?,free?,limit?,cursor?` | `200 {data:{items:ListingSummary[],nextCursor}}` | 400/401/403 |
| 14 | `GET /listings/:id` | Verified + visibility | ObjectId | `200 {data:{listing:ListingDetail}}` | 403/404 |
| 15 | `POST /listings` | Verified + CSRF | ListingCreate body below | `201 {data:{listing:ListingDetail}}` | 400/401/403/409 |
| 16 | `PATCH /listings/:id` | Owner + CSRF | `{version,...allowedListingFields}` | `200 {data:{listing:ListingDetail}}` | 400/403/404/409 VERSION_MISMATCH/STATE_CONFLICT |
| 17 | `POST /listings/:id/close` | Owner + CSRF | `{}` | `200 {data:{listing:ListingDetail}}` | 403/409 |
| 18 | `DELETE /listings/:id` | Owner + CSRF | None | `204` | 403/409 |
| 19 | `POST /listings/photos/sign` | Verified + CSRF | `{fileName,contentType,sizeBytes}` | `200 {data:{upload:{photoAssetId,bucket,path,token,expiresAt}}}` | 400/403/429 |
| 20 | `POST /listings/photos/confirm` | Verified + CSRF | `{photoAssetId}` | `200 {data:{photo:{photoAssetId,secureUrl}}}` | 400/403/409/502 |

**ListingCreate:** `{title,categoryId,description,condition,listingType,amountBdt?,exchangeTerms?,photoAssetId?}`. `condition` exact enum. For `sell/rent`, **amountBdt positive** canonical decimal; `donate/free_borrowing`, amountBdt absent or `"0.00"` (server stores 0); `exchange`, amountBdt **absent**, exchangeTerms required. Never combine amount and exchange. Only one photoAssetId. `PATCH` is a **partial** edit with `{version}` required; `photoAssetId:null` removes photo; omitted retains photo. Price/type/exchange-term changes atomically cancel all pending requests; title/description/category/condition/photo edits do not. `POST .../close` and DELETE cancel pending requests; DELETE is soft delete, invisible in feed and normal My Listings; retained request snapshots remain accessible.

**Browse query:** `category` is seeded category `code` such as `electronics`; `type` lower snake_case enum; `free=true` returns `donate` + `free_borrowing`, unless a contradictory explicit `type` is present (reject combination 400). Cursor is opaque; changed filter invalidates cursor. Search targets listing title only, max 100 chars; feed available AND !isHidden AND deletedAt=null; sort `(createdAt desc,_id desc)`. `limit` default 20, max 50. `GET /listings/:id` allows public-feed-visible listing OR owner's hidden/history detail OR authorized transaction participant's historical listing view (no owner-only hide reason to requester). Deleted listing no normal detail; authorized requests show historical listing snapshot/reference.

### Listing example

```json
{"title":"Scientific calculator","categoryId":"665ca7a10000000000000021","description":"Working calculator in good condition for class.","condition":"good","listingType":"rent","amountBdt":"100.00"}
```

Photo flow is **not** `POST /listings/photo` multipart. Browser sends photo bytes **directly to Supabase Storage Free** with `.uploadToSignedUrl(path,token,file)`. Backend signs only server-generated paths, issues a `photoAssetId`, and confirms its own record + actual object bytes/size/MIME/magic signature before attachment. Supabase upload tokens expire after **2 hours** by provider behavior. Never accept raw user `secureUrl`, arbitrary object path or a claimed `sizeBytes` as sufficient proof. Cleanup unreferenced assets after seven days.

## D. Requests and transaction transitions (7)

| # | Method / path | Guard | Request | Success | Errors |
|---|---|---|---|---|---|
| 21 | `POST /listings/:id/requests` | Verified non-owner + CSRF | `{}` sell/donate; `{proposedPickupDate,returnDate}` rent/borrow; `{offeredItemDescription}` exchange | `201 {data:{request:RequestDetail}}` | 400/403/404/409 duplicate/unavailable |
| 22 | `GET /requests/:id` | Owner or **this requester** | None | `200 {data:{request:RequestDetail}}` | 401/403/404 |
| 23 | `POST /requests/:id/accept` | Owner + CSRF | `{pickupPoint,pickupAt}` | `200 {data:{request:RequestDetail,listingStatus:"reserved"}}` | 400/403/409 race/request not pending |
| 24 | `POST /requests/:id/decline` | Owner + CSRF | `{}` | `200 {data:{request:RequestDetail}}` | 403/409 |
| 25 | `POST /requests/:id/cancel` | Requester (pending), either participant (accepted) + CSRF | `{reason?}` | `200 {data:{request:RequestDetail}}` | 403/409 |
| 26 | `POST /requests/:id/handover` | Owner + CSRF | `{}` sell/donate/rent/borrow; `{confirmBothItemsExchanged:true}` exchange | `200 {data:{request:RequestDetail,listingStatus}}` | 400/403/409 |
| 27 | `POST /requests/:id/return` | Owner + CSRF | `{}` | `200 {data:{request:RequestDetail,listingStatus:"available"}}` | 403/409 |

**Request snapshots:** each request stores listing type, price/rate/exchange terms at request creation, so later edits do not change existing accepted/snapshot terms. For Rent/Borrow validate pickupDate not in past, `returnDate > pickupDate`, 1–365 campus days; Rental fee = dailyRatePoisha × campusDayDifference, <= BDT 9,999,999.99; return fee string from server. Sell/Donate no date fields; Exchange offer description required.

**Accept:** owner enters `pickupPoint` free text (3–120 chars) and `pickupAt` ISO timestamp (now/future). For rent/borrow timestamp's Asia/Dhaka campus day must match request's `proposedPickupDate`; date never past. Acceptance transaction: request pending→accepted, listing available→reserved, all other pending→declined. Exactly one winner in concurrent accepts (50 repeats required). Use MongoDB transaction+conditional guard+partial unique index, not client locks.

**Handover and return:** sell/donate owner marks delivered → request/listing completed; exchange owner explicitly confirms both sides exchanged → both completed; rent/free borrow owner marks handover → request/listing checked_out, then owner confirms return → request completed/listing available. If the listing was admin-hidden while checked_out, it remains `isHidden=true` even after returning, despite `status=available`. Owner can't unhide.

**Cancellation:** pending requester cancels; accepted either participant can cancel before handover, reopening listing if not hidden. Admin hide available cancels pending; hide reserved cancels accepted and restores listing available but still hidden; hide checked_out allows return and preserves history. A request cannot be edited to change dates; submit new request where permitted.

## E. My Activity and Admin (9)

| # | Method / path | Guard | Request | Success | Errors |
|---|---|---|---|---|---|
| 28 | `GET /me/listings` | Verified | `limit?,cursor?` | `200 {data:{items:ListingDetail[],nextCursor}}` | 401/403 |
| 29 | `GET /me/requests/sent` | Verified | `limit?,cursor?` | `200 {data:{items:RequestDetail[],nextCursor}}` | 401/403 |
| 30 | `GET /me/requests/received` | Verified | `limit?,cursor?` | `200 {data:{items:RequestDetail[],nextCursor}}` | 401/403 |
| 31 | `GET /admin/domains` | Admin | None | `200 {data:{items:ApprovedDomain[]}}` | 401/403 |
| 32 | `POST /admin/domains` | Admin + CSRF | `{domain}` | `201 {data:{domain:ApprovedDomain}}` | 400/403/409 duplicate |
| 33 | `PATCH /admin/domains/:id` | Admin + CSRF | `{isActive:boolean}` | `200 {data:{domain:ApprovedDomain}}` | 400/403/404 |
| 34 | `GET /admin/listings` | Admin | `q?,status?,hidden?,limit?,cursor?` | `200 {data:{items:AdminListing[],nextCursor}}` | 400/403 |
| 35 | `GET /admin/listings/:id` | Admin | ObjectId | `200 {data:{listing:AdminListing}}` | 403/404 |
| 36 | `POST /admin/listings/:id/hide` | Admin + CSRF | `{reason}` | `200 {data:{listing:AdminListing}}` | 400/403/404/409 |

Admin listing serializers include id/title/type/status/hide status/ownerDisplayName/hidden reason, timestamps, but **exclude** request-specific `pickupPoint` and `pickupAt`, email and unrelated account details. Domain add/toggle and moderation hide each create audited append-only events in the same MongoDB transaction. An admin may also use ordinary verified-member routes and create own listings. No manual approval, unhide, delete-account or category administration endpoints.

**Owner hidden listing:** `GET /me/listings` displays `isHidden:true,hiddenReason:"..."`; owner cannot edit, close, delete, unhide. Hidden checked-out return still works in requests history.

## F. Exact enums & validation

```json
{
  "listingTypes": ["sell","donate","rent","exchange","free_borrowing"],
  "listingStatuses": ["available","reserved","checked_out","completed","closed"],
  "requestStatuses": ["pending","accepted","declined","cancelled","checked_out","completed"],
  "conditions": ["new","like_new","good","fair","poor"],
  "categories": [
    {"code":"books_notes","name":"Books & Notes"},
    {"code":"electronics","name":"Electronics"},
    {"code":"stationery","name":"Stationery"},
    {"code":"lab_equipment","name":"Lab Equipment"},
    {"code":"furniture","name":"Furniture"},
    {"code":"clothing","name":"Clothing"},
    {"code":"sports","name":"Sports"},
    {"code":"other","name":"Other"}
  ]
}
```

Limits: fullName max100; displayName 2–50; title 3–100; description 10–2000; exchange/offered item max500; pickupPoint 3–120; reason 3–500; password min8; photo ≤5,242,880 B; paid amount ≤9,999,999.99 BDT; date interval 1–365 days; page limit ≤50. All server-enforced. Input normalized NFC without stripping Bangla combining characters, ZWJ/ZWNJ.

## G. Error matrix and privacy controls

| Error HTTP | `error.code` | UI behavior |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Display field errors, preserve state |
| 400 | `TOKEN_INVALID_OR_EXPIRED` | Explain expired/used token, show resend/retry |
| 401 | `UNAUTHORIZED` | Sign-in redirect after refreshing auth state; generic login error |
| 403 | `NOT_VERIFIED`, `FORBIDDEN` | Verification page / Access denied |
| 404 | `NOT_FOUND` | Not found / no access; do not leak hidden records |
| 409 | `ALREADY_REGISTERED`, `DOMAIN_ALREADY_EXISTS`, `VERSION_MISMATCH` | Show user-safe conflict + reload/review |
| 409 | `LISTING_NOT_AVAILABLE`, `REQUEST_NOT_PENDING`, `DUPLICATE_ACTIVE_REQUEST`, `STATE_CONFLICT` | Refresh listing/request status; do not retry automatic state mutation blindly |
| 413 / 415 | `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE` | Photo field error |
| 429 | `SIGNIN_BLOCKED`, `RATE_LIMITED` | Respect `Retry-After`, show English notice |
| 502 | `UPLOAD_FAILED` | Keep form; retry upload or submit without photo |
| 500 | `INTERNAL` | Generic error and log correlation ID (no secrets) |

## H. Contract conformance checklist (must pass before implementation acceptance)

- [ ] OpenAPI validates and enumerates exactly the 36 paths/method operations in the inventory above.
- [ ] All endpoint schemas, statuses, permissions, missing/invalid cases and DTO serializers tested.
- [ ] Browser `credentials:'include'` and CSRF pre-login/post-login tested against actual Vercel routing.
- [ ] Photo upload: client→Supabase Storage signed direct, server verifies same-owner photo asset ownership, 5 MiB, allowed formats, and one-listing association; cannot replay other's photo asset.
- [ ] 50 repeated concurrent accept races yield exactly one success per race, with other pending declined and listing reserved.
- [ ] All private pickup data absent for nonparticipants and admin.
- [ ] Verify PRD v3.0 and OpenAPI use `{data:...}` and both signed-upload endpoints; record any future contract change.

## I. Change control and API authority

This document is the human-readable API semantics for the final internal implementation baseline; `openapi.yaml` is the machine-readable schema. A difference between the two is a documentation defect: **do not guess or code a third behavior**. Record the issue, update both files in the same reviewed change, and add a contract test. Product changes additionally update `PRD.md`; persistence changes additionally update `DATABASE.md`; topology/provider changes additionally update `ARCHITECTURE.md`.

**Freeze scope:** 36 HTTP operations on 32 unique paths; no ad-hoc `/api/v2` routes or backwards-incompatible DTO changes without approval. The endpoint inventory is fixed; implementation is not yet complete.
