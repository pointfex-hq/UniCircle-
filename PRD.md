# UniCircle — Final Product Requirements Document (PRD)

**Version:** 3.0 — Internal Implementation Baseline / API Contract Frozen  
**Prepared:** 23 November 2026  
**Project:** UniCircle | Single-University Shared Marketplace  
**Product decisions:** Consolidated from the team's confirmed decisions through 23 November 2026  
**Project manager (per source PRD):** Suchana Jaman Esha  
**Project approval:** **Internal engineering baseline authorized by the Deputy CTO** (decision conveyed in the project conversation, 23 November 2026). **External/institutional/Pointfex sign-off:** not asserted; obtain separately only if the sponsoring organization requires it.  
**Source:** *UniCircle PRD v1.0*, 22 November 2026, based on *UniCircle SRS v1.1*, 20 November 2026.  
**Audience:** Product team, frontend/backend developers, QA, technical reviewer and AI coding agents (including Codex).  
**Companion frozen documents:** [`ARCHITECTURE.md`](ARCHITECTURE.md), [`DATABASE.md`](DATABASE.md), [`API_CONTRACT.md`](API_CONTRACT.md), [`openapi.yaml`](openapi.yaml), [`AGENTS.md`](AGENTS.md).  
**Documentation freeze:** internal scope and interfaces fixed; this does **not** imply that code, cloud services, institutional signatures, or release testing are completed.

> **Document status.** This is the **internally authorized engineering baseline**, pursuant to the Deputy CTO’s instruction to settle the remaining PRD decisions. It supersedes conflicting implementation wording in PRD v1.0 / SRS v1.1 for this project as specified in §0 and Appendix A. Technical policies in §12/§13/§17 are approved *engineering defaults*, not claims about laws, vendors, verified domain ownership, or third-party institutional signatures. The upstream SRS must be synchronized as an administrative follow-up; absent a separate external signature, do not claim external/Pointfex approval.

---

## Table of contents

0. How to use this PRD; authority and decision log  
1. Product summary, goals and actors  
2. Scope, priorities and exclusions  
3. User journeys  
4. Functional requirements (F01–F16)  
5. Business rules and state machines  
6. Technology stack and system organization  
7. MongoDB data model  
8. Critical algorithms and transactional behavior  
9. API contracts  
10. Administrator specification  
11. Frontend and UX  
12. Constants and validation  
13. Security, privacy and integrations  
14. Testing and acceptance criteria  
15. Task breakdown and responsibilities  
16. Deployment and operations  
17. Decision closure, internal approval and deployment verification  
18. Launch gate  
Appendix A. Source-to-final change matrix  
Appendix B. Requirement traceability  
Appendix C. Codex work instructions

---

## 0. Reading rules, authority and approved decisions

### 0.1 Instructions for humans and coding agents

1. Read **§0–§6** before implementing; then read the full requirements, schemas, API and tests for the assigned task.
2. Never infer a feature from a mockup, example, schema field or suggestion. Build only what is explicitly in scope.
3. For UniCircle engineering, this Deputy CTO–authorized PRD v3.0 overrides inconsistent implementation instructions in PRD v1.0 and the earlier proposed SRS v1.1. Record source discrepancies in Appendix A and synchronize the SRS; do not invent a third-party signature or claim institutional authorization beyond the project approval actually given.
4. Requirement precedence **within this version**: approved product decisions (§0.3) → security/privacy/business invariants (§5/§13) → functional requirements (§4) → `API_CONTRACT.md` / `openapi.yaml` for wire contracts → `DATABASE.md` for persistence → `ARCHITECTURE.md` for deployment → UI (§11) → examples. If a contradiction remains, stop that task, report it and request a decision.
5. Business rules are server enforced. UI validation is for usability, **never** the authoritative check.
6. All material product and technical policies have been fixed for this internal implementation baseline. Actual deployment values (official university name/domain, verified sender, production secrets and host access) are **deployment inputs**, not guessed product decisions. Follow §17’s operational verification checklist before production.
7. Use feature and test IDs for PR reviews and task reports. Report changes, test evidence, assumptions and any deviations.
8. Do not alter the confirmed single-university model into a multi-university product.

### 0.2 Status vocabulary

- **FINAL:** explicitly selected by the team in the product discussion.
- **SOURCE:** preserved from the uploaded PRD where not superseded.
- **ENGINEERING-APPROVED:** Deputy CTO–authorized technical default, subject to ordinary change control.
- **DEPLOYMENT INPUT:** actual institution/provider identity, credentials or access must be verified and populated by operators; not an unapproved product feature.

### 0.3 Confirmed decisions (FINAL)

| ID | Final decision | Implementation implication |
|---|---|---|
| DEC-01 | **One university** in MVP; all verified members share one marketplace. | No university selection, tenant isolation or multi-university admin. |
| DEC-02 | Admin may approve and manage **multiple official email domains belonging to that one university**. | One `universitySettings` record; multiple `approvedEmailDomains` records. |
| DEC-03 | Registration uses **approved university email only**, confirmed by emailed link; **no manual ID path or individual admin approval**. | Remove manual application queues, ID numbers and related endpoints/screens/collections. |
| DEC-04 | Deactivating a domain blocks **new registrations** from it; **existing verified accounts retain access**, listings and transaction history. | Domain status must not revoke already verified members. |
| DEC-05 | Eligible account holders include **students, teachers and staff** who can verify a permitted university email. | Do not present the verification as proof of active student enrollment. |
| DEC-06 | Database is **MongoDB (NoSQL)**. | Replace all PostgreSQL/SQL models, row locks, SQL scripts and backup assumptions. |
| DEC-07 | Exchange is completed **when the owner confirms both items have been exchanged**; requester does not separately confirm. | Owner-only confirmation; single request+listing transaction. |
| DEC-08 | Pickup point is **owner-entered free text** at acceptance; no managed campus-location list. | Validate and store private `pickupPoint`. |
| DEC-09 | Pickup time must be **now or in the future** at acceptance; past pickup dates/times forbidden. | Server clock + campus time-zone validation. |
| DEC-10 | Hidden listings are **view-only to owners**, including the hide reason; owners cannot edit, close or unhide. | Hide flag/metadata and private owner serializer. |
| DEC-11 | Password recovery using registered university email is in MVP. | Single-use reset token; reset revokes existing sessions. |
| DEC-12 | Email domains are managed individually; each can be activated/deactivated. | Unique normalized domains, audited admin actions. |
| DEC-13 | Exactly **eight fixed listing categories** (see §12); admin cannot manage categories in MVP. | Seed constants. |
| DEC-14 | Item condition is one of **New, Like New, Good, Fair, Poor**. | Select + strict server validator. |
| DEC-15 | Interface is **English only** in MVP. | Centralized English strings; no language selector. |
| DEC-16 | Admin account also has normal verified marketplace capabilities; may not view others' private pickup info or edit others' posts. | Combined role permissions; privacy guard remains. |
| DEC-17 | Completed/closed listing and transaction history is retained for relevant authorized participants. | No cascading deletion of history. |
| DEC-18 | **No self-service account deletion**; owners **can delete their own posts** (soft delete with transaction preservation). | Add Delete Post; no Delete Account UI/API. |
| DEC-19 | User can **Edit, Close and Delete** their own eligible listings. | Preserve distinct actions and permissions. |
| DEC-20 | One **optional photo** per listing, max **5 MiB**, JPG/JPEG, PNG or WebP. | Server file signature/type/size checks, Supabase Storage Free asset reference (signed direct browser upload). |
| DEC-21 | Verification email link: **60-minute**, single-use; new resend invalidates previous unused links. | `AUTH.EMAIL_TOKEN_TTL_MIN = 60`. |
| DEC-22 | Verification-link resend: **maximum 5 per account per rolling hour**. | `AUTH.RESEND_PER_HOUR = 5`; add IP limits. |
| DEC-23 | Password-reset link: **30-minute**, single-use. | `AUTH.PASSWORD_RESET_TOKEN_TTL_MIN = 30`. |
| DEC-24 | Marketplace pagination: first **20** listings; **Load More** adds the next 20; cursor pagination. | `PAGING.DEFAULT = 20`. |
| DEC-25 | **Vercel** is the preferred frontend/backend deployment target; backend remains Express REST served through Vercel-compatible functions. | Same-origin `/api/v1` proxy/route and cookies verified during deployment. |
| DEC-26 | Initial approved university-email domain is **`seu.edu.bd`** (exact match); administrators can manage other genuine same-university domains. | Seed after operator authorization; no hardcoded permanent domain restriction. |
| DEC-27 | **No Supabase Storage**. Use **Supabase Storage Free only for listing photos**; MongoDB stays the application database. | Signed direct upload; 2 JSON API calls: sign + confirm; no 5 MiB binary through API. |

### 0.4 Deputy CTO-approved technical closure (ENGINEERING-APPROVED)

The Deputy CTO authorized resolution of the remaining engineering/product-policy choices in this conversation on **23 November 2026**. The following settings are accepted as the working baseline; subsequent modifications require a versioned change record:

| ID | Baseline decision | Detail |
|---|---|---|
| TEC-01 | **Mongoose** is the MongoDB ODM; use transaction-capable MongoDB replica set/managed cluster. | Controlled validators/index migrations, not auto-index creation in production. |
| TEC-02 | **Asia/Dhaka** is the campus timezone. | All campus-day/date comparisons use this named IANA zone; change only via configuration/change control. |
| TEC-03 | Unverified accounts cannot finish verification while their registered domain is inactive. | Retain unverified record; resume/reissue link when domain reactivates. Previously verified users remain active. |
| TEC-04 | Delete Post is available only to owner for `available`, unhidden, undeleted listings. | Closed/completed history cannot be deleted by user in MVP; no special deleted-post archive UI. |
| TEC-05 | §12.2 input/financial limits and §13.2 retention schedule are accepted engineering policies. | Privacy requirements may override via lawful operational handling. |
| TEC-06 | Rate limiting and sessions use §12.2 limits, including **7-day absolute session age** and **up to 5 simultaneous sessions**. | The existing 30-minute idle timeout remains. |
| TEC-07 | Vercel-targeted React/Vite SPA + Node/Express API, transaction-capable MongoDB Atlas, Supabase Storage Free **photos only**, verified transactional email sender, GitHub Actions. | Real accounts, domain authorization, secrets, compliance and backup execution verified before launch. |
| TEC-08 | Photo cleanup retains referenced history images; orphan/replaced unreferenced photos are queued for deletion after 7 days. | Never remove an asset still referenced by retained history. |
| TEC-09 | Re-plan T00–T14 by dependencies and P0/P1 priorities. | Original 10-day duration is a **target**, not an unconditional quality or completion guarantee. |
| TEC-10 | English UI copy is centralized; email sender domain must pass provider/domain verification before launch. | Sender address is deployment input; no hard-coded production email identity. |

### 0.5 Source PRD requirements retained unless changed

Five listing types; one item per listing; marketplace only for verified members; no built-in payments, delivery or messaging; direct handover; owner/participant-only pickup data; server-side sessions, secure password hashing; admin listing moderation; search/filters; request-term snapshots; unique active/live requests; atomic acceptance; My Activity/history; return and overdue behavior; 360px responsive accessibility; backup/restore; tests and task-based implementation.

---

## 1. Product summary, goals and actors

### 1.1 What UniCircle is

UniCircle is a **responsive web marketplace for verified email holders associated with one university**. Users post individual items under their personal profiles. All available listings appear in a **single shared marketplace feed**. Supported types: **Sell, Donate, Rent, Exchange and Free Borrowing**. Students, teachers and staff with a verified address from any **active admin-approved domain of this one university** may sign up. Domain ownership is verified through an expiring email link; there is no manual student-ID review.

A verified member discovers a listing, submits a request, the owner accepts with a private pickup place and time, and the owner records handover. For Rent/Free Borrowing, the owner confirms return. **Payments, if any, are arranged privately at pickup; UniCircle neither processes payments nor manages deliveries.** Student entrepreneurs use ordinary personal Sell listings, not storefronts.

### 1.2 Product goals (SOURCE BG-01–BG-06)

| ID | Goal |
|---|---|
| BG-01 | Help members reduce expenses. |
| BG-02 | Encourage sharing and resource reuse. |
| BG-03 | Support small personal student-enterprise listings. |
| BG-04 | Establish a verified university community with tracked handovers. |
| BG-05 | Maintain safety through listing moderation and recorded reasons. |
| BG-06 | Work toward the original ten-day, five-person MVP timeline; feasibility must be re-estimated after scope changes. |

### 1.3 Roles

| Role | Authentication | Allowed behavior |
|---|---|---|
| Visitor | None | Register, sign in, request/resend verification, initiate/reset forgotten password. No marketplace access. |
| Unverified account | Signed in; email not verified | See verification status, resend link, sign out, limited account information; no marketplace. |
| Verified member | Approved university email + verification complete | All standard listing, discovery, request, handover, return and history flows. |
| Admin | Pre-created verified admin account | All normal member features **plus** approved-domain management and listing moderation. No special access to participants' private pickup information. |

**Identity policy:** An email link proves control of an approved email address. It does **not** independently prove current enrollment, employment or identity. No additional eligibility process is in MVP.

### 1.4 Vocabulary

- **Listing/post:** one item and exactly one type.
- **Feed-visible:** listing `status='available'`, `isHidden=false`, `deletedAt=null`.
- **Active request:** `pending`, `accepted` or `checked_out` for the same requester/listing pair.
- **Live request:** `accepted` or `checked_out`; at most one per listing.
- **Campus day:** a `YYYY-MM-DD` date evaluated in configured university timezone (provisional `Asia/Dhaka`).
- **Hide:** admin moderation action; history preserved and editing blocked.
- **Delete Post:** owner soft-deletes eligible own listing; it is not a physical deletion of historical transaction records.
- **Close:** owner closes an available listing without deleting it from My Activity history.

