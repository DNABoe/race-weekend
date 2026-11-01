// Formatting, countdowns, calendar (.ics) files and in-tab alerts.
export const localTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; } };
export const tzFor = (p, race) => (p.tz === 'utc' ? 'UTC' : p.tz === 'track' ? (race && race.tz) || undefined : undefined);
const fmt = (iso, opts, tz) => new Date(iso).toLocaleString(undefined, { ...opts, timeZone: tz });
export const time = (iso, p, race, tz) => fmt(iso, { hour: '2-digit', minute: '2-digit', hour12: !!p.hour12 }, tz === undefined ? tzFor(p, race) : tz);
export const dow = (iso, p, race) => fmt(iso, { weekday: 'short' }, tzFor(p, race));
export const dayMon = (iso, p, race) => fmt(iso, { day: 'numeric', month: 'short' }, tzFor(p, race));
export const altTime = (iso, p, race) => (p.tz === 'local' ? time(iso, p, race, race.tz || 'UTC') + ' at track' : time(iso, p, race, localTz()) + ' your time');

export function range(race, p) {
  const a = race.sessions[0].start, b = race.sessions[race.sessions.length - 1].start, tz = tzFor(p, race);
  const ma = fmt(a, { month: 'short' }, tz), mb = fmt(b, { month: 'short' }, tz), da = fmt(a, { day: 'numeric' }, tz), db = fmt(b, { day: 'numeric' }, tz);
  return ma === mb ? `${da}–${db} ${mb}` : `${da} ${ma} – ${db} ${mb}`;
}

export function parts(ms) {
  const t = Math.max(0, ms), d = Math.floor(t / 864e5), h = Math.floor(t / 36e5) % 24, m = Math.floor(t / 6e4) % 60, s = Math.floor(t / 1e3) % 60;
  const pad = n => String(n).padStart(2, '0');
  const short = d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${pad(m)}m` : `${m}m ${pad(s)}s`;
  return { d: String(d), h: d ? pad(h) : String(h), m: pad(m), s: pad(s), dl: d === 1 ? 'day' : 'days', short, showD: d > 0 };
}
export function ago(ts, now) {
  const m = Math.round((now - ts) / 6e4);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
}

const stamp = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = s => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => '\\' + m);
export function ics(events, reminderMin) {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Race Weekend Hub//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:F1 Race Weekend'];
  events.forEach(({ race, s }) => {
    const end = new Date(new Date(s.start).getTime() + s.dur * 6e4);
    L.push('BEGIN:VEVENT', `UID:${race.season}-${race.round}-${s.type}@raceweekend.boestad.com`, `DTSTAMP:${stamp(Date.now())}`,
      `DTSTART:${stamp(s.start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${esc('F1 ' + s.name + ' · ' + race.short)}`, `LOCATION:${esc(race.circuit + ', ' + race.city)}`);
    if (reminderMin) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(s.name + ' starts soon')}`, `TRIGGER:-PT${reminderMin}M`, 'END:VALARM');
    L.push('END:VEVENT');
  });
  L.push('END:VCALENDAR');
  return L.join('\r\n');
}
export function download(name, text) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener'; a.target = '_blank';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch { window.open('data:text/calendar;charset=utf-8,' + encodeURIComponent(text), '_blank'); }
}

export const notifState = () => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
export async function askNotif() { if (typeof Notification === 'undefined') return 'unsupported'; try { return await Notification.requestPermission(); } catch { return Notification.permission; } }
export function notify(title, body) { try { new Notification(title, { body, icon: 'assets/logo-mark.png' }); return true; } catch { return false; } }
let timers = [];
export function schedule(items) {
  timers.forEach(clearTimeout);
  const now = Date.now();
  timers = items.filter(x => x.at > now && x.at - now < 2147483000).map(x => setTimeout(() => notify(x.title, x.body), x.at - now));
  return timers.length;
}
