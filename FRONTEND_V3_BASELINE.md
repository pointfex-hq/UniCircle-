# UniCircle frontend v3.0 baseline

Baseline commit `0ad4777` from the existing frontend PR. The handoff names a React ZIP as the starting tree. This checkout uses the available Git commit and contains the same React/Vite screen structure plus the current marketplace motion components. The named ZIP was not available for a byte-by-byte comparison.

## Phase 0 scope

- Imported the supplied PRD, API contract, OpenAPI, architecture, database design, frontend mapping, staged tasks, agent instructions and frontend handoff as repository documentation. The handoff's Markdown edition is the repository copy.
- Pointed both READMEs and the previous frontend API reference to the v3.0 contract.
- Set up CI to run frontend tests/build and check OpenAPI structure and route inventory.
- Kept the React baseline available for comparison. Frontend feature changes start in Phase 1 of the [frontend handoff](UniCircle_Frontend_UI_Fix_Handoff_FINAL.md). Backend code, provider setup and deployment are outside this frontend phase.

| File | Baseline responsibility |
| --- | --- |
| `frontend/src/main.jsx` | Hash navigation, marketplace, demo session and route guards |
| `frontend/src/screens.jsx` | Account, forms, item detail, activity and admin UI |
| `frontend/src/marketplace-ui.jsx` | Hero collage, category rail and footer |
| `frontend/src/demo-store.js` | Browser-storage demo accounts, simulated verification and listing state |
| `frontend/src/market.js` and `market.test.js` | Demo enums, fees, request transitions and baseline tests |
| `frontend/src/style.css` and `visuals.jsx` | Existing layout and listing images |

## Implementation sequence

1. FE-05, FE-16–18. Establish contract enums, path routes, the session-aware HTTP adapter and isolated development mocks. Remove demo authentication from the production entry point.
2. FE-01–04. Implement email-only sign-in/registration, verification status and resend, token handling and password recovery.
3. FE-06–09. Add listing DTO mapping, versioned edits, cursor pagination, listing detail/request forms, and signed photo upload with retry.
4. FE-10–14. Add close/delete confirmations, free-text pickup, owner/requester actions, explicit exchange handover, and hidden-listing behavior.
5. FE-15. Replace the old manual-review queue with domain management and listing moderation.
6. FE-19–21. Test loading/error/empty states, permissions, mobile and keyboard workflows. Capture UI evidence against development mocks and verify production behavior against the backend when available.

## Acceptance status

Phase 0 left the baseline demo behavior in place. The v3 frontend implementation now replaces it with an HTTP client and opt-in development fixtures. The frontend README documents the current runtime and test setup. Live behavior still depends on the backend implementing the frozen API and provisioning its services. Keep product and wire-contract changes in a versioned review.

OpenAPI inventory is 36 operations on 32 unique paths. CI validates the OpenAPI document and verifies that its method/path inventory matches the human-readable contract.

## Contract questions for a versioned review

| Source | Discrepancy | Proposed documentation patch |
| --- | --- | --- |
| `API_CONTRACT.md` §A `ListingSummary` and `openapi.yaml` `components.schemas.ListingSummary.required` | The prose permits `exchangeTerms` on detail only. The schema requires it on every summary and permits null. | Make the prose require the nullable summary key, or explicitly remove it from the schema's required keys if omission is intended. |
| `API_CONTRACT.md` §B operation 02 and `openapi.yaml` `GET /auth/csrf` | The table lists HTTP 500. The operation only declares 200. PRD §8.2 also specifies authenticated bootstrap after reload, which the operation description does not mention. | Document both public and authenticated bootstrap cases and add the intended error response to the schema. |

The imported contract files are unchanged. These questions do not block baseline tests or route-inventory comparison. Resolve them with the team before asserting full contract conformance.

## Local verification

- `npm test`: 4 baseline tests passed.
- `npm run build`: production bundle compiled with the existing lockfile and dependency tree.
- `python scripts/check_contract.py`: 36 operations matched across 32 paths.
- Full OpenAPI validation and hosted CI remain unverified. The validator is configured in CI and could not be installed in this environment.
