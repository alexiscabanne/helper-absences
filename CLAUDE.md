# CLAUDE.md

## Project Overview

French leave/attendance tracking web app (multi-year) with an MCP server so agents can read and update attendance for planning. Runs entirely on Cloudflare (Worker + D1).

## Stack

- **Frontend**: `public/index.html` + `public/styles.css` (no build step, no framework), served as Worker static assets
- **Backend**: Cloudflare Worker (`src/`, plain JS ES modules, bundled by wrangler) + D1 (binding `DB`)
- **MCP**: `@modelcontextprotocol/sdk`, stateless Streamable HTTP on `/mcp`
- **Dev**: `npm run dev` (app, port 8787) and `npm run dev:mcp` (MCP, port 8788); both share the local D1 in `.wrangler/state` (keyed by `database_id`)
- **Deploy**: `npm run deploy` (both Workers); schema with `npm run db:migrate:local|remote`

## Architecture

**Workers** (`src/worker.js`, one code base, `WORKER_ROLE` var):
- `helper-absences` (`wrangler.jsonc`, role `app`): static assets + `/api/*` → Cloudflare Access JWT (`verifyAccess`, returns the user email) → `handleApi`.
- `helper-absences-mcp` (`wrangler.mcp.jsonc`, role `mcp`): only `/mcp` → bearer token (`verifyMcpToken`) → `handleMcp`. Separate Worker because Access on `*.workers.dev` cannot exclude a path.

**Data access** (`src/db.js`): every query lives here and is shared by the API and MCP. Lists of dates are passed as one JSON parameter and expanded with `json_each()`, so bulk operations stay a single statement (D1 free plan caps queries per invocation). Multi-statement operations use `db.batch()` (transactional): `addYear`, `purgeBefore`, `addMember`, `deleteRole`. `UNIQUE constraint failed` maps to `HttpError(409)`.

**API** (`src/api.js`): same routes/contract as the former Express server: `GET /api/data|members|roles|calendar|periods`, `POST /api/toggle`, `/api/toggle-provisional`, `/api/members/{add,role,update,reorder,delete}` (`update` = name + role in one statement), `/api/roles/{add,rename,update,delete}`, `/api/periods/{add,update,delete}`, `/api/years/add`, `/api/purge`. Mutations are logged to `changes` (source `web`, actor = Access email).

**MCP** (`src/mcp.js`): tools `get_calendar`, `list_members`, `list_holidays`, `get_attendance`, `get_stats`, `team_availability`, `find_common_availability`, `list_recent_changes`, `list_periods` (read-only) and `set_attendance`, `save_period`, `delete_period` (write, logged with source `mcp`). `team_availability` adds `periods` per day; `find_common_availability` takes `avoid_periods`. Period validation (`normalizePeriod` in `db.js`) is shared by API and MCP. A new server+transport is created per request. Uses `CfWorkerJsonSchemaValidator` (Ajv does not run in Workers).

**Schema** (`migrations/0001_init.sql`): `roles`, `members`, `attendance` (present ∈ {0, 0.5, 1}, `provisional` 0/1), `attendance_archive`, `changes` (details stored as JSON text). `migrations/0002_periods.sql`: `periods` (name, `start_date`/`end_date` inclusive, color, description; exposed as `start`/`end`), and converts the former fake member "PFA" into a period. Periods are team-wide markers (e.g. PFA = no delivery), not attendance; they are not touched by the purge. Renames/deletes rely on FKs (D1 enforces them): `attendance.person` ON UPDATE/DELETE CASCADE, `members.role` ON UPDATE CASCADE / ON DELETE SET NULL.

**Calendar** (`src/calendar.js`): French holidays computed from Easter (`holidaysOf`), `getWorkingDays(start, end)`, `parisToday()`. Holidays exist only here; the frontend gets them from `/api/calendar`.

**Frontend** (`public/index.html`): `loadData()` fetches data, members, roles and calendar; `selectYear` / `setRange` drive the year selector and quick buttons; "📅 Années & historique" dialog creates a year or purges history. "🚩 Périodes" dialog manages periods (chips above the cards, underline on calendar days). Person edit dialog (`openEditMember`) handles name, role and deletion. Month grouping is keyed by `YYYY-MM`.

## Configuration

- `wrangler.jsonc`: D1 binding (`database_id`), vars `WORKER_ROLE=app`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` (API returns 503 while empty).
- `wrangler.mcp.jsonc`: same D1 binding, `WORKER_ROLE=mcp`; secret `MCP_TOKEN` (set with `-c wrangler.mcp.jsonc`).
- Keep the D1 binding identical in both configs.
- `.dev.vars` (gitignored) for local dev; `DEV_SKIP_ACCESS=1` only works on localhost.

## Gotchas

- `scripts/sqlite-to-d1.mjs` converts the legacy `conges.db` to an SQL import file (one-time; fails on duplicate keys if rerun).
- Stopping `wrangler dev` from a background shell can leave `workerd.exe` running and locking `.wrangler/state` on Windows.
- Adding a holiday rule: change `holidaysOf` only.
