# UniCircle Frontend

React/Vite frontend for UniCircle. It follows the [v3.0 UI handoff](../UniCircle_Frontend_UI_Fix_Handoff_FINAL.md), the [screen-to-API mapping](../FRONTEND_API_MAPPING.md), and the frozen [API contract](../API_CONTRACT.md).

## Run and verify

Use Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
npm test
npm run build
```

For local testing, copy `.env.example` to `.env.local` and set `VITE_MOCK_API=1` before starting Vite. Fixture accounts are `member@seu.edu.bd`, `owner@seu.edu.bd`, `pending@seu.edu.bd` and `admin@seu.edu.bd`, all with password `LocalTest123!`. Use `/verify-email?token=fixture-token-for-local-testing` or `/reset-password?token=fixture-token-for-local-testing` in the same development tab. The fixtures keep state in memory and send no email.

The production frontend uses same-origin `/api/v1`, cookie credentials and CSRF. The Vite dev and preview servers can proxy the API with `UNICIRCLE_API_ORIGIN`. The hosting configuration must route `/api/v1/*` to Express and serve `index.html` for frontend deep links. Photo upload requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Keep server credentials out of all `VITE_*` settings.

## Source map

| File | Responsibility |
| --- | --- |
| `src/main.jsx` | Path navigation, session gating, marketplace cards, filters and pagination |
| `src/marketplace-ui.jsx` | Collage animation, category bar and Pointfex footer |
| `src/account-v3.jsx`, `src/listings-v3.jsx`, `src/activity-v3.jsx` | Account, listing and request forms, activity and admin |
| `src/api.js`, `src/ui.jsx` | Contract client and shared form/loading/error handling |
| `src/mocks/api.js` | Opt-in development fixtures |
| `src/style.css` and `src/visuals.jsx` | Styles and listing images |

## Backend handoff

Use [API.md](API.md) to find the authoritative v3.0 API files and [baseline status](../FRONTEND_V3_BASELINE.md) for completed and pending work.
