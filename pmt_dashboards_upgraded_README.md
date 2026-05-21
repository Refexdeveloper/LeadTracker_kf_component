# PMT dashboards — upgraded Kissflow pages

Your friend’s **`pmt_cto_dashboard`** and **`pmt_employee_dashboard`** folders only contained **built** assets (minified `index-*.js` / CSS), not editable React source — so they couldn’t be refactored in place.

These **upgraded** packages are full **Vite + React + Tailwind v4** projects with **source**, styled to match the premium look of this repo (glass headers, gradient KPI cards, Plus Jakarta Sans, Remix icons, subtle motion via AOS).

## Folders

| Folder | Role |
|--------|------|
| `pmt_cto_dashboard_upgraded/` | CTO “Command Center” — portfolio table, health bars, decisions tab, `window.kf.user` greeting |
| `pmt_employee_dashboard_upgraded/` | Employee “My Workspace” — KPIs, 3-column task board, quick-add modal, status moves |

## Build (per folder)

```bash
cd pmt_cto_dashboard_upgraded
npm install
npm run build
```

Upload the **contents of `dist/`** (`index.html`, `assets/`, `manifest.json`) to Kissflow as a **custom Page** (same as before).

Repeat for `pmt_employee_dashboard_upgraded/`.

## Local preview

```bash
npm run dev
```

## Wiring real data

- Replace the `MOCK_*` / `INITIAL_TASKS` arrays with `fetch` or `window.kf.api(...)` inside `useEffect`.
- Keep loading / error UI as you add APIs.

## Optional env

No env vars required. Both pages read **`window.kf.user`** when embedded in Kissflow.

---

Original static bundles remain in `pmt_cto_dashboard/` and `pmt_employee_dashboard/` for reference only.
