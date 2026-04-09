# CLAUDE.md

## Project Overview

French leave/attendance tracking web app for 2026. Tracks presence/absence for team members across working days.

## Stack

- **Frontend**: `index.html` + `styles.css` (no build step, no framework)
- **Backend**: `server.js` — Express + sql.js serving a local SQLite database (`conges.db`)
- **Start**: `node server.js` then open `http://localhost:3100`

## File Structure

```
index.html   — UI (HTML + JS only, CSS extracted to styles.css)
styles.css   — All CSS styles
server.js    — Express backend with SQLite persistence
conges.db    — SQLite database (auto-created on first run)
```

## Architecture

**Backend** (`server.js`):
- `INITIAL_DATA`: inline JSON for seeding a blank DB and `/api/reset` — **currently commented out**, so `/api/reset` will throw a ReferenceError if called
- `seedDb()`: creates `attendance` (person, date, present), `members` (person, role, sort_order), and `roles` (name, color) tables
- `saveDb()`: writes the in-memory sql.js DB to `conges.db` after every mutation
- API endpoints: `GET /api/data`, `GET /api/members`, `GET /api/roles`, `POST /api/toggle`, `POST /api/reset`, `POST /api/members/add`, `POST /api/members/role`, `POST /api/members/rename`, `POST /api/members/reorder`, `POST /api/members/delete`, `POST /api/roles/add`, `POST /api/roles/rename`, `POST /api/roles/update`, `POST /api/roles/delete`

**Frontend** (`index.html`):
- `loadData()`: fetches `/api/data`, `/api/members`, and `/api/roles` on startup; populates `DATA`, `MEMBERS`, `ROLES_DATA`, `ROLES`
- `toggleDay(name, dateKey)`: POSTs to `/api/toggle`, updates `DATA`, re-renders
- `update()`: recomputes stats from `DATA` filtered by person/date range, renders cards and team table
- `calcStats(personData, start, end)`: counts present/absent/half days, skips weekends and holidays
- `renderCard(name, stats, role)`: builds per-person card with month-by-month day grid; role badge uses dynamic color from `ROLES_DATA`

**Date range:** 2026-03-16 through 2026-12-31 (hard-coded in both backend and frontend).

## Gotchas

- **French public holidays** are defined in both `server.js` (`HOLIDAYS_SERVER`) and `index.html` (`HOLIDAYS` Map) — keep them in sync if adding/removing holidays.
- **`INITIAL_DATA` is commented out** in `server.js` — calling `/api/reset` via the UI will crash the server. To reset, delete `conges.db` and restart.
- **Roles are dynamic** — stored in the `roles` table, not hardcoded. `ROLES_DATA` / `ROLES` are populated at startup from `/api/roles`.

## Common Modifications

- **Add/remove a team member:** Use the "+ Personne" entry in the person dropdown, or POST to `/api/members/add`.
- **Rename a team member:** Double-click their name on their card.
- **Manage roles (add/rename/delete/recolor):** "⚙ Rôles" item in the person dropdown.
- **Reset live data to baseline:** Delete `conges.db` and restart the server (`INITIAL_DATA` is commented out so the UI reset button is broken).
- **Change date range:** Update the hard-coded bounds in `server.js` (`getWorkingDays()`) and the `<input min/max>` attributes in `index.html`.
- **Default port:** `3100` (override with `process.env.PORT`).
