# UniCircle — FINAL MongoDB / Mongoose Database Design v3.0

**Source of product rules:** `PRD.md` v3.0 §§5,7–8,12–13; HTTP fields in `API_CONTRACT.md` / `openapi.yaml`. **Database:** MongoDB Atlas (transaction-capable replica set), Mongoose ODM. **Not PostgreSQL.**

## Conventions

- `_id`: ObjectId; API `id` 24-character string.
- Timestamps as BSON Date (UTC); API UTC ISO. Campus calendar-day fields stored as ISO dates `YYYY-MM-DD` validated in `Asia/Dhaka`.
- Monetary values stored as **safe integer poisha**; maximum BDT `9999999.99` -> `999999999` poisha. `Number.isSafeInteger` checks mandatory; JSON boundary uses canonical fixed-two-decimal **string**.
- Explicit validators via Zod (`strict()`) plus Mongoose schema validators and controlled Mongo collection validators. No prod autoIndex; use versioned migration scripts.
- No account deletion: users remain. Post deletion is soft and retains authorized request history.

## Collections, fields, indexes

### `universitySettings`

One document `_id:'primary'`, `universityName` real value provided by operator, `campusTimeZone:'Asia/Dhaka'`; updatedAt. Do not infer official name from email domain without operator verification.

### `approvedEmailDomains`

`{_id,domain,isActive,createdBy,updatedBy,createdAt,updatedAt}`. `domain` normalized lowercase exact-match. Indexes: `unique({domain:1})`, `{isActive:1,domain:1}`. Seed `seu.edu.bd` active for *one* university. Admin may add/toggle other verified official same-university domains; deactivation blocks registration and pending verification, not login for already verified account.

### `users`

`{_id,fullName,displayName,universityEmail,emailDomain,passwordHash,role:'member'|'admin',verificationStatus:'unverified'|'verified',emailVerifiedAt?,createdAt,updatedAt}`. Unique `{universityEmail:1}`; normalized lower-case. Never store universityIdNumber or admin manual status. Privileged role created by offline authenticated bootstrap, not member-input JSON.

### `emailVerificationTokens`, `passwordResetTokens`

Separate collections each `{_id,userId,tokenHash,expiresAt,usedAt?,createdAt}`. Unique `tokenHash`; compound `(userId,createdAt desc)`; TTL cleanup after operational retention (does not replace explicit time checks). Tokens are 256-bit CSPRNG raw values **emailed only**, store SHA-256 hash. Verification expires in 60 min; reset 30 min; one-time conditional consume. Resend/reissue invalidates previous unused token(s) transactionally. Successful reset revokes all sessions.

### `categories`

`{_id,code,name}` unique `code`, seeded eight (see `API_CONTRACT.md`). Not editable by admin. `listings.categoryId` references category ObjectId; query filter by `categories.code` resolved server-side.

### `listings`

```ts
{
 _id, ownerId, title, categoryId, description,
 condition:'new'|'like_new'|'good'|'fair'|'poor',
 photo:null|{storageKey:string,secureUrl:string},
 listingType:'sell'|'donate'|'rent'|'exchange'|'free_borrowing',
 amountPoisha:number|null, exchangeTerms:string|null,
 status:'available'|'reserved'|'checked_out'|'completed'|'closed',
 isHidden:boolean,hiddenReason:null|string,hiddenAt?:Date,hiddenBy?:ObjectId,
 deletedAt?:Date,deletedBy?:ObjectId,
 version:number,mutationVersion:number,createdAt:Date,updatedAt:Date
}
```

Feed predicate: `status='available' AND isHidden=false AND deletedAt=null`. Indexes: feed sort `{status:1,isHidden:1,deletedAt:1,createdAt:-1,_id:-1}`; category/type+feed indexes chosen after `explain()`, owner `{ownerId:1,createdAt:-1,_id:-1}`; title fulltext for title search with safe bounded query (or another explicit indexed title-search strategy). Reject stale `version` on edit; bump on edit. `mutationVersion` conditional update for reservation concurrency (including retry safety).

**Soft delete** only owner, available/unhidden/not-deleted; set deletedAt/deletedBy and cancel pending in one transaction; never physically cascade-remove request snapshots. Hidden listing remains view-only; admin hide actions do not replace lifecycle status. `version` belongs to member edits; internal state mutations should have independent `mutationVersion`.

### `requests`

```ts
{
 _id,listingId,requesterId,
 status:'pending'|'accepted'|'declined'|'cancelled'|'checked_out'|'completed',
 listingType, termsAmountPoisha:null|number, listingExchangeTerms:null|string,
 proposedPickupDate:null|string,returnDate:null|string,rentalFeePoisha:null|number,
 offeredItemDescription:null|string,
 pickupPoint:null|string,pickupAt:null|Date,
 handedOverAt:null|Date,returnedAt:null|Date,cancellationReason:null|string,
 createdAt:Date,updatedAt:Date
}
```

Required partial unique indexes (must create **before** requests are accepted):

```js
db.requests.createIndex(
  { listingId: 1, requesterId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['pending','accepted','checked_out'] } } }
);
db.requests.createIndex(
  { listingId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['accepted','checked_out'] } } }
);
```

Use compound `{listingId:1,status:1}`, `{requesterId:1,createdAt:-1,_id:-1}`. MongoDB index compatibility for partial filter `$in` depends on supported server versions; test migrations against the actual Atlas version before production (use equivalent `$or` if required).

Snapshots immutable after request creation. A user may have only one **active** request per listing. A listing may have at most one accepted/checked_out request. Keep request history after listing deleted/hidden/closed.

