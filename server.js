const express = require('express');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── Initial data (source of truth for seeding / reset) ──
// const INITIAL_DATA = {"Alexis":{"2026-03-16":1,"2026-03-17":0,"2026-03-18":1,"2026-03-19":1,"2026-03-20":1,"2026-03-23":1,"2026-03-24":1,"2026-03-25":0,"2026-03-26":1,"2026-03-27":1,"2026-03-30":1,"2026-03-31":1,"2026-04-01":1,"2026-04-02":1,"2026-04-03":1,"2026-04-07":1,"2026-04-08":0,"2026-04-09":1,"2026-04-10":1,"2026-04-13":1,"2026-04-14":1,"2026-04-15":0,"2026-04-16":1,"2026-04-17":1,"2026-04-20":1,"2026-04-21":1,"2026-04-22":0,"2026-04-23":1,"2026-04-24":1,"2026-04-27":1,"2026-04-28":1,"2026-04-29":0,"2026-04-30":1,"2026-05-04":1,"2026-05-05":1,"2026-05-06":0,"2026-05-07":1,"2026-05-11":1,"2026-05-12":1,"2026-05-13":1,"2026-05-15":0,"2026-05-18":1,"2026-05-19":1,"2026-05-20":0,"2026-05-21":1,"2026-05-22":1,"2026-05-26":0,"2026-05-27":1,"2026-05-28":1,"2026-05-29":1,"2026-06-01":1,"2026-06-02":1,"2026-06-03":0,"2026-06-04":1,"2026-06-05":1,"2026-06-08":1,"2026-06-09":1,"2026-06-10":0,"2026-06-11":1,"2026-06-12":1,"2026-06-15":1,"2026-06-16":1,"2026-06-17":0,"2026-06-18":1,"2026-06-19":1,"2026-06-22":1,"2026-06-23":1,"2026-06-24":0,"2026-06-25":1,"2026-06-26":1,"2026-06-29":1,"2026-06-30":1,"2026-07-01":0,"2026-07-02":1,"2026-07-03":1,"2026-07-06":1,"2026-07-07":1,"2026-07-08":0,"2026-07-09":1,"2026-07-10":1,"2026-07-13":0,"2026-07-15":1,"2026-07-16":1,"2026-07-17":1,"2026-07-20":1,"2026-07-21":1,"2026-07-22":0,"2026-07-23":1,"2026-07-24":1,"2026-07-27":1,"2026-07-28":1,"2026-07-29":0,"2026-07-30":1,"2026-07-31":1,"2026-08-03":1,"2026-08-04":1,"2026-08-05":0,"2026-08-06":1,"2026-08-07":1,"2026-08-10":1,"2026-08-11":1,"2026-08-12":0,"2026-08-13":1,"2026-08-14":1,"2026-08-17":1,"2026-08-18":1,"2026-08-19":0,"2026-08-20":1,"2026-08-21":1,"2026-08-24":1,"2026-08-25":1,"2026-08-26":0,"2026-08-27":1,"2026-08-28":1,"2026-08-31":0,"2026-09-01":0,"2026-09-02":0,"2026-09-03":0,"2026-09-04":0,"2026-09-07":0,"2026-09-08":0,"2026-09-09":0,"2026-09-10":0,"2026-09-11":0,"2026-09-14":0,"2026-09-15":0,"2026-09-16":0,"2026-09-17":0,"2026-09-18":0,"2026-09-21":0,"2026-09-22":0,"2026-09-23":0,"2026-09-24":0,"2026-09-25":0,"2026-09-28":0,"2026-09-29":0,"2026-09-30":0,"2026-10-01":0,"2026-10-02":0,"2026-10-05":1,"2026-10-06":1,"2026-10-07":0,"2026-10-08":1,"2026-10-09":1,"2026-10-12":1,"2026-10-13":1,"2026-10-14":0,"2026-10-15":1,"2026-10-16":1,"2026-10-19":1,"2026-10-20":1,"2026-10-21":0,"2026-10-22":1,"2026-10-23":1,"2026-10-26":1,"2026-10-27":1,"2026-10-28":0,"2026-10-29":1,"2026-10-30":1,"2026-11-02":1,"2026-11-03":1,"2026-11-04":0,"2026-11-05":1,"2026-11-06":1,"2026-11-09":1,"2026-11-10":1,"2026-11-12":1,"2026-11-13":1,"2026-11-16":1,"2026-11-17":1,"2026-11-18":0,"2026-11-19":1,"2026-11-20":1,"2026-11-23":1,"2026-11-24":1,"2026-11-25":0,"2026-11-26":1,"2026-11-27":1,"2026-11-30":1,"2026-12-01":1,"2026-12-02":0,"2026-12-03":1,"2026-12-04":1,"2026-12-07":1,"2026-12-08":1,"2026-12-09":0,"2026-12-10":1,"2026-12-11":1,"2026-12-14":1,"2026-12-15":1,"2026-12-16":0,"2026-12-17":1,"2026-12-18":1,"2026-12-21":1,"2026-12-22":1,"2026-12-23":0,"2026-12-24":1,"2026-12-28":1,"2026-12-29":1,"2026-12-30":0,"2026-12-31":1},"Pierre-Yves":{"2026-03-16":0,"2026-03-17":0,"2026-03-18":0,"2026-03-19":0,"2026-03-20":0,"2026-03-23":0,"2026-03-24":0,"2026-03-25":0,"2026-03-26":0,"2026-03-27":0,"2026-03-30":0,"2026-03-31":0,"2026-04-01":0,"2026-04-02":0,"2026-04-03":0,"2026-04-07":0,"2026-04-08":0,"2026-04-09":0,"2026-04-10":0,"2026-04-13":0,"2026-04-14":0,"2026-04-15":0,"2026-04-16":0,"2026-04-17":0,"2026-04-20":1,"2026-04-21":1,"2026-04-22":1,"2026-04-23":1,"2026-04-24":1,"2026-04-27":1,"2026-04-28":1,"2026-04-29":1,"2026-04-30":1,"2026-05-04":1,"2026-05-05":1,"2026-05-06":1,"2026-05-07":1,"2026-05-11":1,"2026-05-12":1,"2026-05-13":1,"2026-05-15":1,"2026-05-18":1,"2026-05-19":1,"2026-05-20":1,"2026-05-21":1,"2026-05-22":1,"2026-05-26":1,"2026-05-27":1,"2026-05-28":1,"2026-05-29":1,"2026-06-01":1,"2026-06-02":1,"2026-06-03":1,"2026-06-04":1,"2026-06-05":1,"2026-06-08":1,"2026-06-09":1,"2026-06-10":1,"2026-06-11":1,"2026-06-12":1,"2026-06-15":1,"2026-06-16":1,"2026-06-17":1,"2026-06-18":1,"2026-06-19":1,"2026-06-22":1,"2026-06-23":1,"2026-06-24":1,"2026-06-25":1,"2026-06-26":1,"2026-06-29":1,"2026-06-30":1,"2026-07-01":1,"2026-07-02":1,"2026-07-03":1,"2026-07-06":1,"2026-07-07":1,"2026-07-08":1,"2026-07-09":1,"2026-07-10":1,"2026-07-13":1,"2026-07-15":1,"2026-07-16":1,"2026-07-17":1,"2026-07-20":1,"2026-07-21":1,"2026-07-22":1,"2026-07-23":1,"2026-07-24":1,"2026-07-27":1,"2026-07-28":1,"2026-07-29":1,"2026-07-30":1,"2026-07-31":1,"2026-08-03":1,"2026-08-04":1,"2026-08-05":1,"2026-08-06":1,"2026-08-07":1,"2026-08-10":1,"2026-08-11":1,"2026-08-12":1,"2026-08-13":1,"2026-08-14":1,"2026-08-17":1,"2026-08-18":1,"2026-08-19":1,"2026-08-20":1,"2026-08-21":1,"2026-08-24":1,"2026-08-25":1,"2026-08-26":1,"2026-08-27":1,"2026-08-28":1,"2026-08-31":1,"2026-09-01":1,"2026-09-02":1,"2026-09-03":1,"2026-09-04":1,"2026-09-07":1,"2026-09-08":1,"2026-09-09":1,"2026-09-10":1,"2026-09-11":1,"2026-09-14":1,"2026-09-15":1,"2026-09-16":1,"2026-09-17":1,"2026-09-18":1,"2026-09-21":1,"2026-09-22":1,"2026-09-23":1,"2026-09-24":1,"2026-09-25":1,"2026-09-28":1,"2026-09-29":1,"2026-09-30":1,"2026-10-01":1,"2026-10-02":1,"2026-10-05":1,"2026-10-06":1,"2026-10-07":1,"2026-10-08":1,"2026-10-09":1,"2026-10-12":1,"2026-10-13":1,"2026-10-14":1,"2026-10-15":1,"2026-10-16":1,"2026-10-19":1,"2026-10-20":1,"2026-10-21":1,"2026-10-22":1,"2026-10-23":1,"2026-10-26":1,"2026-10-27":1,"2026-10-28":1,"2026-10-29":1,"2026-10-30":1,"2026-11-02":1,"2026-11-03":1,"2026-11-04":1,"2026-11-05":1,"2026-11-06":1,"2026-11-09":1,"2026-11-10":1,"2026-11-12":1,"2026-11-13":1,"2026-11-16":1,"2026-11-17":1,"2026-11-18":1,"2026-11-19":1,"2026-11-20":1,"2026-11-23":1,"2026-11-24":1,"2026-11-25":1,"2026-11-26":1,"2026-11-27":1,"2026-11-30":1,"2026-12-01":1,"2026-12-02":1,"2026-12-03":1,"2026-12-04":1,"2026-12-07":1,"2026-12-08":1,"2026-12-09":1,"2026-12-10":1,"2026-12-11":1,"2026-12-14":1,"2026-12-15":1,"2026-12-16":1,"2026-12-17":1,"2026-12-18":1,"2026-12-21":1,"2026-12-22":1,"2026-12-23":1,"2026-12-24":1,"2026-12-28":1,"2026-12-29":1,"2026-12-30":1,"2026-12-31":1},"Nicolas":{"2026-03-16":1,"2026-03-17":1,"2026-03-18":1,"2026-03-19":1,"2026-03-20":1,"2026-03-23":1,"2026-03-24":1,"2026-03-25":0,"2026-03-26":0,"2026-03-27":0,"2026-03-30":0,"2026-03-31":0,"2026-04-01":1,"2026-04-02":1,"2026-04-03":1,"2026-04-07":0,"2026-04-08":0,"2026-04-09":0,"2026-04-10":0,"2026-04-13":1,"2026-04-14":1,"2026-04-15":1,"2026-04-16":1,"2026-04-17":1,"2026-04-20":1,"2026-04-21":1,"2026-04-22":1,"2026-04-23":1,"2026-04-24":1,"2026-04-27":1,"2026-04-28":1,"2026-04-29":1,"2026-04-30":1,"2026-05-04":1,"2026-05-05":1,"2026-05-06":1,"2026-05-07":1,"2026-05-11":1,"2026-05-12":1,"2026-05-13":1,"2026-05-15":1,"2026-05-18":1,"2026-05-19":1,"2026-05-20":1,"2026-05-21":1,"2026-05-22":1,"2026-05-26":1,"2026-05-27":1,"2026-05-28":1,"2026-05-29":1,"2026-06-01":1,"2026-06-02":1,"2026-06-03":1,"2026-06-04":1,"2026-06-05":1,"2026-06-08":1,"2026-06-09":1,"2026-06-10":1,"2026-06-11":1,"2026-06-12":1,"2026-06-15":1,"2026-06-16":1,"2026-06-17":1,"2026-06-18":1,"2026-06-19":1,"2026-06-22":1,"2026-06-23":1,"2026-06-24":1,"2026-06-25":1,"2026-06-26":1,"2026-06-29":1,"2026-06-30":1,"2026-07-01":1,"2026-07-02":1,"2026-07-03":1,"2026-07-06":1,"2026-07-07":1,"2026-07-08":1,"2026-07-09":1,"2026-07-10":1,"2026-07-13":1,"2026-07-15":1,"2026-07-16":1,"2026-07-17":1,"2026-07-20":1,"2026-07-21":1,"2026-07-22":1,"2026-07-23":1,"2026-07-24":1,"2026-07-27":1,"2026-07-28":1,"2026-07-29":1,"2026-07-30":1,"2026-07-31":1,"2026-08-03":1,"2026-08-04":1,"2026-08-05":1,"2026-08-06":1,"2026-08-07":1,"2026-08-10":1,"2026-08-11":1,"2026-08-12":1,"2026-08-13":1,"2026-08-14":1,"2026-08-17":1,"2026-08-18":1,"2026-08-19":1,"2026-08-20":1,"2026-08-21":1,"2026-08-24":1,"2026-08-25":1,"2026-08-26":1,"2026-08-27":1,"2026-08-28":1,"2026-08-31":1,"2026-09-01":1,"2026-09-02":1,"2026-09-03":1,"2026-09-04":1,"2026-09-07":1,"2026-09-08":1,"2026-09-09":1,"2026-09-10":1,"2026-09-11":1,"2026-09-14":1,"2026-09-15":1,"2026-09-16":1,"2026-09-17":1,"2026-09-18":1,"2026-09-21":1,"2026-09-22":1,"2026-09-23":1,"2026-09-24":1,"2026-09-25":1,"2026-09-28":1,"2026-09-29":1,"2026-09-30":1,"2026-10-01":1,"2026-10-02":1,"2026-10-05":1,"2026-10-06":1,"2026-10-07":1,"2026-10-08":1,"2026-10-09":1,"2026-10-12":1,"2026-10-13":1,"2026-10-14":1,"2026-10-15":1,"2026-10-16":1,"2026-10-19":1,"2026-10-20":1,"2026-10-21":1,"2026-10-22":1,"2026-10-23":1,"2026-10-26":1,"2026-10-27":1,"2026-10-28":1,"2026-10-29":1,"2026-10-30":1,"2026-11-02":1,"2026-11-03":1,"2026-11-04":1,"2026-11-05":1,"2026-11-06":1,"2026-11-09":1,"2026-11-10":1,"2026-11-12":1,"2026-11-13":1,"2026-11-16":1,"2026-11-17":1,"2026-11-18":1,"2026-11-19":1,"2026-11-20":1,"2026-11-23":1,"2026-11-24":1,"2026-11-25":1,"2026-11-26":1,"2026-11-27":1,"2026-11-30":1,"2026-12-01":1,"2026-12-02":1,"2026-12-03":1,"2026-12-04":1,"2026-12-07":1,"2026-12-08":1,"2026-12-09":1,"2026-12-10":1,"2026-12-11":1,"2026-12-14":1,"2026-12-15":1,"2026-12-16":1,"2026-12-17":1,"2026-12-18":1,"2026-12-21":1,"2026-12-22":1,"2026-12-23":1,"2026-12-24":1,"2026-12-28":1,"2026-12-29":1,"2026-12-30":1,"2026-12-31":1}};