---

## 2. Scope and priorities

### 2.1 P0 — essential MVP

1. Email registration, verification and sign-in; password recovery, sessions and secure role checks.
2. Admin management of eligible email domains (one university, multiple domains) and listing moderation.
3. Post, edit, close **and delete** Sell/Donate listings, with optional photo later in P1 as original staging permits.
4. Verified-only shared feed, title search, category/type/Free filters and 20-item cursor pagination.
5. Request, accept, decline and cancel with atomic listing reservation and private pickup details.
6. Sell/Donate handover; My Listings, Requests Sent and Requests Received with authorized history.
7. Baseline security, backup and testing.

### 2.2 P1 — required to consider the *full* MVP complete

1. Rent with daily fee, pickup/return dates, handover and return.
2. Free Borrowing with dates, handover and return.
3. Exchange offer and **owner-only confirmation after both items exchanged**.
4. One optional listing photo, max 5 MiB, supported formats JPG/PNG/WebP.

P1 is **not optional overall**: it may be scheduled after P0 but is part of the agreed MVP. The original 10-day target is not guaranteed after adding features.

### 2.3 Explicit exclusions

- Multi-university operations, multiple marketplaces, per-university filtering, tenant administration.
- University ID-number registration, ID card images, manual verification queues or individual approval.
- Self-service account deletion; account ban/suspension UI; arbitrary admin edits to other members' listings.
- Shop profiles, storefronts, business accounts.
- Online payments, payment statuses, delivery, delivery costs or shipping integrations.
- Messaging, notifications, automated reminders, reviews, likes, favourites or user reports.
- Multiple listing photos, galleries; admin-managed categories or pickup-location catalogs.
- Admin listing unhide, permanent record purge, audit-view UI (backend audit storage remains compulsory).
- Multilingual interface in MVP.

---

## 3. End-to-end journeys

### J01 — University domain setup and member verification

1. Seed initial admin securely; admin signs in and opens **Email Domain Management**.
2. Admin adds official domains associated with **the single university** and enables them. Non-admins cannot access this screen/API.
3. Visitor registers with full name, display name, university email and password. Backend normalizes and exact-matches the email's domain against **active** domains.
4. If allowed and email unused, store an **unverified** account and send a 60-minute single-use link.
5. User opens the link; system verifies token and activates membership **only if the registered email domain is still active**. If admin deactivated it, an unverified account cannot complete verification until the domain is reactivated; previously verified accounts remain active (TEC-03).
6. Verified member can sign in and access the shared marketplace. Deactivated domains do **not** revoke access for previously verified members.

### J02 — Sell or donate

1. Verified user posts one item, with title, fixed category, fixed condition, description, price option and optional photo.
2. Another verified member requests it. Owner reviews requests in My Activity.
3. Owner accepts **one** pending request, enters free-text pickup point and a non-past pickup timestamp.
4. Listing atomically becomes `reserved`; other pending requests become `declined`.
5. After physical handover, owner presses **Record Handover**; listing and request become `completed` and remain in authorized history.

### J03 — Rent or Free Borrowing

1. Requester enters proposed pickup date and a strictly later return date.
2. Rent fee = number of local calendar days × saved daily rate; Free Borrowing has no fee.
3. Owner accepts with private point/time on the requested pickup day and **not in the past**.
4. At handover, owner records checkout → `checked_out`.
5. Owner later confirms return → request `completed`, listing `available` unless hidden/deleted. A late return is flagged in My Activity without sending reminders.

### J04 — Exchange

1. Owner posts an Exchange listing with required `exchangeTerms`.
2. Requester submits a nonempty `offeredItemDescription`.
3. Owner accepts and provides private pickup place/time; other pending requests decline.
4. Once **both items have physically changed hands**, owner checks/acknowledges: **“I confirm that both items have been exchanged successfully.”**
5. Owner confirms; request and listing become `completed` in one transaction. No second party confirmation and no money field.

### J05 — Edit / Close / Delete

- **Edit:** owner changes eligible available, non-hidden, non-deleted listing. Terms changes cancel pending requests within the same transaction; informational edits do not.
- **Close:** owner closes eligible available listing; cancels pending requests; history remains in My Activity.
- **Delete Post:** owner confirms removal of eligible listing; pending requests cancel and the listing is soft-deleted. Ordinary feed and editable views exclude it, while authorized historical request records remain intact. Neither admins nor other members can use owner-only delete.

### J06 — Admin moderation

- Admin searches any listing, records an obligatory reason and hides it. Feed excludes it. Owner can see the reason and listing as view-only. If a checked-out item is hidden, owner can still confirm its return; no public reopening.

---

## 4. Functional requirements

### F01 — Email registration, verification and sign-in (P0)

| ID | Requirement |
|---|---|
| FR-01.1 | Registration requires `fullName`, `displayName`, `universityEmail`, `password`; **no alternate university ID path**. |
| FR-01.2 | Password at least 8 characters; strict field-level validation; duplicate normalized email rejected. |
| FR-01.3 | Extract normalized domain from email; require exact match to an **active approved domain**. Do not use suffix matching. |
| FR-01.4 | New account `unverified`; emailed verification link: **60-minute TTL**, single-use, hashed token in DB. |
| FR-01.5 | Resend **max five per account per rolling hour**; resend invalidates earlier unused links. Generic resend response for account-existence privacy. |
| FR-01.6 | Valid link changes state `unverified → verified`; expired, invalid or used link displays explanation and resend action. |
| FR-01.7 | Sign-in with registered university email and password, not university ID; generic wrong-credentials response. |
| FR-01.8 | **Five** failed sign-ins in **15 minutes** block sign-in for **15 minutes**, including correct passwords during the block. |
| FR-01.9 | Session ends after **30 minutes inactivity** or logout. Verified users only access marketplace. |
| FR-01.10 | Already verified users keep marketplace access if their email domain later becomes inactive. |

### F02 — Member authorization and privacy (P0)

- **FR-02.1** All regular marketplace APIs require `verificationStatus='verified'` and a valid session; admins may use the marketplace under the same member restrictions.
- **FR-02.2** Listing and request responses expose counterpart's `displayName`, not email or password hashes. Protected auth endpoints may show a user **their own** email.
- **FR-02.3** Pickup point/time appear only in requester/owner response serializations; no public/listing feed/admin response can include them.
- **FR-02.4** Test every registered marketplace/admin route for expected authentication/role guards.

### F03 — Admin domain management and listing moderation (P0)

- **FR-03.1** Admin may add, list, activate and deactivate **multiple email domains for the sole configured university**.
- **FR-03.2** Domain is normalized and unique; must be a valid domain under the institution's authority (approval process is administrative and outside automated proof).
- **FR-03.3** A domain's inactive state blocks registrations from it; existing verified users and their histories remain active.
- **FR-03.4** Admin may hide a listing in any status with a required reason; hide triggers defined request cascades.
- **FR-03.5** Every admin domain action and hide action creates a tamper-resistant audit event with actor, target, action, reason where relevant and timestamp.
- **FR-03.6** Non-admins must receive `403 FORBIDDEN` on every admin API. Admins cannot see private pickup details or edit other owners' listings.
- **FR-03.7** There is no manual approval, admin user list, admin category manager, account suspension, permanent deletion or unhide in MVP.

### F04 — Create listing (P0 Sell/Donate; P1 Rent/Exchange/Free Borrowing/photo)

- **FR-04.1** Exactly one item per listing; common fields: `title`, `categoryId`, `description`, `condition`, `listingType`, optional photo.
- **FR-04.2** Single form has options: **Paid → Sell / Rent**, **Free (Donate)**, **Exchange**, **Free Borrowing**. Changing option clears irrelevant fields.
- **FR-04.3** The server enforces type rules below and fixed categories/conditions; new listing starts `available`, `isHidden=false`, `deletedAt=null`, `version=1`.
- **FR-04.4** Invalid inputs give field-level errors without discarding form values; one optional photo can fail/retry independently of creating the listing.

| Listing type | Required terms | Forbidden/normalized terms | Display |
|---|---|---|---|
| `sell` | Positive BDT amount, ≤2 decimal places | No exchange terms | `BDT 300` |
| `donate` | No positive money | Store amount as 0; reject submitted nonzero | `Free` |
| `rent` | Positive daily BDT rate, ≤2 decimals | No exchange terms | `BDT 100 / day` |
| `exchange` | Nonblank owner's exchange terms | **No money field even if zero** | `Exchange` |
| `free_borrowing` | No fee | Store amount as 0; reject nonzero | `Free Borrowing` |

### F05 — Edit, close and delete listing (P0)

- **FR-05.1** Only the owner can edit/close/delete, and never if admin-hidden. `reserved` or `checked_out` listings are not editable, closable or deletable.
- **FR-05.2** **Edit:** Only `available` + visible + not soft-deleted. Requires current `version`; stale version → `409 VERSION_MISMATCH`; successful edit increments version.
- **FR-05.3** Editing type, amount/daily rate or required exchange terms cancels **all pending** requests atomically with a visible reason; informational edits (title, condition, description, category, photo) do not.
- **FR-05.4** **Close:** Only `available` + not hidden + not soft-deleted. Set `status='closed'`, cancel pending requests, remove from feed, preserve authorized My Activity history.
- **FR-05.5** **Delete Post:** Owner-only soft delete for `available` + not hidden + not already deleted. Requires explicit confirmation; set `deletedAt`/`deletedBy`, cancel pending requests **in same transaction**, exclude from feed and ordinary post views; request history remains available to participants.
- **FR-05.6** Deleted/closed/completed history policy is final (TEC-04): a user may invoke Delete Post **only for an available, unhidden, undeleted listing**. Already `closed` or `completed` items cannot be user-deleted in MVP; preserve transaction history.
- **FR-05.7** No self-service **Delete Account** workflow or endpoint.

### F06 — Marketplace feed, search and filters (P0)

- **FR-06.1** One global shared feed for **this one university**: only `available && !isHidden && deletedAt==null`, newest first.
- **FR-06.2** Title-only search (`q`), fixed category filter, listing type filter, `free=true` (Donate **and** Free Borrowing).
- **FR-06.3** Listing card: title, category, type label, condition, price/free label, owner display name, optional photo, created time. **No private pickup or account email**.
- **FR-06.4** Cursor pagination on `(createdAt desc, _id desc)`, **20** per request; **Load More** fetches the next 20; no duplicates under a stable cursor. Empty states provided.
- **FR-06.5** Search p95 target: ≤2 seconds for 1,000 seeded listings / 10 concurrent users, excluding image transfer (source PRD target).
- **FR-06.6** Category and condition are predefined; condition-filter is **not required** unless specifically approved (existing PRD required display/selection, not filtering).

### F07 — Create a request (P0)

- **FR-07.1** A verified member can request another member's feed-visible listing, not their own.
- **FR-07.2** Request initially `pending` and snapshots: listing type, amount/daily rate, owner exchange terms, requester dates/offer, and computed rent fee where applicable. Later listing edits **must not mutate these snapshots**.
- **FR-07.3** At most **one active request per (listing, requester)**; no more than **one accepted/checked-out request per listing**. Historical declined/cancelled/completed requests may coexist.
- **FR-07.4** New requests against a reserved, hidden, closed, deleted or checked-out listing are refused; races must not create orphan pending requests.

### F08 — Dates, fees and exchange offers (P1)

- **FR-08.1** Rent and Free Borrowing requests require `proposedPickupDate` and `returnDate` as campus `YYYY-MM-DD`; `returnDate` is strictly later.
- **FR-08.2** Requester's proposed pickup date cannot be before the campus current day, and acceptance `pickupAt` cannot be before server current time.
- **FR-08.3** Rent fee = `(returnDate − proposedPickupDate in campus calendar days) × dailyRate`; compute and store in integer poisha, serialize as BDT decimal string.
- **FR-08.4** Example: BDT 100/day, 20–23 November = **3 days, BDT 300**; show total before acceptance to both sides.
- **FR-08.5** Exchange requires nonblank `offeredItemDescription`; snapshot it alongside `listingExchangeTerms`; no amount or fee.
- **FR-08.6** Sell/Donate/Exchange requests have no rental dates. Free Borrowing fee zero/no fee.
- **FR-08.7** Owner cannot change a request's requested dates during acceptance; requester cancels and resubmits if different dates are needed.

### F09 — Accept / decline (P0)

- **FR-09.1** Only owner acts on `pending` request; decline → `declined` final.
- **FR-09.2** Accept requires nonempty **free-text** `pickupPoint` and valid `pickupAt` timestamp, not in the past.
- **FR-09.3** For Rent/Free Borrowing, `pickupAt` must be on `proposedPickupDate` in campus timezone; `returnDate` remains unchanged.
- **FR-09.4** Accepted request, listing reservation, and declining other pending requests happen atomically. One accepted request only.

### F10 — Concurrency and pickup privacy (P0)

- **FR-10.1** Two concurrent accepts for one listing yield exactly **one success** and one conflict; no double reservation.
- **FR-10.2** MongoDB transactional and conditional-write safeguards enforce invariants; a partial unique index also protects live requests.
- **FR-10.3** Pickup point/time visible only to **listing owner and that request's requester**, including when either is an admin; an admin viewing an unrelated listing never sees it.
- **FR-10.4** Fifty repeated accept-race tests must have no orphan reserved listings and one accepted request at most.

### F11 — Cancellation, hide and removal (P0)

