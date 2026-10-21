# CLAUDE.md

## Project Overview

French leave/attendance tracking web app, multi-year. Tracks presence/absence for team members across working days.

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
- `saveDb()`: writes the in-memory sql.js DB to `conges.db` after every mutation; `backupDb(label)` writes a snapshot to `backups/` (gitignored)
- `holidaysOf(year)`: French public holidays computed from Easter (`easterSunday`); `getWorkingDays(start, end)` excludes weekends and holidays
- `GET /api/calendar`: `{ min, max, years, holidays }` derived from `attendance` — the single source for the date range and holidays
- `POST /api/years/add {year}`: inserts every working day of the year (present=1) for all members; 409 if the year already has data
- `POST /api/purge {before}`: backs up, then deletes attendance with `date < before`; rejects future dates
- API endpoints: `GET /api/data`, `GET /api/members`, `GET /api/roles`, `GET /api/calendar`, `POST /api/toggle`, `POST /api/years/add`, `POST /api/purge`, `POST /api/reset`, `POST /api/members/add`, `POST /api/members/role`, `POST /api/members/rename`, `POST /api/members/reorder`, `POST /api/members/delete`, `POST /api/roles/add`, `POST /api/roles/rename`, `POST /api/roles/update`, `POST /api/roles/delete`

**Frontend** (`index.html`):
- `loadData()`: fetches `/api/data`, `/api/members`, `/api/roles` and `/api/calendar`; populates `DATA`, `MEMBERS`, `ROLES_DATA`, `ROLES`, `CALENDAR`, `HOLIDAYS`
- `selectYear(y)` / `setRange(start, end)`: year selector and quick buttons, clamped to the data range
- "📅 Années & historique" dialog (`openDataMgmtDialog`): create a year, purge history before a date
- `toggleDay(name, dateKey)`: POSTs to `/api/toggle`, updates `DATA`, re-renders
- `update()`: recomputes stats from `DATA` filtered by person/date range, renders cards and team table
- `calcStats(personData, start, end)`: counts present/absent/half days, skips weekends and holidays
- `renderCard(name, stats, role)`: builds per-person card with month-by-month day grid; role badge uses dynamic color from `ROLES_DATA`

**Date range:** derived from the data (`MIN/MAX(date)` in `attendance`), nothing is hard-coded.

## Gotchas

- **French public holidays** are computed only in `server.js` (`holidaysOf`) and sent to the frontend via `/api/calendar`.
- **Month grouping** in cards is keyed by `YYYY-MM` so ranges spanning two years don't merge months.
- **`INITIAL_DATA` is commented out** in `server.js` — calling `/api/reset` via the UI will crash the server. To reset, delete `conges.db` and restart.
- **Roles are dynamic** — stored in the `roles` table, not hardcoded. `ROLES_DATA` / `ROLES` are populated at startup from `/api/roles`.

## Common Modifications

- **Add/remove a team member:** Use the "+ Personne" entry in the person dropdown, or POST to `/api/members/add`.
- **Rename a team member:** Double-click their name on their card.
- **Manage roles (add/rename/delete/recolor):** "⚙ Rôles" item in the person dropdown.
- **Reset live data to baseline:** Delete `conges.db` and restart the server (`INITIAL_DATA` is commented out so the UI reset button is broken).
- **Add a year / drop old data:** "📅 Années & historique" in the person dropdown (`/api/years/add`, `/api/purge`).
- **Default port:** `3100` (override with `process.env.PORT`).
