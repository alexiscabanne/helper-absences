// ── Calendar helpers: French public holidays and working days ──

// Easter Sunday (Meeus/Jones/Butcher algorithm)
function easterSunday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return new Date(Date.UTC(year, Math.floor(n / 31) - 1, (n % 31) + 1));
}

// French public holidays for a year: Map date → name
const holidayCache = new Map();
export function holidaysOf(year) {
  if (holidayCache.has(year)) return holidayCache.get(year);
  const easter = easterSunday(year);
  const fromEaster = n => {
    const d = new Date(easter);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const map = new Map([
    [`${year}-01-01`, 'Jour de l\'An'],
    [fromEaster(1), 'Lundi de Pâques'],
    [`${year}-05-01`, 'Fête du Travail'],
    [`${year}-05-08`, 'Victoire 1945'],
    [fromEaster(39), 'Ascension'],
    [fromEaster(50), 'Lundi de Pentecôte'],
    [`${year}-07-14`, 'Fête Nationale'],
    [`${year}-08-15`, 'Assomption'],
    [`${year}-11-01`, 'Toussaint'],
    [`${year}-11-11`, 'Armistice'],
    [`${year}-12-25`, 'Noël'],
  ]);
  holidayCache.set(year, map);
  return map;
}

// Working days (no weekends, no holidays) between two 'YYYY-MM-DD' dates, inclusive
export function getWorkingDays(start, end) {
  const days = [];
  const d = new Date(start + 'T00:00:00Z');
  const last = new Date(end + 'T00:00:00Z');
  while (d <= last) {
    const key = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6 && !holidaysOf(d.getUTCFullYear()).has(key)) days.push(key);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Today in Paris, as 'YYYY-MM-DD'
export function parisToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
}