| Situation | Actor | Result |
|---|---|---|
| Pending request | Requester | `cancelled`, listing unchanged. |
| Pending request | Owner | `declined`. |
| Accepted before handover | Requester **or** owner | `cancelled`; listing returns `available` unless separately closed/deleted/hidden. |
| Owner edits listing terms | System | Cancel **all pending** requests and give reason. |
| Owner closes or soft-deletes available listing | System | Cancel **all pending** requests, preserve request history. |
| Admin hides available listing | Admin/system | Hide; cancel pending requests. |
| Admin hides reserved listing | Admin/system | Hide; cancel accepted request; return listing status to `available` but keep hidden. |
| Admin hides checked-out listing | Admin/system | Hide; checked-out request stays; owner may confirm return; never reappear in feed. |

`declined`, `cancelled`, `completed` request states are final. Optional `cancellationReason` is persisted. The owner's hide reason is available in **own history**, not public feed.

### F12 — Handover, exchange completion and return (P0/P1)

- **FR-12.1** Only listing owner can record handover or return; requester has no confirmation permission.
- **FR-12.2** Sell/Donate: `accepted → completed` request and `reserved → completed` listing; stamp `handedOverAt`.
- **FR-12.3** Exchange: same one-way completion, but require explicit owner confirmation that **both items have been exchanged**; no requester confirmation.
- **FR-12.4** Rent/Free Borrowing: on pickup, request + listing → `checked_out`, stamp `handedOverAt`.
- **FR-12.5** Owner confirms return: checked-out request → `completed`, listing → `available`; stamp `returnedAt`. Hidden listing remains hidden.
- **FR-12.6** `isOverdue` = checked-out request whose stored `returnDate` is before today's campus date. Computed; no automated notification.

### F13 — My Activity and history (P0)

Three sections: **My Listings**, **Requests Sent**, **Requests Received**. Show relevant statuses, participant display names, date/fee fields and allowed actions; keep completed/closed transaction history. Hidden owner's own listing displays **Hidden** and admin's reason, view-only. Soft-deleted posts disappear from ordinary feed/listing display; preserve a minimal historical reference in requests so past transactions still make sense. Never show any user's email or pickup details to an unrelated user.

| Request state | Requester actions | Owner actions |
|---|---|---|
| `pending` | Cancel | Accept, Decline |
| `accepted` | Cancel | Cancel, Record Handover / Confirm Exchange (by type) |
| `checked_out` | View/overdue status | Confirm Return |
| `declined`, `cancelled`, `completed` | History only | History only |

### F14 — Password recovery (P0; newly approved)

- **FR-14.1** Public **Forgot Password** screen requests registered university email.
- **FR-14.2** For existing and non-existing emails, return the **same neutral response** (avoid account enumeration).
- **FR-14.3** Only eligible existing account's registered address receives a **30-minute single-use password-reset link**; hash token at rest.
- **FR-14.4** New reset request invalidates earlier unused reset links. Enforce **3 reset requests per account per rolling hour and 10 per IP per rolling hour**; send generic responses for known/unknown emails (§12.2).
- **FR-14.5** Validate token, enforce minimum password policy, replace Argon2id hash; invalidate **all existing sessions** upon successful reset; never log or expose token.
- **FR-14.6** Expired, invalid and used reset links cannot set a password; user can request another.

### F15 — University email domain administration (P0; new)

- **FR-15.1** One configured university in MVP; admins can add/list/change active status of its approved official email domains.
- **FR-15.2** Normalize lowercase domain (IDNA-safe implementation if non-ASCII domain supported), remove surrounding whitespace, and require **exact** match with the email's domain; no wildcard or suffix match.
- **FR-15.3** Every domain unique; active/inactive status and created/updated actor/timestamps persisted.
- **FR-15.4** Initial admin and initial domain must be configured before public launch; if no active domains exist, registration must **fail closed**.
- **FR-15.5** Domain deactivation affects *future registrations* only; existing verified member access persists.
- **FR-15.6** No public “manage university” endpoints; only admin manages domains. Account role is never client-assignable.

### F16 — Post deletion (P0; new)

- **FR-16.1** On an eligible available, non-hidden listing only the owner sees **Delete Post**.
- **FR-16.2** Before deletion present confirmation explaining that pending requests will be cancelled and action cannot be reversed in the UI.
- **FR-16.3** A transaction marks `deletedAt` and `deletedBy`, cancels all pending requests and updates revision. `deletedAt` is never publicly exposed as a listing available to request.
- **FR-16.4** Do **not** physically delete users, past requests, moderation audit records or post-related terms snapshots as a side effect.
- **FR-16.5** Keep **Close** separate from **Delete**: close leaves ordinary My Listings history; delete removes the post from ordinary management views while maintaining authorized transaction history.

---
## 5. Product, authorization and state invariants

### 5.1 Non-negotiable business rules

| Rule | Invariant |
|---|---|
| BR-01 | Marketplace reads and writes are limited to verified members (admins included as members). |
| BR-02 | Exactly one account per normalized university email; one item and one listing type per listing. |
| BR-03 | Only owner changes their own listing; admin may **hide** but not edit another person's listing. |
| BR-04 | Only approved active domain enables **new** registration. Deactivation does not remove existing verified member access. |
| BR-05 | No online payment, delivery, chat, review or notification implementation. |
| BR-06 | A requester cannot request own post and cannot have two active requests for the same post. |
| BR-07 | At most **one** accepted/checked-out request per listing; reservation updates must be atomic. |
| BR-08 | Only the requester and listing owner see private pickup point and time. Admin power does not override this. |
| BR-09 | Only the owner records handover, exchange completion or return. |
| BR-10 | A request stores the listing type/price/rate/exchange terms as at submission; do not alter the snapshot on later edits. |
| BR-11 | Admin-hidden listing is view-only for its owner; hide reason visible privately; no unhide. |
| BR-12 | Delete Post is **soft delete**, never an account delete or transaction-history erase. |
| BR-13 | New pickup timestamps must be now/future in the university time-zone policy. |
| BR-14 | Money is BDT, ≤2 decimals, never computed with JavaScript floating-point arithmetic. |
| BR-15 | Every admin action changes data and appends its audit record atomically. |

### 5.2 Listing states and flags

**Listing `status` enum:** `available | reserved | checked_out | completed | closed`.

`isHidden: boolean` and `deletedAt: Date|null` are **separate controls**, not extra listing statuses. A listing is in the feed **iff** `status='available' && !isHidden && deletedAt==null`. Preserve status when hidden so checked-out returns still work. When owner soft-deletes, record the deletion metadata without changing retained requests; the post is hidden from ordinary navigation.

| Current listing state | Event | Result |
|---|---|---|
| available | Owner edit | available; revision increment; cancel pending only on terms change |
| available | Owner close | closed; cancel pending; preserve history |
| available | Owner delete | soft-deleted; cancel pending; preserve history |
| available | Owner accepts pending request | reserved; other pending requests declined |
| reserved | Either participant cancels accepted request before handover | available (unless hidden/deleted) |
| reserved | Owner records Sell/Donate/Exchange handover | completed |
| reserved | Owner records Rent/Borrow handover | checked_out |
| checked_out | Owner confirms return | available (but remains hidden if admin-hidden) |
| available or reserved or checked_out or completed or closed | Admin hides with reason | `isHidden=true`; request cascades by §4 F11 |

### 5.3 Request states

**Request `status` enum:** `pending | accepted | declined | cancelled | checked_out | completed`.

| From | To | Actor and conditions |
|---|---|---|
| pending | accepted | Owner, listing available/not hidden/not deleted; single transaction with reservation |
| pending | declined | Owner; also system declines all other pending on acceptance |
| pending | cancelled | Requester; also system on terms edit, close, delete or hide |
| accepted | cancelled | Requester or owner before handover; listing reopens unless hidden/deleted |
| accepted | completed | Owner on Sell/Donate; Owner on Exchange **after both items physically exchanged** |
| accepted | checked_out | Owner on Rent/Free Borrowing handover |
| checked_out | completed | Owner confirms return; listing back to available if not hidden |
| declined, cancelled, completed | — | Terminal; no transitions back to active |

**Priority:** Every serializer, query, status badge and UI action must reflect these machines consistently.

---

## 6. Technology stack and architecture rules

### 6.1 Technology choices

| Layer | Choice | Status |
|---|---|---|
| Frontend | React SPA, plain CSS, local state, React Router, Vite | ENGINEERING-APPROVED |
| Language | Preserve existing React **JS/JSX** frontend; use **TypeScript strict** for new backend/shared code where feasible without rewriting working UI. | ENGINEERING-APPROVED implementation clarification |
| Backend | Node.js + Express JSON REST API | SOURCE |
| Database | **MongoDB** | FINAL |
| ODM | **Mongoose** | **ENGINEERING-APPROVED (TEC-01)** |
| Request validation | Zod `.strict()`, shared DTO schemas | ENGINEERING-APPROVED |
| Password hash | Argon2id | ENGINEERING-APPROVED |
| Sessions | Database-backed, opaque HttpOnly cookie, idle expiry | SOURCE behavior; MongoDB implementation |
| Email | SMTP via Nodemailer, provider-configurable | ENGINEERING-APPROVED |
| Listing photo | **Supabase Storage Free**, signed **browser-direct upload**, server-authorized/confirmed | **FINAL provider choice** + approved file limits |
| Security middleware | Helmet, secure cookies, rate limiting, request IDs, log redaction | ENGINEERING-APPROVED |
| Testing | Vitest, Supertest, Testing Library, Playwright, axe | ENGINEERING-APPROVED |
| CI | GitHub Actions | ENGINEERING-APPROVED |
| Hosting | **Vercel** SPA + Express Functions; **MongoDB Atlas** transaction-capable cluster; **Supabase Storage** photos only | **FINAL** target; services must be provisioned and tested |

Do not add Redux/Zustand/React Query/CSS framework/UI kit just to rewrite working frontend; add a router or API client only as required. The configured university operates as a **single logical tenant**; no university selector or multi-tenant abstractions are required in MVP.

### 6.2 Repository layout (implementation target)

The supplied source ZIP has `frontend/src/main.jsx`, `screens.jsx`, `market.js`, `demo-store.js`, `style.css` and `visuals.jsx`. **Preserve the existing React UI, components and styles.** Do not rename `frontend/` to `client/` or force a mass JSX→TSX migration for documentation conformity. The following is the target after adding the new backend:

```text
UniCircle/
├── PRD.md                 # internally frozen product requirements
├── ARCHITECTURE.md        # infrastructure and workflows
├── DATABASE.md            # MongoDB collections, indexes, migrations
├── API_CONTRACT.md        # human-readable API semantics
├── openapi.yaml           # machine-readable API contract (36 operations)
├── AGENTS.md              # Codex work instructions
├── README.md              # setup / operational prerequisites
├── FRONTEND_API_MAPPING.md
├── frontend/              # keep provided React/Vite UI
│   └── src/{main.jsx,screens.jsx,market.js,style.css,visuals.jsx,...}
├── backend/               # add Node/Express + Mongoose
│   ├── src/{routes,controllers,services,models,repositories,middleware,lib}/
│   ├── scripts/           # admin bootstrap, categories/domain seed, indexes
│   └── tests/
└── .github/workflows/ci.yml
```

The final documentation is placed at repository root so Codex reads it automatically; an existing repository may initially have only `frontend/`. Add new folders without altering working UI unnecessarily.

### 6.3 Separation of concerns

`routes` → `controllers` (parse / validate / serialize) → `services` (business rules and transaction orchestration) → `repositories` (MongoDB access) → `models` (Mongoose definitions and indexes). Do not place authorization or business state transitions only in the browser or ODM hooks. Keep services independently testable. Centralize error envelopes, date helpers, money conversions and shared constants.

### 6.4 Engineering and Git conventions

- No `any`; validate every body/query/param; central error handler hides internals.
- Branch per task, small pull requests, Conventional Commits, passing lint/typecheck/tests/build, peer review; no direct push to `main`.
- Database indexes/validators changes must be versioned and applied/reviewed through scripts, not undocumented manual console edits.
- Mongoose startup must **not** rely on automatic production index creation. Initialize explicit indexes from controlled migrations.
- Never persist passwords, secrets or raw verification/reset tokens in log output.

---

## 7. MongoDB logical data model

> **Status:** Logical collections and invariants are specified here. `DATABASE.md` and code migrations will contain final exact JSON/BSON validators and index declarations. **Do not use SQL DDL, PostgreSQL types, `pg` or SQL row locks** from PRD v1.0.

### 7.1 Common conventions

- Internal IDs are MongoDB `ObjectId`; API IDs serialized consistently as strings.
- Timestamps are BSON `Date`, stored UTC, returned ISO 8601 UTC. Campus calendar dates are validated `YYYY-MM-DD` strings, interpreted in the configured campus timezone.
- Monetary values stored as **safe integer poisha** (e.g., BDT 100.00 → 10000); API accepts/returns canonical BDT decimal strings (`"100.00"`). Reject overflow and unsafe integers.
- Models declare explicit required fields, enums, normalized values and useful DB validators where supported. Mongoose validation is not a substitute for API validation and transactional business rules.
- Store only a single-university configuration; **no university per-user association is required for MVP** (domain data can be associated by `approvedDomainId` for historical traceability if helpful).
- `createdAt`, `updatedAt` set on mutable records. Durable audit records are append-only at application level, with DB privileges and offline log/archive safeguards.

### 7.2 `universitySettings`

Single document only: `{ _id: 'primary', universityName, campusTimeZone: 'Asia/Dhaka', createdAt, updatedAt }`. This is **not** a university directory. An operator must enter the genuine university name at deployment; never guess it from example domains. Time zone is approved as `Asia/Dhaka` (TEC-02). The admin MVP manages email domains, not multiple university identities.

