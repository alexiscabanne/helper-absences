import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/cfworker';
import { z } from 'zod';
import { holidaysOf, getWorkingDays, parisToday, DATE_RE } from './calendar.js';
import { getData, calendarInfo, getMembers, getRoles, setAttendance, logChange, listChanges } from './db.js';

const INSTRUCTIONS = `Suivi des présences et congés d'une équipe (jours ouvrés français).
- Les données ne couvrent que les jours ouvrés : ni week-ends ni jours fériés.
- Statuts d'un jour : "present" (1), "half" (demi-journée, 0.5), "absent" (0).
- "provisional" marque une absence pas encore confirmée (jamais sur un jour présent).
- Taux de présence = jours présents / jours ouvrés, une demi-journée comptant 0,5.
- Dates au format YYYY-MM-DD. Aujourd'hui (Paris) : utiliser get_calendar pour la plage disponible.
- Avant de modifier une présence avec set_attendance, vérifier l'état actuel avec get_attendance.`;

const STATUS = { 1: 'present', 0.5: 'half', 0: 'absent' };
const STATUS_VALUE = { present: 1, half: 0.5, absent: 0 };

const date = z.string().regex(DATE_RE, 'format YYYY-MM-DD');
const rangeShape = {
  start: date.describe('Première date incluse (YYYY-MM-DD)'),
  end: date.describe('Dernière date incluse (YYYY-MM-DD)'),
};
const personsFilter = z.array(z.string()).optional().describe('Noms exacts des personnes (toutes si absent)');
const rolesFilter = z.array(z.string()).optional().describe('Rôles à inclure, ex. ["DEV"] (tous si absent)');

const text = value => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] });
const fail = message => ({ isError: true, content: [{ type: 'text', text: message }] });

class ToolError extends Error {}

async function loadAll(db) {
  const [data, members] = await Promise.all([getData(db), getMembers(db)]);
  return { ...data, members };
}

function checkRange(start, end, maxDays) {
  if (start > end) throw new ToolError('start doit être antérieure ou égale à end.');
  const days = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
  if (maxDays && days > maxDays) throw new ToolError(`Période trop longue (${days} jours, maximum ${maxDays}).`);
}

// Members matching the persons/roles filters, in display order
function selectMembers(members, persons, roles) {
  if (persons?.length) {
    const known = new Set(members.map(m => m.person));
    const unknown = persons.filter(p => !known.has(p));
    if (unknown.length) {
      throw new ToolError(`Personne(s) inconnue(s) : ${unknown.join(', ')}. Membres : ${members.map(m => m.person).join(', ')}.`);
    }
  }
  return members.filter(m => (!persons?.length || persons.includes(m.person)) && (!roles?.length || roles.includes(m.role)));
}

// Days with data for a person within [start, end], sorted
function daysIn(personData = {}, start, end) {
  return Object.keys(personData).filter(d => d >= start && d <= end).sort();
}

function stats(personData, start, end) {
  let present = 0, absent = 0, half = 0;
  for (const d of daysIn(personData, start, end)) {
    const v = personData[d];
    if (v === 1) present += 1;
    else if (v === 0.5) { present += 0.5; absent += 0.5; half += 1; }
    else absent += 1;
  }
  const working_days = present + absent;
  return { present, half_days: half, absent, working_days, rate: working_days ? Math.round(present / working_days * 100) : null };
}

