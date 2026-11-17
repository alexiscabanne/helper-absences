import { getWorkingDays, parisToday, DATE_RE } from './calendar.js';
import * as store from './db.js';

const json = (body, status = 200) => Response.json(body, { status });

// ── /api/* routes (same contract as the former Express server) ──
// actor: email of the Cloudflare Access user, recorded in the changes journal
export async function handleApi(request, env, ctx, actor) {
  const url = new URL(request.url);
  const route = `${request.method} ${url.pathname}`;
  const db = env.DB;
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
  const log = (action, details) => ctx.waitUntil(store.logChange(db, 'web', actor, action, details));

  switch (route) {
    case 'GET /api/data':
      return json(await store.getData(db));

    case 'GET /api/calendar':
      return json(await store.getCalendar(db));

    case 'POST /api/toggle': {
      const { person, date } = body;
      if (!person || !date) return json({ error: 'person and date required' }, 400);
      const present = await store.toggleAttendance(db, person, date);
      if (present === null) return json({ error: 'not found' }, 404);
      log('toggle', { person, date, present });
      return json({ person, date, present });
    }

    case 'POST /api/toggle-provisional': {
      const { person, date } = body;
      if (!person || !date) return json({ error: 'person and date required' }, 400);
      const prov = await store.toggleProvisional(db, person, date);
      if (prov === null) return json({ error: 'not found' }, 404);
      log('toggle-provisional', { person, date, provisional: prov });
      return json({ person, date, provisional: prov ? 1 : 0 });
    }

    case 'GET /api/members':
      return json(await store.getMembers(db));

    case 'POST /api/members/add': {
      const { person, role } = body;
      if (!person || !person.trim()) return json({ error: 'person required' }, 400);
      const name = person.trim();
      const { min, max } = await store.calendarInfo(db);
      const year = Number(parisToday().slice(0, 4));
      await store.addMember(db, name, role || null, getWorkingDays(min || `${year}-01-01`, max || `${year}-12-31`));
      log('member-add', { person: name, role: role || null });
      return json({ ok: true });
    }

    case 'POST /api/members/role': {
      const { person, role } = body;
      if (!person) return json({ error: 'person required' }, 400);
      await store.setMemberRole(db, person, role || null);
      log('member-role', { person, role: role || null });
      return json({ ok: true });
    }

    case 'POST /api/members/rename': {
      const { oldName, newName } = body;
      if (!oldName || !newName || !newName.trim()) return json({ error: 'oldName and newName required' }, 400);
      const name = newName.trim();
      if (name === oldName) return json({ ok: true });
      if (!await store.renameMember(db, oldName, name)) return json({ error: 'person not found' }, 404);
      log('member-rename', { oldName, newName: name });
      return json({ ok: true });
    }

    case 'POST /api/members/reorder': {
      const { order } = body;
      if (!Array.isArray(order)) return json({ error: 'order must be array' }, 400);
      await store.reorderMembers(db, order);
      return json({ ok: true });
    }

    case 'POST /api/members/delete': {
      const { person } = body;
      if (!person) return json({ error: 'person required' }, 400);
      await store.deleteMember(db, person);
      log('member-delete', { person });
      return json({ ok: true });
    }

    case 'GET /api/roles':
      return json(await store.getRoles(db));

    case 'POST /api/roles/add': {
      const { name, color } = body;
      if (!name || !name.trim()) return json({ error: 'name required' }, 400);
      const n = name.trim().toUpperCase();
      await store.addRole(db, n, color || '#7b7f8e');
      log('role-add', { name: n, color: color || '#7b7f8e' });
      return json({ ok: true });
    }

    case 'POST /api/roles/rename': {
      const { oldName, newName } = body;
      if (!oldName || !newName || !newName.trim()) return json({ error: 'oldName and newName required' }, 400);
      const n = newName.trim().toUpperCase();
      if (n === oldName) return json({ ok: true });
      await store.renameRole(db, oldName, n);
      log('role-rename', { oldName, newName: n });
      return json({ ok: true });
    }

    case 'POST /api/roles/update': {
      const { name, color } = body;
      if (!name) return json({ error: 'name required' }, 400);
      await store.setRoleColor(db, name, color || '#7b7f8e');
      return json({ ok: true });
    }

    case 'POST /api/roles/delete': {
      const { name } = body;
      if (!name) return json({ error: 'name required' }, 400);
      const unassigned = await store.deleteRole(db, name);
      log('role-delete', { name });
      return json({ ok: true, unassigned });
    }

    case 'POST /api/years/add': {
      const year = Number(body.year);
      if (!Number.isInteger(year) || year < 2000 || year > 2100) return json({ error: 'année invalide' }, 400);
      const days = getWorkingDays(`${year}-01-01`, `${year}-12-31`);
      const members = await store.addYear(db, year, days);
      if (members === null) return json({ error: `L'année ${year} contient déjà des données.` }, 409);
      if (members === 0) return json({ error: 'Aucun membre dans l\'équipe.' }, 400);
      log('year-add', { year, days: days.length, members });
      return json({ ok: true, year, days: days.length, members });
    }

    case 'POST /api/purge': {
      const { before } = body;
      if (!DATE_RE.test(before || '')) return json({ error: 'date invalide' }, 400);
      if (before > parisToday()) return json({ error: 'La date doit être aujourd\'hui ou dans le passé.' }, 400);
      const deleted = await store.purgeBefore(db, before);
      log('purge', { before, deleted });
      return json({ ok: true, deleted });
    }
  }
  throw new store.HttpError(404, 'not found');
}
