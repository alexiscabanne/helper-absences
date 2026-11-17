import { holidaysOf, DATE_RE } from './calendar.js';

// ── Data access on Cloudflare D1 (binding env.DB) ──
// Lists of dates are passed as a single JSON parameter and expanded with json_each(),
// so each operation stays one statement whatever the number of days.

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Runs a D1 call, mapping unique-constraint violations to 409
async function q(promise) {
  try {
    return await promise;
  } catch (e) {
    if (/UNIQUE constraint failed/.test(e.message)) throw new HttpError(409, 'already exists');
    throw e;
  }
}

// { data: {person: {date: present}}, provisional: {person: {date: 1}} }
export async function getData(db) {
  const { results } = await db.prepare('SELECT person, date, present, provisional FROM attendance ORDER BY person, date').all();
  const data = {}, provisional = {};
  for (const { person, date, present, provisional: prov } of results) {
    if (!data[person]) { data[person] = {}; provisional[person] = {}; }
    data[person][date] = present;
    if (prov) provisional[person][date] = 1;
  }
  return { data, provisional };
}

export async function calendarInfo(db) {
  const [range, years] = await db.batch([
    db.prepare('SELECT MIN(date) AS min, MAX(date) AS max FROM attendance'),
    db.prepare('SELECT DISTINCT CAST(substr(date, 1, 4) AS INTEGER) AS y FROM attendance ORDER BY y'),
  ]);
  return { ...range.results[0], years: years.results.map(r => r.y) };
}

export async function getCalendar(db) {
  const info = await calendarInfo(db);
  const holidays = {};
  info.years.forEach(y => holidaysOf(y).forEach((name, date) => { holidays[date] = name; }));
  return { ...info, holidays };
}

export async function getMembers(db) {
  return (await db.prepare('SELECT person, role, sort_order FROM members ORDER BY sort_order').all()).results;
}

export async function getRoles(db) {
  return (await db.prepare('SELECT name, color FROM roles ORDER BY name').all()).results;
}

// Présent → Absent → Demi-journée → Présent ; null if the day does not exist
export async function toggleAttendance(db, person, date) {
  const row = await db.prepare(`UPDATE attendance
       SET present = CASE present WHEN 1 THEN 0 WHEN 0 THEN 0.5 ELSE 1 END, provisional = 0
     WHERE person = ?1 AND date = ?2 RETURNING present`).bind(person, date).first();
  return row ? row.present : null;
}

// Provisional only applies to a non-present day ; null if the day does not exist
export async function toggleProvisional(db, person, date) {
  const row = await db.prepare(`UPDATE attendance
       SET provisional = CASE WHEN present = 1 THEN 0 ELSE 1 - provisional END
     WHERE person = ?1 AND date = ?2 RETURNING provisional`).bind(person, date).first();
  return row ? !!row.provisional : null;
}

// New member, present on the given days
export async function addMember(db, person, role, days) {
  await q(db.batch([
    db.prepare(`INSERT INTO members (person, role, sort_order)
                VALUES (?1, ?2, (SELECT COALESCE(MAX(sort_order) + 1, 0) FROM members))`).bind(person, role),
    db.prepare(`INSERT OR IGNORE INTO attendance (person, date, present)
                SELECT ?1, value, 1 FROM json_each(?2)`).bind(person, JSON.stringify(days)),
  ]));
}

export async function setMemberRole(db, person, role) {
  await db.prepare('UPDATE members SET role = ?1 WHERE person = ?2').bind(role, person).run();
}

// Name and role in one statement; attendance follows through ON UPDATE CASCADE.
// Returns false if `person` does not exist.
export async function updateMember(db, person, newName, role) {
  const { meta } = await q(db.prepare('UPDATE members SET person = ?1, role = ?2 WHERE person = ?3')
    .bind(newName, role, person).run());
  return meta.changes > 0;
}

export async function reorderMembers(db, order) {
  await db.prepare(`UPDATE members
       SET sort_order = (SELECT CAST(key AS INTEGER) FROM json_each(?1) WHERE value = members.person)
     WHERE person IN (SELECT value FROM json_each(?1))`).bind(JSON.stringify(order)).run();
}

// attendance is removed through ON DELETE CASCADE
export async function deleteMember(db, person) {
  await db.prepare('DELETE FROM members WHERE person = ?1').bind(person).run();
}

export async function addRole(db, name, color) {
  await q(db.prepare('INSERT INTO roles (name, color) VALUES (?1, ?2)').bind(name, color).run());
}

// members.role follows through ON UPDATE CASCADE
export async function renameRole(db, oldName, newName) {
  await q(db.prepare('UPDATE roles SET name = ?1 WHERE name = ?2').bind(newName, oldName).run());
}

export async function setRoleColor(db, name, color) {
  await db.prepare('UPDATE roles SET color = ?1 WHERE name = ?2').bind(color, name).run();
}

