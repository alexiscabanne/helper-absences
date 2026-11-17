// Convertit l'ancienne base conges.db (SQLite) en fichier SQL d'import pour D1.
// Usage : node scripts/sqlite-to-d1.mjs <conges.db> <sortie.sql>
// Puis   : npx wrangler d1 execute helper-absences --local|--remote --file <sortie.sql>
// L'import échoue (clé primaire) si la base D1 contient déjà ces lignes : il ne s'applique qu'une fois.
import fs from 'fs';
import initSqlJs from 'sql.js';

const [dbFile, outFile] = process.argv.slice(2);
if (!dbFile || !outFile) {
  console.error('Usage : node scripts/sqlite-to-d1.mjs <conges.db> <sortie.sql>');
  process.exit(1);
}

const SQL = await initSqlJs();
const db = new SQL.Database(fs.readFileSync(dbFile));
const rows = sql => db.exec(sql)[0]?.values ?? [];
const lit = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;

const roles = rows('SELECT name, color FROM roles');
const members = rows('SELECT person, role, sort_order FROM members ORDER BY sort_order');
const attendance = rows('SELECT person, date, present, provisional FROM attendance ORDER BY person, date');

// L'ancienne base n'avait pas de clés étrangères : on complète les rôles et membres manquants
const roleNames = new Set(roles.map(r => r[0]));
members.forEach(([, role]) => { if (role && !roleNames.has(role)) { roles.push([role, '#7b7f8e']); roleNames.add(role); } });
const memberNames = new Set(members.map(m => m[0]));
attendance.forEach(([person]) => { if (!memberNames.has(person)) { members.push([person, null, members.length]); memberNames.add(person); } });

const out = [];
roles.forEach(([name, color]) => out.push(`INSERT INTO roles (name, color) VALUES (${lit(name)}, ${lit(color || '#7b7f8e')});`));
members.forEach(([person, role, order]) => out.push(`INSERT INTO members (person, role, sort_order) VALUES (${lit(person)}, ${lit(role)}, ${lit(order)});`));
for (let i = 0; i < attendance.length; i += 200) {
  const values = attendance.slice(i, i + 200).map(([p, d, v, prov]) => `(${lit(p)}, ${lit(d)}, ${lit(v)}, ${prov ? 1 : 0})`);
  out.push(`INSERT INTO attendance (person, date, present, provisional) VALUES\n${values.join(',\n')};`);
}
const present = attendance.reduce((t, a) => t + a[2], 0);
out.push(`INSERT INTO changes (source, actor, action, details) VALUES ('script', 'sqlite-to-d1', 'import', ${lit(JSON.stringify({ rows: attendance.length, present }))});`);

fs.writeFileSync(outFile, out.join('\n') + '\n');
console.log(`${roles.length} rôles, ${members.length} membres, ${attendance.length} présences (${present} jours présents) → ${outFile}`);
