-- Suivi des congés : schéma initial (Cloudflare D1 / SQLite)
-- D1 applique les clés étrangères : renommer ou supprimer une personne ou un rôle se répercute en cascade.

CREATE TABLE roles (
  name  TEXT PRIMARY KEY,
  color TEXT NOT NULL DEFAULT '#7b7f8e'
);

CREATE TABLE members (
  person     TEXT PRIMARY KEY,
  role       TEXT REFERENCES roles(name) ON UPDATE CASCADE ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE attendance (
  person      TEXT    NOT NULL REFERENCES members(person) ON UPDATE CASCADE ON DELETE CASCADE,
  date        TEXT    NOT NULL,
  present     REAL    NOT NULL CHECK (present IN (0, 0.5, 1)),
  provisional INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (person, date)
);
CREATE INDEX attendance_date_idx ON attendance (date);

-- Lignes retirées par une purge
CREATE TABLE attendance_archive (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  person      TEXT    NOT NULL,
  date        TEXT    NOT NULL,
  present     REAL    NOT NULL,
  provisional INTEGER NOT NULL,
  archived_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Journal des modifications (web, mcp, script)
CREATE TABLE changes (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  source  TEXT NOT NULL CHECK (source IN ('web', 'mcp', 'script')),
  actor   TEXT,
  action  TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX changes_at_idx ON changes (at);