const DB_FILE = path.join(__dirname, 'conges.db');

const HOLIDAYS_SERVER = new Set([
  '2026-04-06','2026-05-01','2026-05-08','2026-05-14','2026-05-25',
  '2026-07-14','2026-08-15','2026-11-01','2026-11-11','2026-12-25'
]);

function getWorkingDays() {
  const days = [];
  const d = new Date(Date.UTC(2026, 2, 16));
  const end = new Date(Date.UTC(2026, 11, 31));
  while (d <= end) {
    const key = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6 && !HOLIDAYS_SERVER.has(key)) days.push(key);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

// ── Database helpers ──
let db;

function saveDb() {
  fs.writeFileSync(DB_FILE, Buffer.from(db.export()));
}

function seedDb() {
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      person      TEXT    NOT NULL,
      date        TEXT    NOT NULL,
      present     INTEGER NOT NULL,
      provisional INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (person, date)
    )
  `);
  const stmt = db.prepare('INSERT OR IGNORE INTO attendance (person, date, present) VALUES (?, ?, ?)');
  for (const [person, dates] of Object.entries(INITIAL_DATA)) {
    for (const [date, present] of Object.entries(dates)) {
      stmt.run([person, date, present]);
    }
  }
  stmt.free();

  db.run(`
    CREATE TABLE IF NOT EXISTS members (
      person     TEXT PRIMARY KEY,
      role       TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);
  const insM = db.prepare('INSERT OR IGNORE INTO members (person, role, sort_order) VALUES (?, ?, ?)');
  [['Alexis','DEV',0],['Nicolas','AMOA',1],['Pierre-Yves','CP',2]].forEach(([p,r,o]) => insM.run([p,r,o]));
  insM.free();

  db.run(`CREATE TABLE IF NOT EXISTS roles (name TEXT PRIMARY KEY, color TEXT)`);
  const insR = db.prepare('INSERT OR IGNORE INTO roles (name, color) VALUES (?, ?)');
  [['AMOA','#a26aff'],['DEV','#6c8cff'],['CP','#f0b946']].forEach(([n,c]) => insR.run([n,c]));
  insR.free();

  saveDb();
  console.log('Base de données initialisée depuis les données de départ.');
}