// members.role becomes NULL through ON DELETE SET NULL ; returns how many members had the role
export async function deleteRole(db, name) {
  const [count] = await db.batch([
    db.prepare('SELECT COUNT(*) AS n FROM members WHERE role = ?1').bind(name),
    db.prepare('DELETE FROM roles WHERE name = ?1').bind(name),
  ]);
  return count.results[0].n;
}

// Creates the given working days of a year for every member.
// Returns the number of members, or null if the year already has data.
export async function addYear(db, year, days) {
  const [members, insert] = await db.batch([
    db.prepare('SELECT COUNT(*) AS n FROM members'),
    db.prepare(`INSERT INTO attendance (person, date, present)
                SELECT m.person, j.value, 1 FROM members m, json_each(?1) j
                 WHERE NOT EXISTS (SELECT 1 FROM attendance WHERE date BETWEEN ?2 AND ?3)`)
      .bind(JSON.stringify(days), `${year}-01-01`, `${year}-12-31`),
  ]);
  const n = members.results[0].n;
  if (n > 0 && insert.meta.changes === 0) return null;
  return n;
}

// Archives then deletes every row strictly before `before` (one transaction) ; returns the row count
export async function purgeBefore(db, before) {
  const [, del] = await db.batch([
    db.prepare(`INSERT INTO attendance_archive (person, date, present, provisional)
                SELECT person, date, present, provisional FROM attendance WHERE date < ?1`).bind(before),
    db.prepare('DELETE FROM attendance WHERE date < ?1').bind(before),
  ]);
  return del.meta.changes;
}

// Sets a status on existing working days ; returns { updated, skipped } date lists
export async function setAttendance(db, person, dates, present, provisional) {
  const { results } = await db.prepare(`UPDATE attendance SET present = ?1, provisional = ?2
     WHERE person = ?3 AND date IN (SELECT value FROM json_each(?4)) RETURNING date`)
    .bind(present, provisional && present < 1 ? 1 : 0, person, JSON.stringify(dates)).all();
  const updated = results.map(r => r.date).sort();
  const done = new Set(updated);
  return { updated, skipped: [...new Set(dates)].filter(d => !done.has(d)).sort() };
}

// ── Periods (e.g. PFA: no delivery) ──
const PERIOD_COLS = 'id, name, start_date AS start, end_date AS end, color, description';
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

// Validates and trims a period coming from the API or MCP; throws HttpError(400)
export function normalizePeriod({ name, start, end, color, description } = {}) {
  name = String(name ?? '').trim();
  if (!name) throw new HttpError(400, 'Nom de période requis.');
  if (!DATE_RE.test(start || '') || !DATE_RE.test(end || '')) throw new HttpError(400, 'Dates invalides (YYYY-MM-DD).');
  if (start > end) throw new HttpError(400, 'La date de début doit précéder la date de fin.');
  return {
    name: name.slice(0, 60),
    start, end,
    color: COLOR_RE.test(color || '') ? color : '#e5534b',
    description: String(description ?? '').trim().slice(0, 500),
  };
}

// Periods overlapping [start, end] (all if omitted), by start date
export async function getPeriods(db, start = '0000-01-01', end = '9999-12-31') {
  return (await db.prepare(`SELECT ${PERIOD_COLS} FROM periods
     WHERE end_date >= ?1 AND start_date <= ?2 ORDER BY start_date, name`).bind(start, end).all()).results;
}

export async function addPeriod(db, { name, start, end, color, description }) {
  return db.prepare(`INSERT INTO periods (name, start_date, end_date, color, description)
     VALUES (?1, ?2, ?3, ?4, ?5) RETURNING ${PERIOD_COLS}`).bind(name, start, end, color, description).first();
}

// null if the id does not exist
export async function updatePeriod(db, id, { name, start, end, color, description }) {
  return db.prepare(`UPDATE periods SET name = ?1, start_date = ?2, end_date = ?3, color = ?4, description = ?5
     WHERE id = ?6 RETURNING ${PERIOD_COLS}`).bind(name, start, end, color, description, id).first();
}

// null if the id does not exist
export async function deletePeriod(db, id) {
  return db.prepare(`DELETE FROM periods WHERE id = ?1 RETURNING ${PERIOD_COLS}`).bind(id).first();
}

// Appends to the changes journal; never fails the caller
export async function logChange(db, source, actor, action, details) {
  try {
    await db.prepare('INSERT INTO changes (source, actor, action, details) VALUES (?1, ?2, ?3, ?4)')
      .bind(source, actor, action, JSON.stringify(details)).run();
  } catch (e) {
    console.error('changes log failed', e.message);
  }
}

export async function listChanges(db, limit) {
  const { results } = await db.prepare('SELECT at, source, actor, action, details FROM changes ORDER BY id DESC LIMIT ?1').bind(limit).all();
  return results.map(r => ({ ...r, details: JSON.parse(r.details) }));
}