### `sessions`

`{_id,sessionHash,userId,csrfTokenHash,createdAt,lastSeenAt,expiresAt}`; unique sessionHash, `{userId:1,createdAt:1}`, TTL cleanup (absolute 7-day age). Auth rejects if inactive 30 min or absolute >7 days (TTL not authoritative). Max five sessions/user, evict oldest transactionally or with retry-safe sequence; revoke all on password reset.

### `loginAttempts` and `emailSendAttempts`

Hash normalized account/email identifiers in rate-limit keys; store attemptedAt/purpose and necessary non-sensitive metadata. Login failure retention 24 hours; email send attempts 24 hours. 5 failed login/15min triggers 15-minute block; verify resend max 5/account/rolling hour and 30/IP/hour; reset 3/account/hour and 10/IP/hour; registration 20/IP/hour. Trust proxy headers only from configured Vercel infrastructure.

### `moderationActions`

`{_id,adminId,actionType,targetType,targetId,reason?,metadata?,createdAt}` append-only in app policy; action types `domain.add|domain.activate|domain.deactivate|listing.hide`. Domain/listing updates and audit inserts in **one MongoDB transaction**. Access restricted. Retain 24 months.

### `photoAssets` (required upload state)

Transient owner-bound upload state: `{_id,ownerId,storageKey,expectedSizeBytes,expectedContentType,status:'issued'|'verified'|'attached'|'rejected',secureUrl?,issuedAt,expiresAt,createdAt}`. Unique `storageKey`; backend generates collision-resistant path; signed upload provider token is **never** stored or logged in plaintext; inspect actual Supabase Storage object size, MIME and file magic bytes before `verified`; bind same-owner asset once to one listing; cleanup orphans after 7 days. Prevent a single asset from being used as another user's listing photo.

## Business transactions (core)

**Accept request:** start Mongo session+transaction; conditionally reserve listing where `status='available', isHidden=false, deletedAt=null`; require `mutationVersion` and `modifiedCount=1`, set accepted request; decline all other pending. Partial unique index backs up exactly-one-live-request. On transient transaction conflict retry whole transaction a small bounded number, re-check conditions, map losing request to 409. Test 50 repeated parallel races and no orphaned `reserved` listings.

**Edit terms / Close / Delete / Hide:** atomic state change plus pending cancellation, including request history. Hidden checked_out retains return. Admin hide reserved cancels accepted and makes listing `available` but invisible. Never use browser/localStorage or process-wide mutex for these state transitions.

**Handover/return:** both the request and listing state change in the same transaction. Exchange must affirm both items exchanged. Return of hidden listing: request `completed`, listing `available`, `isHidden=true`.

**Domain toggle:** audit in same transaction; toggle does not retroactively disable existing verified users. Pending verifications check domain active **when link redeemed**.

## Retention, backups and privacy

PRD v3.0 finalized baseline: audit 24 months, backups 30 days, failed auth attempts 24h, expired token cleanup after 48h, abandoned photos after 7 days; daily backup with RPO/RTO targets 24h. TTL cleanup may be delayed; enforce expiry during reads/writes. Provider-managed backups plus documented restore exercise. Private pickup only in request participant serializers. Logs must not print emails/tokens/secrets/pickup data unnecessarily.

## Automated tests required

1. MongoDB replica-set transaction support and indexes migrated successfully; verify unique partial indexes with negative tests.
2. Two simultaneous accepts repeated 50 times — one accepted and listing reserved, none orphaned.
3. Token reuse, expiry, concurrent reset and inactive-domain verification tests.
4. IDOR owner/requester/admin detail guards and serialization snapshots (pickup fields absent for unauthorized).
5. Edit version race and terms-change pending cancellation; hidden listing view-only; delete eligibility; return of hidden checked_out.
6. Currency integer overflow, dates timezone boundaries, 1–365 rent days and server-generated fee; photoAsset ownership/size/format checks.

## Implementation rules and indexes validation (frozen)

1. All `_id` values remain BSON `ObjectId` except singleton university settings. On the wire, use lowercase 24-character hex `id`; never expose internal `__v`, hashes, email of another member or private pickup outside the request participants.
2. Treat `deletedAt` as **missing/null** consistently in feed predicates; new documents should initialize to null so `deletedAt:null` query matches. In My Listings, exclude soft-deleted posts from the ordinary listing UI, but preserve authorized request history.
3. MongoDB multi-document transactions require an Atlas replica set and an initialized session. On every lifecycle mutation, obtain/conditionally update the parent listing first, then relevant request(s), to serialize competing accepts and ownership changes. Use bounded transaction retries only for retriable MongoDB errors; never retry an already-completed user action blindly.
4. Create **all** unique/partial indexes before opening registration/requests in production; migrations run as a controlled task with test evidence. Test `partialFilterExpression` on the selected real Atlas version.
5. Photo asset lifecycle: `issued -> verified -> attached`, or `issued/verified -> rejected` where validation fails; `attached` is single-use/one listing and one owner. Store optional `attachedListingId` to make uniqueness auditable. When replacing photos or deleting posts, keep a reference if historical records require it; schedule unreferenced object cleanup safely after seven days.
6. Use Redis only if separately approved; login/resend counters must still work across Vercel Function instances. MongoDB atomic counters/unique event records are the baseline; process memory is not an authoritative rate limiter.
7. Scheduled cleanup and daily encrypted backup must run on a **protected external scheduler** or provider job, never `setInterval` inside an ephemeral Vercel Function. Always test backup restore to an isolated replica-set environment.