function buildDataObject() {
  const data = {}, provisional = {};
  const stmt = db.prepare('SELECT person, date, present, provisional FROM attendance ORDER BY person, date');
  while (stmt.step()) {
    const [person, date, present, prov] = stmt.get();
    if (!data[person]) { data[person] = {}; provisional[person] = {}; }
    data[person][date] = present;
    if (prov) provisional[person][date] = 1;
  }
  stmt.free();
  return { data, provisional };
}

// ── Boot: load or create DB ──
initSqlJs().then(SQL => {
  if (fs.existsSync(DB_FILE)) {
    db = new SQL.Database(fs.readFileSync(DB_FILE));
    console.log('Base de données chargée depuis', DB_FILE);
  } else {
    db = new SQL.Database();
    seedDb();
  }

  // Migration: add provisional column if missing
  try { db.run('ALTER TABLE attendance ADD COLUMN provisional INTEGER NOT NULL DEFAULT 0'); saveDb(); } catch(e) { /* already exists */ }

  // Migration: create members table if missing, populate from attendance if empty
  db.run(`CREATE TABLE IF NOT EXISTS members (
    person     TEXT PRIMARY KEY,
    role       TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`);
  const membersCount = db.exec('SELECT COUNT(*) FROM members')[0]?.values[0][0] ?? 0;
  if (membersCount === 0) {
    const persons = db.exec('SELECT DISTINCT person FROM attendance ORDER BY person')[0]?.values.map(r => r[0]) ?? [];
    const ins = db.prepare('INSERT OR IGNORE INTO members (person, role, sort_order) VALUES (?, ?, ?)');
    persons.forEach((p, i) => ins.run([p, null, i]));
    ins.free();
    saveDb();
    console.log('Table members créée et peuplée depuis attendance.');
  }

  // Migration: create roles table if missing
  db.run(`CREATE TABLE IF NOT EXISTS roles (name TEXT PRIMARY KEY, color TEXT)`);
  const rolesCount = db.exec('SELECT COUNT(*) FROM roles')[0]?.values[0][0] ?? 0;
  if (rolesCount === 0) {
    const insR = db.prepare('INSERT OR IGNORE INTO roles (name, color) VALUES (?, ?)');
    [['AMOA','#a26aff'],['DEV','#6c8cff'],['CP','#f0b946']].forEach(([n,c]) => insR.run([n,c]));
    insR.free();
    saveDb();
    console.log('Table roles créée et peuplée.');
  }

  // ── API routes ──
  app.get('/api/data', (req, res) => {
    res.json(buildDataObject());
  });

  app.post('/api/toggle-provisional', (req, res) => {
    const { person, date } = req.body;
    if (!person || !date) return res.status(400).json({ error: 'person and date required' });

    const stmt = db.prepare('SELECT present, provisional FROM attendance WHERE person = ? AND date = ?');
    stmt.bind([person, date]);
    if (!stmt.step()) { stmt.free(); return res.status(404).json({ error: 'not found' }); }
    const [present, prov] = stmt.get();
    stmt.free();

    if (present === 1) return res.json({ person, date, provisional: 0 });

    const newProv = prov ? 0 : 1;
    db.run('UPDATE attendance SET provisional = ? WHERE person = ? AND date = ?', [newProv, person, date]);
    saveDb();
    res.json({ person, date, provisional: newProv });
  });

  app.post('/api/toggle', (req, res) => {
    const { person, date } = req.body;
    if (!person || !date) return res.status(400).json({ error: 'person and date required' });

    const stmt = db.prepare('SELECT present FROM attendance WHERE person = ? AND date = ?');
    stmt.bind([person, date]);
    if (!stmt.step()) { stmt.free(); return res.status(404).json({ error: 'not found' }); }
    const [current] = stmt.get();
    stmt.free();

    const newVal = current === 1 ? 0 : current === 0 ? 0.5 : 1;
    db.run('UPDATE attendance SET present = ?, provisional = 0 WHERE person = ? AND date = ?', [newVal, person, date]);
    saveDb();
    res.json({ person, date, present: newVal });
  });

  app.get('/api/members', (req, res) => {
    const stmt = db.prepare('SELECT person, role, sort_order FROM members ORDER BY sort_order');
    const result = [];
    while (stmt.step()) {
      const [person, role, sort_order] = stmt.get();
      result.push({ person, role, sort_order });
    }
    stmt.free();
    res.json(result);
  });

  app.post('/api/members/add', (req, res) => {
    const { person, role } = req.body;
    if (!person || !person.trim()) return res.status(400).json({ error: 'person required' });
    const name = person.trim();
    const check = db.prepare('SELECT 1 FROM members WHERE person = ?');
    check.bind([name]);
    const exists = check.step();
    check.free();
    if (exists) return res.status(409).json({ error: 'already exists' });
    const maxRow = db.exec('SELECT MAX(sort_order) FROM members')[0]?.values[0][0];
    const nextOrder = maxRow != null ? maxRow + 1 : 0;
    db.run('INSERT INTO members (person, role, sort_order) VALUES (?, ?, ?)', [name, role || null, nextOrder]);
    const days = getWorkingDays();
    const ins = db.prepare('INSERT OR IGNORE INTO attendance (person, date, present) VALUES (?, ?, 1)');
    days.forEach(d => ins.run([name, d]));
    ins.free();
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/members/role', (req, res) => {
    const { person, role } = req.body;
    if (!person) return res.status(400).json({ error: 'person required' });
    db.run('UPDATE members SET role = ? WHERE person = ?', [role || null, person]);
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/members/rename', (req, res) => {
    const { oldName, newName } = req.body;
    if (!oldName || !newName || !newName.trim()) return res.status(400).json({ error: 'oldName and newName required' });
    const name = newName.trim();
    if (name === oldName) return res.json({ ok: true });
    const checkOld = db.prepare('SELECT 1 FROM members WHERE person = ?');
    checkOld.bind([oldName]);
    const oldExists = checkOld.step();
    checkOld.free();
    if (!oldExists) return res.status(404).json({ error: 'person not found' });
    const checkNew = db.prepare('SELECT 1 FROM members WHERE person = ?');
    checkNew.bind([name]);
    const newExists = checkNew.step();
    checkNew.free();
    if (newExists) return res.status(409).json({ error: 'already exists' });
    db.run('UPDATE members SET person = ? WHERE person = ?', [name, oldName]);
    db.run('UPDATE attendance SET person = ? WHERE person = ?', [name, oldName]);
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/members/reorder', (req, res) => {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be array' });
    const stmt = db.prepare('UPDATE members SET sort_order = ? WHERE person = ?');
    order.forEach((name, i) => stmt.run([i, name]));
    stmt.free();
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/members/delete', (req, res) => {
    const { person } = req.body;
    if (!person) return res.status(400).json({ error: 'person required' });
    db.run('DELETE FROM attendance WHERE person = ?', [person]);
    db.run('DELETE FROM members WHERE person = ?', [person]);
    saveDb();
    res.json({ ok: true });
  });

  // ── Roles CRUD ──
  app.get('/api/roles', (req, res) => {
    const stmt = db.prepare('SELECT name, color FROM roles ORDER BY name');
    const result = [];
    while (stmt.step()) {
      const [name, color] = stmt.get();
      result.push({ name, color });
    }
    stmt.free();
    res.json(result);
  });

  app.post('/api/roles/add', (req, res) => {
    const { name, color } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
    const n = name.trim().toUpperCase();
    const check = db.prepare('SELECT 1 FROM roles WHERE name = ?');
    check.bind([n]);
    const exists = check.step();
    check.free();
    if (exists) return res.status(409).json({ error: 'already exists' });
    db.run('INSERT INTO roles (name, color) VALUES (?, ?)', [n, color || '#7b7f8e']);
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/roles/rename', (req, res) => {
    const { oldName, newName } = req.body;
    if (!oldName || !newName || !newName.trim()) return res.status(400).json({ error: 'oldName and newName required' });
    const n = newName.trim().toUpperCase();
    if (n === oldName) return res.json({ ok: true });
    const checkNew = db.prepare('SELECT 1 FROM roles WHERE name = ?');
    checkNew.bind([n]);
    const exists = checkNew.step();
    checkNew.free();
    if (exists) return res.status(409).json({ error: 'already exists' });
    db.run('UPDATE roles SET name = ? WHERE name = ?', [n, oldName]);
    db.run('UPDATE members SET role = ? WHERE role = ?', [n, oldName]);
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/roles/update', (req, res) => {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    db.run('UPDATE roles SET color = ? WHERE name = ?', [color || '#7b7f8e', name]);
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/roles/delete', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const countStmt = db.prepare('SELECT COUNT(*) FROM members WHERE role = ?');
    countStmt.bind([name]);
    countStmt.step();
    const count = countStmt.get()[0];
    countStmt.free();
    db.run('UPDATE members SET role = NULL WHERE role = ?', [name]);
    db.run('DELETE FROM roles WHERE name = ?', [name]);
    saveDb();
    res.json({ ok: true, unassigned: count });
  });

  app.post('/api/reset', (req, res) => {
    db.run('DELETE FROM attendance');
    const stmt = db.prepare('INSERT INTO attendance (person, date, present) VALUES (?, ?, ?)');
    for (const [person, dates] of Object.entries(INITIAL_DATA)) {
      for (const [date, present] of Object.entries(dates)) {
        stmt.run([person, date, present]);
      }
    }
    stmt.free();
    db.run('DELETE FROM roles');
    const insR = db.prepare('INSERT INTO roles (name, color) VALUES (?, ?)');
    [['AMOA','#a26aff'],['DEV','#6c8cff'],['CP','#f0b946']].forEach(([n,c]) => insR.run([n,c]));
    insR.free();
    saveDb();
    res.json({ ok: true });
  });

  const PORT = process.env.PORT || 3100;
  app.listen(PORT, () => {
    console.log(`Suivi Congés démarré sur http://localhost:${PORT}`);
  });
});