function createServer(env, ctx) {
  const db = env.DB;
  const server = new McpServer(
    { name: 'helper-absences', version: '1.0.0' },
    { instructions: INSTRUCTIONS, jsonSchemaValidator: new CfWorkerJsonSchemaValidator() },
  );
  const tool = (name, config, handler) => server.registerTool(name, config, async args => {
    try { return text(await handler(args)); }
    catch (e) { return e instanceof ToolError ? fail(e.message) : fail(`Erreur serveur : ${e.message}`); }
  });
  const readOnly = { readOnlyHint: true, openWorldHint: false };

  tool('get_calendar', {
    title: 'Plage de données',
    description: 'Date du jour (Paris), première et dernière date disponibles, et années couvertes.',
    annotations: readOnly,
  }, async () => ({ today: parisToday(), ...await calendarInfo(db) }));

  tool('list_members', {
    title: 'Équipe',
    description: 'Liste les membres de l\'équipe avec leur rôle, et les rôles existants.',
    annotations: readOnly,
  }, async () => {
    const [members, roles] = await Promise.all([getMembers(db), getRoles(db)]);
    return { members: members.map(({ person, role }) => ({ person, role })), roles: roles.map(r => r.name) };
  });

  tool('list_holidays', {
    title: 'Jours fériés',
    description: 'Jours fériés français d\'une année.',
    inputSchema: { year: z.number().int().min(2000).max(2100) },
    annotations: readOnly,
  }, async ({ year }) => [...holidaysOf(year)].map(([d, name]) => ({ date: d, name })).sort((a, b) => a.date.localeCompare(b.date)));

  tool('get_attendance', {
    title: 'Présences par personne',
    description: 'Pour chaque personne et sur une période : jours d\'absence, demi-journées et absences provisoires. Les jours ouvrés non listés sont des jours de présence.',
    inputSchema: { ...rangeShape, persons: personsFilter, roles: rolesFilter },
    annotations: readOnly,
  }, async ({ start, end, persons, roles }) => {
    checkRange(start, end, 400);
    const all = await loadAll(db);
    return selectMembers(all.members, persons, roles).map(({ person, role }) => {
      const pd = all.data[person] || {};
      const days = daysIn(pd, start, end);
      return {
        person, role,
        working_days: days.length,
        absent: days.filter(d => pd[d] === 0),
        half: days.filter(d => pd[d] === 0.5),
        provisional: days.filter(d => all.provisional[person]?.[d]),
      };
    });
  });

  tool('get_stats', {
    title: 'Statistiques de présence',
    description: 'Jours présents, demi-journées, absences et taux de présence par personne sur une période, avec le total de l\'équipe.',
    inputSchema: { ...rangeShape, persons: personsFilter, roles: rolesFilter },
    annotations: readOnly,
  }, async ({ start, end, persons, roles }) => {
    checkRange(start, end);
    const all = await loadAll(db);
    const rows = selectMembers(all.members, persons, roles).map(({ person, role }) => ({ person, role, ...stats(all.data[person], start, end) }));
    const total = rows.reduce((t, r) => ({ present: t.present + r.present, absent: t.absent + r.absent, working_days: t.working_days + r.working_days }), { present: 0, absent: 0, working_days: 0 });
    return { start, end, members: rows, team: { ...total, rate: total.working_days ? Math.round(total.present / total.working_days * 100) : null } };
  });

  tool('team_availability', {
    title: 'Disponibilité de l\'équipe par jour',
    description: 'Pour chaque jour ouvré d\'une période (93 jours max) : qui est présent, en demi-journée ou absent, et le taux de présence du jour.',
    inputSchema: { ...rangeShape, persons: personsFilter, roles: rolesFilter },
    annotations: readOnly,
  }, async ({ start, end, persons, roles }) => {
    checkRange(start, end, 93);
    const all = await loadAll(db);
    const people = selectMembers(all.members, persons, roles).map(m => m.person);
    const dates = [...new Set(people.flatMap(p => daysIn(all.data[p], start, end)))].sort();
    return dates.map(d => {
      const day = { date: d, present: [], half: [], absent: [] };
      people.forEach(p => {
        const v = all.data[p]?.[d];
        if (v !== undefined) day[STATUS[v]].push(all.provisional[p]?.[d] ? `${p} (provisoire)` : p);
      });
      const n = day.present.length + day.half.length + day.absent.length;
      day.rate = n ? Math.round((day.present.length + day.half.length / 2) / n * 100) : null;
      return day;
    });
  });

  tool('find_common_availability', {
    title: 'Jours communs de disponibilité',
    description: 'Jours ouvrés d\'une période où toutes les personnes données sont présentes (utile pour planifier une réunion ou une mise en production).',
    inputSchema: {
      ...rangeShape,
      persons: z.array(z.string()).min(1).describe('Noms exacts des personnes qui doivent être présentes'),
      allow_half: z.boolean().optional().describe('Accepter les demi-journées (false par défaut)'),
    },
    annotations: readOnly,
  }, async ({ start, end, persons, allow_half }) => {
    checkRange(start, end, 400);
    const all = await loadAll(db);
    selectMembers(all.members, persons);
    const ok = v => v === 1 || (allow_half && v === 0.5);
    const dates = getWorkingDays(start, end).filter(d => persons.every(p => ok(all.data[p]?.[d])));
    return { persons, allow_half: !!allow_half, count: dates.length, dates };
  });

  tool('list_recent_changes', {
    title: 'Dernières modifications',
    description: 'Journal des dernières modifications (application web, agents MCP, scripts).',
    inputSchema: { limit: z.number().int().min(1).max(100).optional().describe('20 par défaut') },
    annotations: readOnly,
  }, async ({ limit }) => listChanges(db, limit || 20));

  tool('set_attendance', {
    title: 'Modifier des présences',
    description: 'Fixe le statut d\'une personne sur des dates précises ou sur tous les jours ouvrés d\'une période. Les dates sans données (week-ends, fériés, hors plage) sont ignorées et renvoyées dans "skipped".',
    inputSchema: {
      person: z.string().describe('Nom exact de la personne'),
      status: z.enum(['present', 'half', 'absent']),
      dates: z.array(date).max(366).optional().describe('Dates précises (sinon utiliser start/end)'),
      start: date.optional().describe('Début de période incluse'),
      end: date.optional().describe('Fin de période incluse'),
      provisional: z.boolean().optional().describe('Absence provisoire, à confirmer (ignoré si status = present)'),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  }, async ({ person, status, dates, start, end, provisional }) => {
    let target = dates;
    if (!target?.length) {
      if (!start || !end) throw new ToolError('Fournir soit dates, soit start et end.');
      checkRange(start, end, 366);
      target = getWorkingDays(start, end);
    }
    selectMembers(await getMembers(db), [person]);
    const result = await setAttendance(db, person, target, STATUS_VALUE[status], !!provisional);
    if (result.updated.length) {
      ctx.waitUntil(logChange(db, 'mcp', 'mcp', 'set-attendance', { person, status, provisional: !!provisional, dates: result.updated }));
    }
    return { person, status, provisional: !!provisional && status !== 'present', updated: result.updated, skipped: result.skipped };
  });

  return server;
}

// Stateless Streamable HTTP: a fresh server and transport per request
export async function handleMcp(request, env, ctx) {
  const server = createServer(env, ctx);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(request);
}
