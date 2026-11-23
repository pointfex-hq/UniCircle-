# UniCircle Frontend

React/Vite frontend baseline for UniCircle. Start with the [v3.0 UI handoff](../UniCircle_Frontend_UI_Fix_Handoff_FINAL.md) and [screen-to-API mapping](../FRONTEND_API_MAPPING.md) when developing integration. The current baseline still uses browser demo data.

## Run and verify

Use Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
npm test
npm run build
```

Choose **Try demo account** on the sign-in screen. Check listing filters, the five listing types, and pickup/return using the sample accounts. Demo verification and the older admin workflow are baseline behaviors that the v3.0 stages replace.

## Source map

| File | Responsibility |
| --- | --- |
| `src/main.jsx` | Navigation, sign-in gating, marketplace cards and filters |
| `src/marketplace-ui.jsx` | Collage animation, category bar and Pointfex footer |
| `src/screens.jsx` | Account, listing and request forms, activity and admin |
| `src/demo-store.js` | Baseline browser storage and demo accounts |
| `src/market.js` and `src/market.test.js` | Demo data, filters, fees, and state transitions |
| `src/style.css` and `src/visuals.jsx` | Styles and listing images |

## Backend handoff

Use [API.md](API.md) to find the authoritative v3.0 API files and [baseline status](../FRONTEND_V3_BASELINE.md) for completed and pending work.