### 7.3 `approvedEmailDomains`

```ts
{
  _id: ObjectId,
  domain: string,                 // normalized e.g. "seu.edu.bd"
  isActive: boolean,
  createdBy: ObjectId,           // admin user
  updatedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `unique(domain)`; index `(isActive, domain)`. Multiple domains permitted for **one** university. Admin may add or toggle status. To replace a domain safely, deactivate old entry and create the new one; avoid silently rewriting historical email ownership. Retain domain audit events even after deactivation.

### 7.4 `users`

```ts
{
  _id: ObjectId,
  fullName: string,
  displayName: string,
  universityEmail: string,          // normalized lower-case
  emailDomain: string,              // normalized domain at registration
  passwordHash: string,             // Argon2id
  role: 'member' | 'admin',
  verificationStatus: 'unverified' | 'verified',
  emailVerifiedAt: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

**Index:** `unique(universityEmail)`. No `universityIdNumber`, `pending_review`, `rejected`, account-delete API, administrator-review fields or manual ID documents. Admin account bootstrap cannot be performed from a public route. Role is set server-side only.

### 7.5 `emailVerificationTokens`

```ts
{
  _id: ObjectId,
  userId: ObjectId,
  tokenHash: string,               // SHA-256 of 256-bit random token
  expiresAt: Date,                 // +60 min
  usedAt: Date | null,
  createdAt: Date
}
```

Indexes: `unique(tokenHash)`, `(userId, createdAt)`. Single use enforced with conditional update in transaction. Expired tokens cannot be accepted, regardless of TTL-cleanup timing. Resend invalidates earlier unused tokens.

### 7.6 `passwordResetTokens`

Same security shape as verification tokens, but `expiresAt = createdAt + 30 min` and a separate token purpose / collection. `unique(tokenHash)` and `(userId, createdAt)` indexes. Successful reset invalidates earlier links and all sessions. No token is logged or stored raw.

### 7.7 `categories`

Eight immutable seeded category objects (see §12), with stable unique `code` and display `name`. No admin create/edit/delete endpoints. `categoryId: ObjectId` on listings must resolve to one of the approved seeded categories; fixed codes are used as constants where practical.

### 7.8 `listings`

```ts
{
  _id: ObjectId,
  ownerId: ObjectId,
  title: string,
  categoryId: ObjectId,
  description: string,
  condition: 'new'|'like_new'|'good'|'fair'|'poor',
  photo: null | {
    storageKey: string,            // backend-owned Supabase Storage object key
    secureUrl: string
  },
  listingType: 'sell'|'donate'|'rent'|'exchange'|'free_borrowing',
  amountPoisha: number | null,     // sell price / daily rent; zero free; null exchange
  exchangeTerms: string | null,
  status: 'available'|'reserved'|'checked_out'|'completed'|'closed',
  isHidden: boolean,
  hiddenReason: string | null,
  hiddenAt: Date | null,
  hiddenBy: ObjectId | null,
  deletedAt: Date | null,
  deletedBy: ObjectId | null,
  version: number,                 // optimistic client edits
  mutationVersion: number,         // internal compare-and-set/write-conflict guard
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** compound `(status, isHidden, deletedAt, createdAt desc, _id desc)` for feed; category/type indexes conditioned for feed; `(ownerId, createdAt desc)` for My Listings; title index for validated title search. Implement exact query/index strategy using MongoDB index plans and performance tests. Hidden/deleted are independent of lifecycle status. `photo.storageKey` must be tied to authenticated server-issued `photoAssets` ownership; never trust a client-supplied URL or storage path.

### 7.9 `requests`

```ts
{
  _id: ObjectId,
  listingId: ObjectId,
  requesterId: ObjectId,
  status: 'pending'|'accepted'|'declined'|'cancelled'|'checked_out'|'completed',
  listingType: string,             // immutable terms snapshot
  termsAmountPoisha: number|null,
  listingExchangeTerms: string|null,
  proposedPickupDate: string|null,
  returnDate: string|null,
  rentalFeePoisha: number|null,
  offeredItemDescription: string|null,
  pickupPoint: string|null,        // private
  pickupAt: Date|null,             // private
  handedOverAt: Date|null,
  returnedAt: Date|null,
  cancellationReason: string|null,
  createdAt: Date,
  updatedAt: Date
}
```

**Mandatory unique partial indexes:**

1. Unique `(listingId, requesterId)` **only when** `status ∈ {pending, accepted, checked_out}`.
2. Unique `(listingId)` **only when** `status ∈ {accepted, checked_out}`.

Normal indexes `(listingId, status)`, `(requesterId, createdAt desc)`; `listings(ownerId)` supports received requests. Prevent malformed request types/terms with shared schemas and MongoDB validators. Do **not** overwrite snapshot fields on an edit.

### 7.10 `moderationActions`

```ts
{
  _id: ObjectId,
  adminId: ObjectId,
  actionType: 'domain.add'|'domain.activate'|'domain.deactivate'|'listing.hide',
  targetType: 'domain'|'listing',
  targetId: ObjectId,
  reason: string|null,
  metadata: object|null,           // non-secret, bounded and validated
  createdAt: Date
}
```

Append events in the **same MongoDB transaction** as the domain/listing change. No admin audit-log screen in MVP; protect audit writes with the least-privilege app role and separate privileged recovery/retention process. MongoDB does not supply PostgreSQL's immutable-trigger mechanism; do **not** claim DB-level immutability without specific controls.

### 7.11 `sessions`, `loginAttempts`, `emailSendAttempts`

- `sessions`: `sessionHash` unique, `userId`, `csrfTokenHash`, `createdAt`, `lastSeenAt`; reject if idle >30 minutes **or** absolute age >7 days. Keep at most five sessions per user (revoke the oldest on new login); revoke all on password reset. TTL cleanup is secondary, not authorization.
- `loginAttempts`: indexed **hashed** normalized login identifier, timestamps of failures, needed for 5/15/15 lockout. Opportunistic cleanup/TTL allowed; expiry does not replace lockout logic.
- `emailSendAttempts`: hashed identifier/account ID, purpose, timestamp, and privacy-preserving rate-limit key; enforce **5 verification resends per account per rolling hour** and distinct reset/IP limits in §12.2. Never store raw email/token in logs. TTL cleanup after 24 hours (enforcement uses timestamps, not TTL deletion timing).

### 7.12 Domain and model relationships

```text
universitySettings ('primary' single record)
        └── approvedEmailDomains (many official domains of SAME university)
users (one verified email) ──── listings (one owner : many posts)
users (one member) ─────────── requests (one requester : many requests)
listings (one post) ────────── requests (one post : many requests)
users (admin) ──────────────── moderationActions
users ──────────────────────── sessions / auth tokens / login attempts
```

**Consistency:** MongoDB references are not SQL foreign keys. Validate referenced IDs and ownership server-side, and use transactions for multi-document state changes. Do not cascade-delete any user/listing history. MongoDB transaction support requires a replica set or supported sharded cluster; the **local test environment must also support transactions**.

---

## 8. Critical algorithms and consistency

### 8.1 University email registration and domain matching

1. Validate and normalize email using shared validated parser (reject malformed formats; trim/lowercase normalized domain).
2. Parse the actual email domain, not a substring or suffix; require **exact equality** to `approvedEmailDomains.domain` where `isActive=true`.
3. Run duplicate normalized email check, but rely on the unique DB index to resolve races (return field-level `ALREADY_REGISTERED`).
4. Create user with `unverified`; write hashed verification token (+60 min) and send link after durable storage. Handle delivery failure without leaving partial inconsistent verification state; allow resend.
5. Verify with token hash, `expiresAt > now`, `usedAt=null`, `user.verificationStatus='unverified'` **and an active approved domain matching the email's normalized domain at verification time**. Atomically consume token and mark account verified only when all conditions hold. Once verified, a later inactive domain does not remove access.
6. Resend cannot disclose account presence; enforce five resends per account in a rolling hour and a separate IP limiter; invalidate previous unused links.
7. **Final policy (TEC-03):** An unverified account is retained but cannot complete email verification while its registered domain is inactive; it may request a fresh link when the domain is reactivated. Existing verified accounts are unaffected.

### 8.2 Sessions and CSRF (approved technical baseline)

- On sign-in, generate cryptographically random opaque session cookie value (256-bit), store its hash server-side; cookie `HttpOnly`, `Secure` in production, `SameSite=Lax`, first-party, path `/`.
- Attach a random CSRF secret to the session; authenticated state-changing requests require `x-csrf-token` and allowed `Origin`. Session invalidates after **30 minutes idle OR 7 days absolute**, whichever occurs first. Permit at most **five concurrent sessions per user**, evicting oldest when a sixth login succeeds.
- **Fix original PRD ambiguity:** `GET /auth/me` should return the current session's CSRF token (only to that same authenticated browser, `Cache-Control: no-store`) or provide an equivalent guarded `GET /auth/csrf` endpoint; this document uses `GET /auth/csrf` below as a consistent token-bootstrap API for public and authenticated flows.
- **Approved CSRF design:** `GET /auth/csrf` issues a pre-auth signed double-submit nonce (separate from session); public POSTs (register, verify-email, request reset, reset password, login) verify nonce+`Origin`. After login, session POSTs use session CSRF. On reload, `GET /auth/csrf` returns the appropriate session CSRF for authenticated clients. Never let pre-auth CSRF bypass authenticated session controls.
- Cross-origin `fetch` must not reveal CSRF token to arbitrary origins; set strict same-origin CORS and origin checks. All authenticated API responses are no-store.
- Password reset deletes/revokes every session for that user; no silent automatic login on reset.

### 8.3 Money and campus dates

- Parse canonical decimal strings into integer poisha; reject negatives, more than two decimals, over-limit values, non-finite values and unsafe integer multiplication. The paid-price/rate cap is approved at **BDT 9,999,999.99**, and calculated rental totals cannot exceed it (§12.2).
- `daysBetween('2026-11-20','2026-11-23') = 3`; rental fee is integer multiplication. Display money from poisha as exactly two decimals in API; UI may omit `.00`.
- Campus dates are validated strings; compare calendar days in campus timezone. Timestamps are real instants in UTC. Compute `pickupAt >= serverNow` at acceptance—not just `pickupDate >= today`.
- For Rent/Borrowing, `campusDay(pickupAt)` **must equal** the request's `proposedPickupDate`. Earlier accepted request with outdated date must be cancelled and recreated.

### 8.4 Concurrency — request creation and acceptance

**Critical invariant:** MongoDB document reads in a transaction are not equivalent to PostgreSQL `FOR UPDATE`; use a **write contention guard** on the listing and a conditional status change.

**Create request (single transaction):**

1. Validate requester; load listing, require feed-visible and owner ≠ requester.
2. Perform a benign conditional write to listing (e.g., increment internal `mutationVersion` if still available, not hidden, not deleted). This serializes conflicts with concurrent accept/edit/hide/close/delete operations.
3. Validate per-type payload, copy request terms and computed rent fee, insert `pending` request.
4. Unique partial indexes reject duplicate active requester requests; retry only transient transaction/write-conflict errors with bounded retries. If listing changed state, return `LISTING_NOT_AVAILABLE`.

**Accept request (single transaction):**

1. Look up request to obtain listing reference; authorize caller as listing owner.
2. Validate request still pending, pickup point/time, campus-day rule; **conditionally** update listing from available/not hidden/not deleted to reserved; require exactly one match.
3. Update chosen pending request to accepted; decline all other pending requests on same listing; persist private pickup details.
4. Commit together. Concurrent accepts contend on same listing document; exactly one transaction succeeds. Unique partial index is a secondary safety guard.
5. Treat write conflicts/transient errors with bounded whole-transaction retries; when the listing is no longer available, return `409 LISTING_NOT_AVAILABLE`. No partial success, orphan reservation or two accepted requests.

**All transitions** (cancel, edit, hide, close, delete, handover, return) must also contend on the listing guard and update related requests transactionally. Do not assume automatic MongoDB transaction retries handle all business conflicts.

### 8.5 Delete Post / Close Post

- Owner-only with verification; checks listing not hidden, not deleted and status `available` for **both** actions.
- **Close:** write `status='closed'`, cancel pending requests, preserve owner My Activity entry.
- **Delete:** set `deletedAt/deletedBy`, increment `version`, cancel pending requests; remove ordinary listing management/navigation while preserving authorized request history.
- Confirm delete with an explicit destructive-action dialog; not a physical deletion of assets/records unless separate, approved retention policy defines cleanup.
- If two operations race (accept vs delete, accept vs close, edit vs delete), conditional listing mutation plus transaction yields one valid winning outcome; never accept a deleted item.

### 8.6 Hidden listings

- Admin hide with required reason → `isHidden=true`, store `hiddenReason`, `hiddenAt`, `hiddenBy`, append audit event atomically.
- `available`: cancel pending. `reserved`: cancel accepted and set listing status to available (but hidden). `checked_out`: preserve checked-out request so owner can confirm return.
- Hide is not a hard delete. Owner can view hidden listing and reason but cannot edit/close/delete/unhide. Other members see no hidden listing details except their authorized historical request information.
- An admin who is **not** a participant sees **no pickup data**, even on the admin moderation detail endpoint.

### 8.7 Password reset

- Request endpoint gives generic successful-looking response; for existing accounts, generate 256-bit random token, store only hash; TTL **30 minutes**; send a reset link to account email.
- Reset endpoint validates token atomically, validates new password, writes new Argon2id hash, consumes token, invalidates other reset tokens and deletes existing sessions in a transaction. Return non-sensitive confirmation.
- Never expose whether address exists or log raw tokens; apply password-reset limits of **3 requests per account per rolling hour** and **10 per IP per rolling hour**, plus generic response and consistent security logging (§12.2).

---

## 9. Final API contract — 36 operations (frozen internal baseline)

**Authoritative references:** `API_CONTRACT.md` defines role guards, state changes, pagination, CSRF, privacy, rate limits and edge cases; `openapi.yaml` defines machine-readable operations and DTO schemas. **Do not invent endpoint names or successful response shapes outside those two files.** Both use `/api/v1`, JSON camelCase keys, lower-snake enum values and 24-character lowercase MongoDB ObjectId strings. Success payloads are `{ "data": ... }` (except `204 No Content`); errors are `{ "error": { "code", "message", "details" } }`.

*Cookie auth:* HttpOnly Secure SameSite=Lax `uc_session`; frontend `credentials:'include'`; unsafe methods require `x-csrf-token` and same-origin Origin checking. `GET /auth/csrf` bootstraps public-form CSRF. Secrets are never stored in `localStorage`.

*Listing pagination:* cursor-based `(createdAt DESC, _id DESC)`; `limit=20` default, `limit<=50` maximum; `nextCursor` nullable. `GET /listings` requires verified session, filtering by title, category **code**, type and `free=true` (donate + free borrowing).

*Photo upload:* **No binary multipart endpoint; image storage is Supabase Storage Free.** `POST /listings/photos/sign` issues a server-controlled Supabase signed upload token; browser uploads directly to Supabase Storage; `POST /listings/photos/confirm` checks actual bytes/MIME/signature/size and ownership before attaching `photoAssetId` to a listing. Never upload a 5 MiB file via a Vercel Function request.

### 9.1 Endpoint inventory

| HTTP | Route | Purpose |
|---|---|---|
| `GET` | `/api/v1/health` | Health signal |
| `GET` | `/api/v1/auth/csrf` | CSRF bootstrap |
| `POST` | `/api/v1/auth/register` | Register email-only university member |
| `POST` | `/api/v1/auth/verify-email` | Verify university email link |
| `POST` | `/api/v1/auth/resend-verification` | Resend verification email with generic response |
| `POST` | `/api/v1/auth/login` | Sign in with university email |
| `POST` | `/api/v1/auth/logout` | Logout and revoke session |
| `GET` | `/api/v1/auth/me` | Return own current user |
| `GET` | `/api/v1/verification/status` | Current email verification state |
| `POST` | `/api/v1/auth/forgot-password` | Request reset link with generic response |
| `POST` | `/api/v1/auth/reset-password` | Reset password and revoke all sessions |
| `GET` | `/api/v1/categories` | Get eight immutable categories |
| `GET` | `/api/v1/listings` | Browse feed cursor pagination |
| `POST` | `/api/v1/listings` | Create listing |
| `GET` | `/api/v1/listings/{id}` | Listing detail with visibility rules |
| `PATCH` | `/api/v1/listings/{id}` | Edit available owner listing with version |
| `DELETE` | `/api/v1/listings/{id}` | Soft-delete eligible owner listing |
| `POST` | `/api/v1/listings/{id}/close` | Close eligible owner listing |
| `POST` | `/api/v1/listings/photos/sign` | Authorize direct Supabase Storage Free image upload |
| `POST` | `/api/v1/listings/photos/confirm` | Confirm Supabase Storage object and owner-bound photo asset |
| `POST` | `/api/v1/listings/{id}/requests` | Create listing request with immutable term snapshot |
| `GET` | `/api/v1/requests/{id}` | Get participant-only private request |
| `POST` | `/api/v1/requests/{id}/accept` | Accept pending request atomically |
| `POST` | `/api/v1/requests/{id}/decline` | Decline pending request |
| `POST` | `/api/v1/requests/{id}/cancel` | Cancel pending or pre-handover accepted request |
| `POST` | `/api/v1/requests/{id}/handover` | Record owner handover (exchange requires explicit both-items confirmation) |
| `POST` | `/api/v1/requests/{id}/return` | Confirm rent/free borrow return |
| `GET` | `/api/v1/me/listings` | Get own listing history (excluding deleted ordinary view) |
| `GET` | `/api/v1/me/requests/sent` | Get requests I sent |
| `GET` | `/api/v1/me/requests/received` | Get requests received for my listings |
| `GET` | `/api/v1/admin/domains` | List approved email domains |
| `POST` | `/api/v1/admin/domains` | Add same-university approved email domain |
| `PATCH` | `/api/v1/admin/domains/{id}` | Toggle approved email domain active state |
| `GET` | `/api/v1/admin/listings` | List moderated listings excluding private pickup |
| `GET` | `/api/v1/admin/listings/{id}` | Moderation listing details excluding pickup |
| `POST` | `/api/v1/admin/listings/{id}/hide` | Hide listing with reason and audited cascade |

### 9.2 API invariant highlights

- **Registration:** active exact-match `seu.edu.bd` (plus future separately approved university domains); verification link 60 minutes; max five resends/account/rolling hour; no manual university ID path. Registered members with already verified emails continue to access when a domain is later deactivated.
- **Password recovery:** 30-minute single-use reset token, unknown email produces same generic response, reset revokes sessions.
- **Permissions:** verified members only browse/write; only owner edits/closes/deletes available, nonhidden, undeleted listings; admin cannot edit others' posts or view private pickup details.
- **Requests:** accepted reservation and competing-pending declines are one MongoDB transaction; 50 concurrent trials must produce exactly one winner per listing. Rental price computed using Asia/Dhaka calendar-day difference and integer poisha.
- **Exchange:** owner must send `{ "confirmBothItemsExchanged": true }` when both items have been exchanged; only then both listing and request become completed.
- **Soft delete:** `DELETE /listings/:id` returns `204` and hides an eligible listing from normal views; required historical request data is preserved. No account deletion.
- **Error / conflict codes:** `VALIDATION_ERROR`, `TOKEN_INVALID_OR_EXPIRED`, `UNAUTHORIZED`, `NOT_VERIFIED`, `FORBIDDEN`, `NOT_FOUND`, `ALREADY_REGISTERED`, `DOMAIN_ALREADY_EXISTS`, `VERSION_MISMATCH`, `LISTING_NOT_AVAILABLE`, `DUPLICATE_ACTIVE_REQUEST`, `REQUEST_NOT_PENDING`, `STATE_CONFLICT`, `RATE_LIMITED`, `SIGNIN_BLOCKED`, `UPLOAD_FAILED`.

### 9.3 Example payloads (full schemas in `openapi.yaml`)

```json
{
  "title": "Scientific calculator",
  "categoryId": "665ca7a10000000000000021",
  "description": "Working calculator in good condition for class.",
  "condition": "good",
  "listingType": "rent",
  "amountBdt": "100.00"
}
```

```json
{ "pickupPoint": "University Library Entrance", "pickupAt": "2026-11-24T04:00:00Z" }
```

```json
{ "confirmBothItemsExchanged": true }
```

### 9.4 No unsanctioned routes

Do not add university-ID admin approval, category administration, account deletion, unhide, messaging, paid checkout or delivery routes. New endpoints require a documented change to both `API_CONTRACT.md` and `openapi.yaml` and matching frontend tests.

## 10. Administrator specification

### 10.1 Roles and authorization matrix

| Capability | Verified member | Admin |
|---|---|---|
| Browse and interact with marketplace under participant rules | Yes | Yes |
| Edit/close/delete own eligible listing | Yes | Yes |
| Edit/delete another user's listing | No | No |
| See private pickup for a request where not participant | No | No |
| View/add/enable/disable approved university email domains | No | Yes |
| Hide listing with required reason | No | Yes |
| Approve/reject individual students | Not applicable | Not in MVP |
| Add/remove universities or categories | No | Not in MVP |
| View admin audit events in an admin UI | No | Not in MVP |

### 10.2 Admin login and bootstrap

- Admin uses the same sign-in form as members; role comes from persisted server-owned field, never registration payload.
- Pre-launch `scripts/create-admin.ts` securely bootstraps admin from explicit deployment configuration, generates Argon2id hash and ensures the initial admin is verified.
- Initial email domain(s) must be approved and seeded/configured before registration opens. Bootstrap identities and credentials must not be stored in source code or Git logs.
- Only verified `role='admin'` can access `/admin/*`; admin pages `Cache-Control: no-store`, noindex, guarded server-side.
- Admin link appears only for admin role; regular navigation still includes Marketplace, Post Item, My Activity and Logout.

### 10.3 Admin email-domain UI

- List normalized approved domains with **Active/Inactive** status and last updated information.
- Add domain: validate syntax, exact uniqueness, display clear duplicate error, persist audit. A domain must be an official domain of the **one** university; admin is responsible for confirming institutional ownership.
- Activate/deactivate domain: explicit confirmation when deactivating, explain **new registrations stop, existing verified users stay active**; record actor/time.
- No university creation/selection, student verification queue or manual approval.

### 10.4 Admin listing moderation UI

- Search/filter listings in any state; view listing details, type, owner display name and status **without private pickup information**.
- Hide listing requires a nonblank reason; logs audit, cancels requests according to §4 F11, and removes from feed.
- Hidden owner can see reason in their My Listings entry but cannot edit, close, unhide or delete that listing.
- No unhide function, content rewrite, account suspension or user ban in MVP.

### 10.5 Audit

Domain add/activate/deactivate and listing hide each append exactly one actor/action/target/time audit event in same transaction. Store reason for hides. Admin role should not have an exposed endpoint to rewrite audit history. Audit retention and tamper-evidence controls are detailed in §13/§17.

---
## 11. Frontend, routes and accessibility

### 11.1 Application routes

| Frontend path | Screen | Access |
|---|---|---|
| `/signin` | Sign-in | Public |
| `/register` | Register with approved university email | Public |
| `/verify-email` | Verify account, handle expired link/resend | Public |
| `/forgot-password` | Request password reset | Public |
| `/reset-password` | Reset form using one-use token | Public |
| `/status` | Signed-in unverified status/resend | Auth, unverified |
| `/marketplace` | Shared listing feed | Verified |
| `/listings/:id` | Listing details + Request Item | Verified + visibility rules |
| `/post` | Create listing | Verified |
| `/listings/:id/edit` | Edit own available listing | Owner |
| `/activity` | My Activity (My Listings / Requests Sent / Received) | Verified |
| `/admin/domains` | University email domain management | Admin |
| `/admin/listings` | Listing moderation | Admin |

Default `/` redirects based on authentication and verification. No `/admin/verification` manual approval page, `/admin/universities`, `/account/delete` or standalone user profile marketplace page.

### 11.2 Screen and interaction requirements

**Register / sign-in / verification:** labeled fields, email-only signup, duplicate/invalid domain errors, resend link state, 60-minute expiry explanation, 5/hour limit messaging, sign-in lockout feedback, 30-minute idle timeout handling. No university ID field or pending-review application.

**Forgot/reset password:** request-reset form, generic “If the address is registered...” confirmation, expired/used reset link state, new password form, strength/length validation, confirmation then redirect to sign in.

**Marketplace:** responsive listing cards, category/type/free filters, title search, 20-item batches, Load More, loading/empty/error states. Search changes reset cursor and results correctly. Only feed-visible listings; no hidden/deleted items.

**Listing details:** optional photo, title, category, type, condition, description, owner display name, price/free label. “Request Item” shown only when eligible and not owner. Rent/Borrow show date fields; Rent shows computed/confirmed fee; Exchange shows offer description.

**Post/Edit:** one form with required fields; type selector reveal/clear behavior; fixed category and condition dropdowns; optional photo with retry; safe field-level errors. Edit uses version and handles stale conflict. Show warning about pending request cancellation before material price/type/terms edit.

**My Activity:** three distinct sections; status labels and allowed actions; owner Edit, Close, Delete buttons only where eligible; confirmation dialogs for Close/Delete; hidden owner sees reason, view-only. Sent/received requests show dates/fees/status and private pickup details only to the request's participants. Overdue flag is text, not color-only. Keep historic closed/completed information accessible. Deleted post can appear as a neutral historical reference in an authorized request's history, **not** as an editable/active listing.

**Exchange completion:** owner gets **Confirm Exchange** action only after accepted; must explicitly confirm “I confirm that both items have been exchanged successfully.” Do not ask requester for another completion action.

**Admin:** `Domains` table with Add / Active / Inactive actions and confirmation; `Listing Moderation` with search/filter and hide reason field; no student approval queue, multi-university manager, unhide or audit UI.

### 11.3 Responsive and accessible baseline

- Responsive at **360 px** minimum, no page-level horizontal scrolling, mobile-first plain CSS.
- All main flows usable by keyboard; visible focus, semantic buttons and form labels, field errors associated using `aria-describedby`, accessible dialogs.
- Do not rely on color alone for listing/request/domain statuses; text labels always present.
- Aim for WCAG AA contrast and touch targets ≥44px (**SOURCE proposed target**).
- All UI chrome/system messages in **English**; user-entered text may be in another language and must be preserved/safely rendered. Normalize input to NFC without destroying Bangla U+200C/U+200D.
- Never use `innerHTML` or `dangerouslySetInnerHTML` for any user content, even in admin.
- UI strings centralized in `client/src/lib/strings.ts` or equivalent.

---

## 12. Constants, categories, conditions and validation

### 12.1 Confirmed fixed values (FINAL)

```ts
export const LISTING_TYPES = [
  'sell', 'donate', 'rent', 'exchange', 'free_borrowing'
] as const;
export const LISTING_STATUSES = [
  'available', 'reserved', 'checked_out', 'completed', 'closed'
] as const;
export const REQUEST_STATUSES = [
  'pending', 'accepted', 'declined', 'cancelled', 'checked_out', 'completed'
] as const;
export const ACTIVE_REQUEST_STATUSES = ['pending', 'accepted', 'checked_out'] as const;
export const LIVE_REQUEST_STATUSES = ['accepted', 'checked_out'] as const;
export const VERIFICATION_STATUSES = ['unverified', 'verified'] as const;
export const USER_ROLES = ['member', 'admin'] as const;
export const FREE_FILTER_TYPES = ['donate', 'free_borrowing'] as const;

export const CATEGORIES = [
  { code: 'books_notes', name: 'Books & Notes' },
  { code: 'electronics', name: 'Electronics' },
  { code: 'stationery', name: 'Stationery' },
  { code: 'lab_equipment', name: 'Lab Equipment' },
  { code: 'furniture', name: 'Furniture' },
  { code: 'clothing', name: 'Clothing' },
  { code: 'sports', name: 'Sports' },
  { code: 'other', name: 'Other' }
] as const;
export const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'] as const;
export const CONDITION_LABELS = {
  new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair', poor: 'Poor'
} as const;

export const AUTH = {
  PASSWORD_MIN: 8,
  LOGIN_FAILS_BEFORE_BLOCK: 5,
  LOGIN_FAIL_WINDOW_MIN: 15,
  LOGIN_BLOCK_MIN: 15,
  SESSION_IDLE_MIN: 30,
  EMAIL_TOKEN_TTL_MIN: 60,
  RESEND_PER_HOUR: 5,
  PASSWORD_RESET_TOKEN_TTL_MIN: 30,
  SESSION_COOKIE: 'uc_session',
  CSRF_HEADER: 'x-csrf-token'
} as const;

export const PHOTO = {
  MAX_BYTES: 5 * 1024 * 1024,
  MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_PER_LISTING: 1
} as const;
export const PAGING = { DEFAULT: 20, MAX: 50 } as const; // both approved
export const MONEY = { CURRENCY: 'BDT', DECIMALS: 2, AMOUNT_MAX: '9999999.99' } as const;
export const UI = { LANGUAGE: 'en', MIN_VIEWPORT_PX: 360 } as const;
```

### 12.2 Approved engineering limits and operational constants (TEC-02, TEC-05, TEC-06)

The Deputy CTO authorized these implementation bounds for the UniCircle MVP. They are **approved technical settings**, not unconfirmed placeholders. Enforce on server with Zod and matching MongoDB validators as applicable; centralize in `shared/constants.ts`.

```ts
export const LIMITS = {
  DISPLAY_NAME: { min: 2, max: 50 },
  FULL_NAME_MAX: 100,
  TITLE: { min: 3, max: 100 },
  DESCRIPTION: { min: 10, max: 2000 },
  EXCHANGE_TEXT_MAX: 500,
  PICKUP_POINT: { min: 3, max: 120 },
  REASON: { min: 3, max: 500 },
  SEARCH_QUERY_MAX: 100,
  RENTAL_DURATION_MAX_DAYS: 365
} as const;
export const CAMPUS_TZ = 'Asia/Dhaka' as const;
// MONEY is defined once in §12.1 (max 9,999,999.99 BDT; DB representation: integer poisha).
export const AUTH_LIMITS = {
  ABSOLUTE_SESSION_LIFETIME_DAYS: 7,
  MAX_CONCURRENT_SESSIONS: 5,
  LOGIN_ATTEMPTS_PER_IP_PER_15_MIN: 100,
  REGISTER_PER_IP_PER_HOUR: 20,
  RESET_PER_ACCOUNT_PER_HOUR: 3,
  RESET_PER_IP_PER_HOUR: 10,
  VERIFICATION_RESEND_PER_IP_PER_HOUR: 30
} as const;
export const RETENTION = {
  AUDIT_MONTHS: 24,
  BACKUP_DAYS: 30,
  AUTH_FAILURE_HOURS: 24,
  EXPIRED_TOKEN_CLEANUP_HOURS: 48,
  UNREFERENCED_PHOTO_GRACE_DAYS: 7
} as const;
export const RECOVERY = { RPO_HOURS: 24, RTO_HOURS: 24 } as const;
```

**Financial validity:** Sale price/rent rate must be positive for paid types and no more than `MONEY.AMOUNT_MAX`; `rentalFeePoisha = dailyRatePoisha * rentalDays` must remain a safe integer **and** at or below the same max. Rent/Borrow duration is 1–365 campus calendar days. There is no client-side float arithmetic on currency. Partial decimals are normalized only after validated string parsing; negative/zero paid rates and over-limit amounts are rejected with field-level errors.

**Authentication rate limiting:** Verification resend retains the previously approved **5/account/rolling hour**; additionally 30/IP/hour. Login retains 5 failures per identifier per 15 minutes followed by 15-minute block, plus 100/IP/15 min. Registration permits at most 20/IP/hour. Password reset permits at most 3/account/hour and 10/IP/hour; both known and unknown emails receive the same generic response and no secret information. Enforce against a trusted, correctly configured proxy client IP; shared campus NAT and provider throttling must be monitored without weakening account protection. Hash identifier keys rather than storing raw emails in limiter logs.

**Session policy:** Session expires after **30 minutes idle or 7 days absolute**, whichever occurs first. Maximum 5 concurrent sessions/user; new login evicts the oldest if necessary. Revoke all sessions on successful password reset. CSRF/header checks still apply independently.

**Other validation:** `PAGING.DEFAULT=20`, `PAGING.MAX=50`; file upload max 5 MiB, 1 optional JPEG/PNG/WebP; immutable category/condition enums. Date validation uses the official server clock and `Asia/Dhaka`. These controls must be covered by boundary and rate-limit tests.

---

## 13. Security, privacy and external integrations

### 13.1 Security baseline

| Threat | Required control |
|---|---|
| Unauthorized marketplace/admin access | Every route has authentication/verification/role/ownership checks enforced on server. |
| False university membership | Exact-match **active domain** + proof of mailbox ownership through expiring, single-use token. |
| Login guessing | Argon2id, generic errors, 5 attempts/15 min → 15-min lockout, per-IP limits. |
| Session theft/CSRF | Opaque hashed session tokens, HttpOnly/Secure/SameSite cookie, 30-min idle expiry, Origin check + CSRF. |
| Token theft | 256-bit random tokens; store hashes only, single-use, expiration, no raw-token logs. |
| XSS/injection | Zod validation, sanitized text rendering, safe MongoDB query construction, strict CSP. Never spread untrusted JSON into query operators. |
| Dangerous uploads | Server-issued signed browser-direct upload; backend-verified object bytes/MIME/magic/size and owner-bound asset references. |
| Double booking | MongoDB transactions, listing write-contention guard, conditional update, unique partial indexes. |
| Private data leak | Strict view serializers and negative tests for email, hashes and non-participant pickup fields. |
| Admin misuse | Admin role guard; mandatory hide reason; auditable domain and moderation changes. |
| Forgotten password abuse | Generic request response, single-use 30-min token, session revocation, request rate limits. |
| Accidental destructive action | Explicit Delete Post confirmation; soft deletion; immutable history references. |

Security headers include CSP, HSTS on HTTPS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` on verification/reset token landing screens, no-cache on auth/admin/me/requests. Use TLS 1.2+ and prohibit secrets in source control or frontend environment bundles.

**Query safety in MongoDB:** Never pass request JSON directly as a filter. Construct allowlisted filters from validated primitive values, block `$`-operator/prototype-pollution payloads, avoid JavaScript-based query execution, and ensure role-based filters are mandatory. For title search, use a validated escaped/normalized token strategy with bounded query length; choose index/text query behavior and test Bangla titles if needed (no Bangla UI obligation).

### 13.2 Privacy and approved retention schedule (TEC-05)

**Important distinction:** User's choice to hide/remove an item from the feed or disable self-service account deletion does **not** justify refusing lawful personal-data requests. A restricted **manual privacy support workflow** must accept access/correction/deletion requests when applicable, record decisions and perform selective deletion/anonymization when law or verified authority requires. No user-facing Delete Account API is created in the MVP.

| Data | Authorized visibility | Approved retention / cleanup |
|---|---|---|
| User full name and university email | Account owner and strictly necessary backend auth support | While account remains active; manual lawful erasure/anonymization process applies when needed. No routine auto-purge of active accounts. |
| Password hashes | Authentication service only | Until replaced or lawfully erased; never in response or logs. |
| Verification/password reset token hashes | Authentication service only | Reject upon expiry/usage immediately; purge used/expired records within **48 hours** by cleanup job. |
| Failed sign-in / email limiter events | Security service only | **24 hours**, with purpose-specific minimized hashed identifiers. |
| Marketplace listings and user-owned optional photos | Visible to verified members only while active and not hidden/deleted | Keep closed/completed and logically deleted **text/transaction history** while relevant accounts remain active, with no scheduled automatic purge; lawful request may require selective removal. |
| Request terms, timestamps and participant pickup data | The relevant owner/requester only | Preserve authorized transaction history while relevant accounts remain active; minimize precise pickup data if a valid data-rights request requires it. No unrelated admin access. |
| Admin domain/moderation audit | Restricted security/operations process | Retain **24 months** then securely purge/archive only under the same approved protection/hold requirements; do not allow routine app-role edits. |
| Daily encrypted MongoDB backups | Restricted operations only | Retain **30 days** in a restricted, preferably off-server location, then securely expire. Restore-test before launch and quarterly. |
| Orphaned/unreferenced Supabase Storage uploads | Backend asset processing only | Delete after **7-day grace period** once not referenced by any retained history or active listing. Preserve needed history-image references. |

This is an **internal engineering retention baseline, not a legal opinion**. Show a clear English privacy notice covering collection, purposes, access rights, retention and contact details. Operational contacts and applicable local requirements must be verified before production; if a lawful requirement conflicts with a retention duration, law and documented privacy review take precedence and the PRD is versioned accordingly.

### 13.3 Supabase Storage Free photo handling

1. Max **one optional** image per listing; JPEG, PNG or WebP; ≤ **5 MiB (5,242,880 bytes)**; the frontend must offer preview, replace/remove, retry and Post Without Photo without losing the form.
2. **Bucket:** `unicircle-listings` in Supabase Storage (the **only** Supabase feature used). Public-read objects for item photos, no anonymous write/list/delete; do not use Supabase Auth or Postgres. Item photos are public by URL and must never carry private information.
3. Client calls `POST /api/v1/listings/photos/sign` with `{fileName,contentType,sizeBytes}`. Authenticated server validates metadata, issues random server-generated `storageKey` and owner-bound `photoAssetId`, and calls `createSignedUploadUrl` using server-only service credentials.
4. Client uploads binary **directly** using Supabase SDK `uploadToSignedUrl(path, token, file)`. The signed upload token has the provider's **two-hour** TTL. Never put service-role secrets in the browser or route the binary through the Vercel Express API.
5. Client calls `POST /api/v1/listings/photos/confirm` with `{photoAssetId}`. Backend confirms **actual** object byte length, MIME and magic-byte signature, provider path and current owner. If invalid, delete/reject asset; if valid, return trusted `{photoAssetId,secureUrl}`. Never trust arbitrary URLs/client-provided paths.
6. Listing create/edit binds that asset **once** to its owner in MongoDB transaction; replacing a photo retires old asset only when safe for history. Unreferenced assets cleaned after seven days by protected scheduled/offline job, not in-process timers.
7. Supabase free allowance/availability are external provider constraints; monitor quota. Storage tier does not guarantee ongoing unrestricted free use.

### 13.4 Email delivery

- Verification links (60 minutes, five resends/hour) **and password reset links (30 minutes)** are the **only automated email types** in MVP. The original “verification emails only” rule is superseded by the approved password-recovery feature.
- SMTP or equivalent provider; secrets in deployment environment only.
- Verification/reset link tokens transmitted to the intended address; never log full URL. Frontend removes the token from browser URL promptly and uses `Referrer-Policy: no-referrer`.
- Provider send failure should be handled without losing newly registered unverified account; provide resend/reset retry path as appropriate. Do not leak account existence.

### 13.5 Backup and recovery

- Back up MongoDB at least **once daily** using a transactionally consistent process for the deployed replica set. Maintain an **encrypted, access-restricted off-server copy** with 30-day retention; document who holds keys.
- Test restoration into an empty isolated MongoDB deployment **before launch and at least quarterly**, including users, indexes, requests, audit and domain settings.
- Recovery objectives are **RPO ≤24h** and **RTO ≤24h** for the MVP (§12.2). Validate these targets against chosen backup/hosting setup before launch. Do not reuse PostgreSQL `pg_dump` commands or SQL migration scripts.

---

## 14. Testing and acceptance criteria

### 14.1 Test levels and common requirements

- **Unit:** Zod validators, category/condition enum, money/date conversion, role/visibility serializers, token expiry rules.
- **Integration:** Real transaction-capable MongoDB in tests; indexes/conditional writes; auth and role guards; domain events; request state transitions.
- **Concurrency:** At least **50 repeated two-accept races**, plus accept-vs-delete, request-vs-accept, accept-vs-edit/hide/close.
- **E2E:** Register → verify → post → request → accept → handover/return; password reset; admin domain toggle and listing hide; post edit/close/delete.
- **Security:** CSRF/origin, XSS and MongoDB NoSQL/operator injection, privacy payload assertions, rate limits, upload checks and auth route inventory.
- **Quality:** Responsive at 360px; keyboard-only; Chrome/Firefox/Edge/Safari current/latest two versions; p95 feed ≤2 s for 1,000 seeded listings / 10 concurrent users.

### 14.2 Original PAC coverage, revised for final decisions

| ID | Acceptance criterion | Priority |
|---|---|---|
| PAC-01 | Register with **active approved domain** → unverified → one single-use link (60 min) → verified; reuse fails. | P0 |
| PAC-02 | Missing fields, malformed/unapproved domain, duplicate normalized email or password <8 → field errors, no account. **No ID registration path.** | P0 |
| PAC-03 | 5 wrong passwords in 15 min → 15-min block; generic credentials errors. | P0 |
| PAC-04 | 30 minutes idle → session invalid; logout invalidates session. | P0 |
| PAC-05 | Unverified or visitor cannot access any marketplace route; no manual review state. | P0 |
| PAC-06 | Admin can add/enable/disable approved domain; active permits registration, inactive blocks new registrations; no per-student approval. | P0 |
| PAC-07 | Non-admin rejected from all `/admin/*` APIs and pages; admin may use normal marketplace. | P0 |
| PAC-08 | No other member's email, password hash, token/session hash or university ID appears in marketplace responses. | P0 |
| PAC-09 | Sell/Rent positive amount ≤2 decimals; zero, negative, three-decimal inputs rejected by API/model. | P0/P1 |
| PAC-10 | Donate cannot have nonzero amount; stored as 0. | P0 |
| PAC-11 | Exchange requires owner terms and request offer; no monetary amount accepted. | P1 |
| PAC-12 | Free Borrowing stores zero fee and requires pickup/return dates in requests. | P1 |
| PAC-13 | Feed only `available && !isHidden && !deletedAt`, newest first; completed/closed/reserved/checked-out hidden. | P0 |
| PAC-14 | Free filter = Donate + Free Borrowing; card has type label; empty results described. | P0 |
| PAC-15 | Own listing request and duplicate active requests refused; declined/cancelled/completed history permits a later new request while available. | P0 |
| PAC-16 | Rent 100 BDT/day from 20–23 November = BDT 300, persisted exactly, visible to participants. | P1 |
| PAC-17 | Return date equal/before pickup rejected; empty Exchange offer rejected; past requested pickup date rejected. | P1 |
| PAC-18 | Accept without point/time or with past timestamp rejected; Rent/Borrow acceptance must match requested campus day. | P0/P1 |
| PAC-19 | Two competing accepts, 50 runs: **exactly one** accepted, one conflict, other pending declined; no orphan reservations. | P0 |
| PAC-20 | Pickup point/time only to request owner and requester, never third member or unrelated admin. | P0 |
| PAC-21 | Pending requester cancels; either participant cancels accepted pre-handover; listing returns available unless hidden. | P0 |
| PAC-22 | Type/price/rate/exchange terms edit cancels pending; title/category/description/condition/photo edit does not. | P0 |
| PAC-23 | Owner closes only available visible listing; pending cancelled; nonowner/reserved/checked-out denied. | P0 |
| PAC-24 | Admin hide cascades correctly for available/reserved/checked-out; hidden checked-out return remains possible. | P0/P1 |
| PAC-25 | Sell/Donate owner handover → request and listing completed. | P0 |
| PAC-26 | Rent/Borrow handover → checked-out; owner return → completed request and available listing unless hidden. | P1 |
| PAC-27 | Overdue checked-out request flagged in My Activity; no automated reminder. | P1 |
| PAC-28 | Only owner can record handover/exchange completion/return. | P0/P1 |
| PAC-29 | Admin domain changes and listing hides create one audit action each, atomic with data change; no untrusted update/delete path. | P0 |
| PAC-30 | Request's saved listing type/price/exchange terms remain fixed after later listing edit. | P0 |
| PAC-31 | Public/authenticated mutation CSRF and Origin policies function correctly, including browser reload token bootstrapping. | P0 |
| PAC-32 | All main flows run at 360px, keyboard-only; status has text label and focus visibility. | P0 |
| PAC-33 | Feed/search p95 ≤2 seconds with 1,000 seeded listings and 10 concurrent users (images excluded). | P0 |
| PAC-34 | Daily MongoDB backup plus successful restore into clean DB including indexes. | P0 |
| PAC-35 | E2E flows work on latest two versions Chrome, Firefox, Edge and Safari. | P0 |
| PAC-36 | Photo ≤5 MiB JPG/PNG/WebP; invalid size/MIME/signature rejected, failed upload preserves form and retries. | P1 |
| PAC-37 | Single-university schema has no unwarranted multi-tenancy assumptions; MongoDB indexes/migrations apply cleanly. | P0 |
| PAC-38 | Test-run logs contain no passwords, raw tokens, emails, private pickup details or secret env values. | P0 |
| PAC-39 | Exchange owner confirms both items handed over → request+listing completed; requester confirmation not required. | P1 |

### 14.3 New acceptance criteria (final changes)

| ID | Acceptance criterion | Priority |
|---|---|---|
| PAC-40 | Admin can store and independently activate **multiple domains for one university**; duplicate normalized domain rejected. | P0 |
| PAC-41 | Domain lookalikes/suffixes/unauthorized subdomains rejected; case-normalized exact matches accepted. | P0 |
| PAC-42 | Deactivated domain blocks **new** registration; previously verified domain holders keep access/history. | P0 |
| PAC-43 | Student, teacher or staff with approved verified university email have same member abilities; no manual ID/photo flow. | P0 |
| PAC-44 | Forgot-password request returns generic response for known/unknown emails and sends no token to unknown addresses. | P0 |
| PAC-45 | Password reset token single-use, expires after **30 min**; successful reset revokes all sessions and old password. | P0 |
| PAC-46 | Five verification resends per account per rolling hour allowed; sixth is not sent, previous tokens invalidated on new resend. | P0 |
| PAC-47 | Listing category exactly one of eight fixed options; condition exactly one of five fixed values; invalid value rejected. | P0 |
| PAC-48 | Feed gives 20 listings and Load More adds next 20 with no duplicate under cursor; filters reset pagination. | P0 |
| PAC-49 | Eligible owner can edit/close/soft-delete own available visible post; reserved/checked-out/hidden blocked. | P0 |
| PAC-50 | Delete Post confirmation, pending cancellation and soft-delete metadata occur atomically; post absent from feed, request history preserved. | P0 |
| PAC-51 | No UI/API permits self-service account deletion, admin student approval, multi-university admin or unhide. | P0 |
| PAC-52 | Hidden listing owner sees hide reason but cannot edit/close/delete/unhide; unrelated member cannot see it. | P0 |
| PAC-53 | Proposed pickup point is free text; timestamps in past rejected; requester/owner-only privacy maintained. | P0/P1 |
| PAC-54 | MongoDB indexes and conditional transaction guards prevent double-booking and request creation after concurrent listing removal. | P0 |
| PAC-55 | Domain admin events and listing moderation events are authorized and audit-logged without exposing personal pickup info. | P0 |
| PAC-56 | Unverified user cannot verify while the registration domain is inactive; verification resumes after reactivation; existing verified user remains active. | P0 |
| PAC-57 | 30-minute inactivity / 7-day absolute session expiry and maximum five concurrent sessions are enforced; oldest session evicted on sixth. | P0 |
| PAC-58 | Password reset 3/account/hour, 10/IP/hour, verified resend 5/account/hour and 30/IP/hour, signup 20/IP/hour, login 100/IP/15 min are enforced with privacy-preserving keys. | P0 |
| PAC-59 | Paid amount cap, safe integer poisha arithmetic, maximum 365 rental days, 50-item query maximum and text limits reject boundary violations. | P0/P1 |
| PAC-60 | Historical listings/requests and participant pickup privacy survive soft delete; audit/backup/limiter/token/photo cleanup follow §13.2 without deleting referenced assets. | P0/P1 |
| PAC-61 | Daily encrypted database backup retained for 30 days and restored in isolated environment; documented runbook demonstrates RPO/RTO objective ≤24h. | P0 |
| PAC-62 | Admin bootstrap, real official domain, real university name, sender/domain ownership and privacy contact are verified in deployed configuration; no example values silently granted. | P0 |

### 14.4 Definition of Done

A task is done only if code adheres to declared API/model contracts, passes unit/integration tests, has required e2e/security checks, includes migration/index updates where necessary, meets task-relevant PAC IDs, has code review, and the task report is delivered. A green build without concurrency/privacy tests is **not** release-ready.

---

## 15. Implementation task plan and team responsibilities

### 15.1 Source team's ownership (update requires agreement)

| Team member | Responsibility in revised MVP |
|---|---|
| Taufiqul Islam | Frontend React/plain CSS screens, marketplace, auth+reset UI, post management, My Activity, admin domain/moderation screens, accessibility. |
| Mostofa Ahmed | Backend Express, registration/email verification/reset, sessions/CSRF, domain admin API, moderation API, listing write API, Supabase Storage signed-upload integration. |
| Md Sohan | MongoDB models, validators/indexes/scripts, request state machine/concurrency, feed and My Activity queries, daily backup/restore. |
| Turjo Mondal | QA cases, security/privacy tests, API/E2E, concurrency, responsive/browser checks, defect reports. |
| Suchana Jaman Esha | Project management, documentation, decisions/risks, integration review, final system testing. |

Assignments are inherited from original PRD v1.0 and adapted to the new features; reassign as a team if needed. No named member automatically approves product scope on behalf of Pointfex.

### 15.2 Task cards

| Card | Name | Owner(s) | Depends on | Completion evidence |
|---|---|---|---|---|
| T00 | Foundation: monorepo, CI, TypeScript, Express, Vite, MongoDB connection | Mostofa + Sohan | Architecture agreement | App and health endpoint work; CI passes. |
| T01 | MongoDB model, indexes, seeds, transaction-ready local environment | Sohan | T00 | Collections/indexes/validators tested; eight categories seeded. |
| T02 | Registration, approved-domain verification, sign-in, sessions, forgot/reset password | Mostofa | T01 | PAC-01–05, 31, 40–46. |
| T03 | Frontend auth shell: sign-in, register, verify, status, forgot/reset | Taufiqul | T00, T02 API contract | Accessible auth flows at 360px. |
| T04 | Listing write API: Sell/Donate, edit/close/delete and version checks | Mostofa | T01 | PAC-09, 10, 22, 23, 49, 50. |
| T05 | Feed/search/filter/pagination API | Sohan | T01 | PAC-13, 14, 33, 48. |
| T06 | Marketplace and listing details, post/edit/delete UI | Taufiqul | T04–05 | Validated post → feed → details → edit/delete. |
| T07 | Request lifecycle, accept concurrency, cancellation and Sell/Donate handover | Sohan | T01, T04 | PAC-15, 19–21, 25, 28, 30, 54. |
| T08 | My Activity API + UI | Sohan + Taufiqul | T07 | All three sections, privacy and history. |
| T09 | Admin domains + listing moderation API/UI | Mostofa + Taufiqul | T02, T07 | PAC-06, 07, 24, 29, 40–42, 52, 55. |
| T10 | Rent and Free Borrowing fee/dates/checkout/return | Sohan + Mostofa + Taufiqul | T07 | PAC-12, 16–18, 26, 27. |
| T11 | Exchange owner-only completion | Sohan + Taufiqul | T07 | PAC-11, 39; **no longer blocked by old OQ-11**. |
| T12 | Optional photo, Supabase Storage, retry UI and asset validation | Mostofa + Taufiqul | T04 | PAC-36. |
| T13 | Integration, load, accessibility, security/privacy and concurrency QA | Turjo + all | T02–12 | Complete acceptance matrix and defect closure. |
| T14 | Deployment, backup/restore, runbook, demo and sign-off | Suchana + all | T13 | §18 launch gate. |

**Scheduling:** The original 10-day plan is an engineering planning **target, not a guarantee** (TEC-09). The PM re-estimates execution before committing delivery dates, accounting for MongoDB migration, password recovery, domain administration, post deletion and expanded test coverage. Foundation, data model, API contract and concurrency design are critical path; do not start parallel frontend/backend implementations against incompatible DTOs.

### 15.3 Task report template

```markdown
## Task: Txx — Title
**Status:** Done / Partial / Blocked
**Summary:** What changed and why
**Files changed:** Paths and purpose
**How to run:** Commands and expected result
**Acceptance evidence:** PAC IDs and tests run
**Security and business rules checked:** Rationale
**Database/index changes:** Included migration/script paths or None
**Decisions/assumptions:** Any new contradiction, missing deployment input, or versioned change request encountered
**Known issues:** Bugs/blockers, no silent scope changes
**Suggestions not implemented:** Optional improvements
```

---

## 16. Deployment and operations

### 16.1 Target services and routing

| Service | Final target | Launch caveat |
|---|---|---|
| React/Vite SPA | Vercel | Preserve frontend; SPA fallback/refresh tested. |
| Express `/api/v1` | Vercel Node Functions | Same-origin routing/proxy and cookie behavior must be verified. |
| Primary application DB | MongoDB Atlas via Mongoose | Transactions require a replica set; check plan support and cluster lifecycle. |
| Listing photo storage | **Supabase Storage Free** | 1 GB free storage allowance at time of decision; signed client uploads, quotas/paused projects must be monitored. |
| Transactional mail | Authorized email sender/provider (SMTP or API) | A valid member address `@seu.edu.bd` does **not** authorize sending `From: ...@seu.edu.bd`. |
| CI | GitHub Actions | Lint, tests, schema checks, build, dependency/security checks. |
| Backups | Encrypted off-server MongoDB backup job | Daily with 30-day retention and tested restore; do not assume free Atlas automated backups. |

**Important plan/terms constraint:** Vercel Hobby is for personal/non-commercial usage. UniCircle includes sell/rent activity, so do not launch a commercial deployment on Hobby without confirming eligibility; use a compliant Vercel tier or change the deployment target by recorded technical decision. This is a deployment gate, **not** a finished infrastructure setup.

### 16.2 Environment variables (names only)

```dotenv
NODE_ENV=
APP_BASE_URL=
ALLOWED_ORIGINS=
MONGODB_URI=
SESSION_COOKIE_NAME=uc_session
EMAIL_FROM=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_LISTING_BUCKET=unicircle-listings
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
ADMIN_BOOTSTRAP_EMAIL=
PRIVACY_CONTACT_EMAIL=
LOG_LEVEL=
```

Use *backend-only* secret scopes for `MONGODB_URI`, SMTP password and `SUPABASE_SERVICE_ROLE_KEY`; `VITE_*` variables are publicly exposed, so never put secrets there. Prefer actual Vercel project secret manager; do not commit `.env` files. `approvedEmailDomains` is a MongoDB collection, **not** an environment allowlist; seed `seu.edu.bd` active only after an authorized operator confirms the domain should be accepted for this university.

### 16.3 Local development, release and operations

- Local Vite proxy forwards `/api/v1` to Express; React uses same-origin paths. Production Vercel routing must prove `GET /api/v1/health`, `GET /api/v1/auth/csrf` and SPA refresh all work.
- `frontend` browser sends JSON API requests with `credentials:'include'`; unsafe requests also use current `x-csrf-token`; browser uploads photo bytes directly to Supabase signed URL.
- Obtain genuine university name, app origin and authorized email sender; configure credentials and admin bootstrap securely. No production release with seed/demo accounts or demo `localStorage` auth.
- Use transactional index migration scripts before deployment; instrument safe logs; verify 50 concurrent accept races, 5 MiB photo boundary, private pickup and session cookie behavior on Vercel.
- Every 24 hours take an encrypted consistent MongoDB backup and retain 30 days; test restores before first release and quarterly thereafter. An unverified backup system is a **launch blocker**, not automatically solved by a free plan.

## 17. Decision closure, authority and operational verification

### 17.1 Approval scope

**Project/engineering direction:** On 23 November 2026 the project’s **Deputy CTO** stated in the conversation that the team can decide the remaining matters and instructed resolution. Accordingly, §0.3’s explicit product decisions remain unchanged, and §0.4/§12.2/§13.2’s engineering defaults are adopted as the internal implementation baseline. This is **not** a fabricated institutional signature, legal approval, provider purchase, or evidence that the upstream SRS file was edited. The project manager should update SRS v1.1 via its normal document-control workflow and maintain a versioned change log. Implementation need not stall waiting for re-answering already approved choices; external organizational sign-off, where contractually required, is a separate administrative condition for public launch.

### 17.2 Closed decision register (formerly O-01 to O-15)

| Previous ID | Approved engineering disposition | Verification still necessary |
|---|---|---|
| O-01 | One university settings document, with any number of **official approved domains** managed by Admin. Initial domain `seu.edu.bd` is operator-seeded after authorization; other domains require admin approval. | Actual university name and proof of domain ownership/authorization before production. |
| O-02 | Deputy CTO–authorized product/technical implementation baseline supersedes old proposed SRS requirements. | PM synchronizes original SRS; any separate Pointfex contract signature, if required, must be collected, not invented. |
| O-03 | Registered **unverified** account on inactive domain cannot complete verification until domain reactivated; records/history preserved. | Admin toggle and token-flow tests. |
| O-04 | Owner Delete Post allowed only while listing `available`, not hidden/deleted; closed/completed history not user-deletable in MVP. | Authorization/state tests. |
| O-05 | Campus timezone `Asia/Dhaka` is approved. | Seed setting and time-zone tests. |
| O-06 | Financial caps/input lengths/page maximum/rental duration fixed in §12.2. | Boundary tests. |
| O-07 | Password reset and IP auth limits fixed in §12.2. | Rolling-window, NAT-safe monitoring and throttling tests. |
| O-08 | 30-minute idle, 7-day absolute and five concurrent sessions. | Session expiration and password-reset revocation tests. |
| O-09 | Retention, limited deletion response, 24-month audit, 30-day backup and 7-day orphan-photo grace in §13.2. | Publish privacy notice; verify applicable legal obligations without claiming legal signoff. |
| O-10 | Vercel Node HTTPS + transaction-capable MongoDB Atlas + transactional email + Supabase Storage Free + GitHub Actions, RPO/RTO ≤24h. | Operators choose/provision vendor, verify sender identity/secrets, and restore-test. |
| O-11 | Active domain is required at **signup and verification completion**; existing verified users unaffected by later deactivation. | Exact normalized-domain tests. |
| O-12 | Clean up only unreferenced images after 7 days, retaining needed history assets. | Cleanup job and no-data-loss tests. |
| O-13 | No dedicated archive UI for deleted posts; relevant participant-linked request histories remain visible and labeled unavailable. | History/authorization tests. |
| O-14 | Original 10-day plan becomes a planning **target**. P0 then P1, all approved MVP features still required; no fabricated commitment. | PM/team re-estimate task schedule as executable work plan before delivery commitment. |
| O-15 | Centralized English UI strings, bounded safe error messages and generic security responses; email `From` uses **verified** production sender. | Operator provisions EMAIL_FROM and tests outbound email/DMARC/SPF as applicable. |

### 17.3 Factual deployment prerequisites (not unresolved product requirements)

1. Provision and record the **real university name** in `universitySettings`; seed the configured initial domain **`seu.edu.bd`** once an authorized operator confirms its official use for this single university; do not silently activate additional domains or assert rights to send email from this domain.
2. Provision the real HTTPS application URL, `ALLOWED_ORIGINS`, MongoDB replica set/managed transaction-capable cluster, environment secrets, Supabase Storage Free project, and a domain-verified SMTP sender. Actual credentials, accounts and vendor identities must never appear in PRD or git.
3. Securely bootstrap the first admin outside public registration, with a named accountable operator and an audit entry; turn off unnecessary bootstrap access afterward.
4. Publish an English privacy notice, operator privacy-request contact, retention implementation schedule, incident contact and backup runbook. If institutional counsel or an external sponsor demands separate approval, obtain it before **public launch**; do not assert it was already granted.
5. Run all §18 launch tests; record outcomes, deployment URLs and sign-off evidence. A product-policy decision is **not** proof that code, vendors, backups or regulatory reviews are complete.

**No open product-policy or technical-default choices remain in this version.** New facts, legal constraints, discovered contradictions and authorized change requests follow versioned change control.

## 18. Launch readiness gate

- [x] Internal project/engineering decision authority recorded: Deputy CTO direction on **23 November 2026** (see §17.1).
- [ ] Earlier SRS wording synchronized by document owner; obtain separate external/Pointfex approval **only if externally required**, without claiming one already exists.
- [ ] One university name/timezone and at least one officially authorized active domain configured in DB; no unreviewed public registration.
- [ ] Admin bootstrap completed securely; domain management and hide actions audited.
- [ ] Verified signup, 60-minute links, 5/hour resend, password reset with 30-minute link, lockout and sessions tested.
- [ ] No university ID/manual approval/multiple-university code, account deletion endpoint, messaging or payment workflows shipped.
- [ ] All agreed P0/P1 listing types and post Edit/Close/Delete functions tested.
- [ ] Request state machines, private pickup access, no-double-booking and 50-race concurrency tests pass on transaction-capable MongoDB.
- [ ] Soft-deleted and closed/completed history behavior verified; no orphaned requests/hidden leakage.
- [ ] Admin/domain audit, CSRF, rate-limit, MongoDB operator-injection and upload safeguards pass.
- [ ] 360px keyboard-only, English UI and major browser tests pass.
- [ ] 1,000-listing / 10-user feed p95 ≤2s performance target verified on target deployment.
- [ ] Daily MongoDB backup scheduled, encrypted/access-controlled and restore-tested.
- [ ] Implement §13.2 retention/privacy notice and §12.2 security constants; actual hosting, MongoDB topology, sender identity, secrets and operations contacts verified and configured.
- [ ] README, DATABASE.md, ARCHITECTURE.md, openapi.yaml, AGENTS.md, runbook, task reports and acceptance matrix synchronized.

---

## Appendix A. Source-to-final change matrix

| Original PRD v1.0 area | Final v3.0 action |
|---|---|
| §1 team roles | Remove manual ID review responsibilities; adapt Sohan's database ownership to MongoDB; add reset/domain/delete. |
| §2.1 and §2.3 | Keep single-university shared feed; eligible university email holders include students/teachers/staff; no manual applicant role. |
| §2.4–2.5 | Replace PostgreSQL/pg/node-pg-migrate/SQL structure with MongoDB + approved Mongoose ODM; document docs and AGENTS references. |
| §3 scope/tasks | Add password reset, admin domain controls, post deletion; preserve original marketplace features and P0/P1 sequencing. |
| §4 security/business rules | Add domain and soft-delete rules; preserve participant privacy; remove SQL-specific instructions. |
| §5 deliverables | Preserve task report and review gate; update documentation and DB index scripts. |
| §6 F01–F03 | Email-only verification, no ID review; admin domain management + listing hide. |
| §6 F04–F05 | Fixed eight categories and five conditions; optional one photo 5 MiB; Edit/Close/Delete. |
| §6 F06–F10 | 20-item cursor pagination; free-text future pickup; MongoDB atomic acceptance. |
| §6 F11–F13 | Preserve hide/return/privacy/history; Exchange owner-only completion; view-only hidden owner. |
| §7 constants | Set finalized link expiry (60), reset expiry (30), resend (5), pagination (20), image (5 MiB). |
| §8 PostgreSQL | Replace with MongoDB collections, ObjectId refs, indexes, conditional mutations and transactions. |
| §9 SQL pseudocode | Replace with MongoDB transactional algorithms; correct public/authenticated CSRF bootstrap. |
| §10 APIs | Remove manual verify; add domain administration, forgot/reset, Delete Post and CSRF bootstrap. |
| §11 Admin | Remove student queue/approve/reject; add domain controls; listing hide remains. |
| §12 UI | Remove ID flows; add reset/domain/delete; English only; keep accessibility. |
| §13 integration | Supabase Storage asset ownership + secure upload; email now supports verification **and reset**. |
| §14–15 security/infra | Replace SQL-specific injection/backup with MongoDB/operator injection and MongoDB restore. |
| §16 acceptance | Revise PAC-01–39; add PAC-40–62 for confirmed product, security, retention and deployment requirements. |
| §17 launch | Close technical decisions via Deputy CTO direction; distinguish factual configuration and any separately required external sign-off. |
| §18–20 logs/future scope | Preserve historical metrics; multi-university stays **out**; record updated decisions. |
| Appendix A questions | Close remaining engineering policy decisions in §17; identify factual deployment prerequisites and any separately required external signatures. |

## Appendix B. Requirement traceability

| Feature | Main requirements | Main task | Main tests |
|---|---|---|---|
| Registration and verification | F01, F02 | T02–T03 | PAC-01–05, 08, 31, 41–43, 46 |
| Password recovery | F14 | T02–T03 | PAC-44–45 |
| Domain administration | F03, F15 | T09 | PAC-06–07, 29, 40–42, 55 |
| Sell/Donate post + edit/close/delete | F04, F05, F16 | T04/T06 | PAC-09–10, 22–23, 49–50 |
| Feed and pagination | F06 | T05–T06 | PAC-13–14, 33, 48 |
| Request, accept, concurrency | F07, F09, F10 | T07 | PAC-15, 18–21, 30, 54 |
| Date/fee/offer | F08 | T10–T11 | PAC-11–12, 16–17 |
| Hide/cancel | F11 | T07/T09 | PAC-21, 24, 29, 52 |
| Handover/return/exchange | F12 | T07/T10/T11 | PAC-25–28, 39 |
| My Activity and history | F13 | T08 | PAC-20, 27, 30, 50 |
| Listing photo | F04, §13.3 | T12 | PAC-36 |
| Security/availability/QA | §13–§18 | T00/T13/T14 | PAC-03–04, 07–08, 19–20, 31–38, 51, 53–62 |

## Appendix C. Codex implementation instructions

> Store the operational instruction version of this appendix in repository root `AGENTS.md` and keep it synchronized with the PRD.

1. Read `PRD.md` fully, especially §0, §4, §5, §7–§9, §12, §14 and §17. Also read `DATABASE.md`, `ARCHITECTURE.md`, and `openapi.yaml` when present.
2. Do not implement from original PRD v1.0's SQL/manual-verification sections. Never reintroduce PostgreSQL, university ID reviews, multi-university features, account deletion, unhide, chat or payments.
3. Execute **one Txx task card per change**; identify exact PAC IDs to satisfy. Present a brief design plan and any new contradiction or missing deployment input before touching affected business/security areas.
4. Use validated shared schemas and constants, types and responsive plain CSS. Keep backend business logic inside services and MongoDB access inside repositories.
5. Any multi-document state transition must be transactionally safe on MongoDB; run real concurrency tests. Do not claim “atomic” without verification.
6. Keep participant privacy, admin authorization, token redaction, upload ownership and proper CSRF controls across all routes.
7. Implement the Deputy CTO–approved technical policies in §0.4, §12.2, §13.2 and §17. Do not invent real university/domain ownership, provider identities, credentials or outside signatures; report missing deployment inputs and new contradictions instead of silently guessing.
8. Internal engineering approval is **not** production readiness or institutional signature; do not claim either until §18 launch gate is met and any externally required approval is documented.
9. Run lint, typecheck, tests and build; report PAC evidence, files changed, migrations/index changes and limitations using §15.3 report template.

---

**End of UniCircle Final PRD v3.0 — Deputy CTO–authorized engineering baseline.**  
**Change control:** Changes to FINAL or ENGINEERING-APPROVED decisions require a documented version update reflected in PRD, API contract, MongoDB model, tests and deployment notes. Third-party/institutional approval is not assumed and is only asserted when verifiably recorded.
