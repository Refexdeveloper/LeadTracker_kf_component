# Kissflow Components (Lead_KF)

React + Vite custom **Kissflow Page** components for lead management, contracts, and related dashboards.

## Main entry

- `src/App.jsx` — active page routing
- `src/LeadsManagementHubPage.jsx` — **Me** (My Tasks / My Items) + **My Team** hub
- `src/LeadsManagementPage.jsx` — tasks, items, KPI cards, table accordion
- `src/MyTeamLeadsView.jsx` — team report table + accordion detail

## Setup

```bash
npm install
cp .env.example .env   # optional: VITE_KF_* overrides
npm run dev
npm run build         # dist/ for Kissflow upload (index.html + manifest.json + assets/)
```

## Kissflow upload

After `npm run build`, upload `dist/index.html`, `dist/manifest.json`, and `dist/assets/*` to your Kissflow custom Page.

## Environment

See `.env.example` for optional `VITE_KF_*` IDs (account, process, popup, report).
