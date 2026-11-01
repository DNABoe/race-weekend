// Live F1 data: Jolpica (Ergast-compatible) + Open-Meteo. Last good season is cached in localStorage.
const BASE = 'https://api.jolpi.ca/ergast/f1';
const CACHE = 'rw-data-v1';
// circuitId: [country code, km, laps, timezone, short name]
const TRACK = {
  albert_park: ['au', 5.278, 58, 'Australia/Melbourne', 'Australia'], shanghai: ['cn', 5.451, 56, 'Asia/Shanghai', 'China'],
  suzuka: ['jp', 5.807, 53, 'Asia/Tokyo', 'Japan'], bahrain: ['bh', 5.412, 57, 'Asia/Bahrain', 'Bahrain'],
  jeddah: ['sa', 6.174, 50, 'Asia/Riyadh', 'Saudi Arabia'], miami: ['us', 5.412, 57, 'America/New_York', 'Miami'],
  imola: ['it', 4.909, 63, 'Europe/Rome', 'Imola'], monaco: ['mc', 3.337, 78, 'Europe/Monaco', 'Monaco'],
  villeneuve: ['ca', 4.361, 70, 'America/Toronto', 'Canada'], catalunya: ['es', 4.657, 66, 'Europe/Madrid', 'Barcelona'],
  red_bull_ring: ['at', 4.318, 71, 'Europe/Vienna', 'Austria'], silverstone: ['gb', 5.891, 52, 'Europe/London', 'Great Britain'],
  spa: ['be', 7.004, 44, 'Europe/Brussels', 'Belgium'], hungaroring: ['hu', 4.381, 70, 'Europe/Budapest', 'Hungary'],
  zandvoort: ['nl', 4.259, 72, 'Europe/Amsterdam', 'Netherlands'], monza: ['it', 5.793, 53, 'Europe/Rome', 'Italy'],
  madring: ['es', 5.474, 57, 'Europe/Madrid', 'Madrid'], baku: ['az', 6.003, 51, 'Asia/Baku', 'Azerbaijan'],
  marina_bay: ['sg', 4.94, 62, 'Asia/Singapore', 'Singapore'], americas: ['us', 5.513, 56, 'America/Chicago', 'United States'],
  rodriguez: ['mx', 4.304, 71, 'America/Mexico_City', 'Mexico City'], interlagos: ['br', 4.309, 71, 'America/Sao_Paulo', 'São Paulo'],
  vegas: ['us', 6.201, 50, 'America/Los_Angeles', 'Las Vegas'], losail: ['qa', 5.419, 57, 'Asia/Qatar', 'Qatar'],
  yas_marina: ['ae', 5.281, 58, 'Asia/Dubai', 'Abu Dhabi'], sepang: ['my', 5.543, 56, 'Asia/Kuala_Lumpur', 'Malaysia']
};
const COUNTRY = { Australia: 'au', China: 'cn', Japan: 'jp', Bahrain: 'bh', 'Saudi Arabia': 'sa', USA: 'us', 'United States': 'us', Italy: 'it', Monaco: 'mc', Canada: 'ca', Spain: 'es', Austria: 'at', UK: 'gb', 'United Kingdom': 'gb', Belgium: 'be', Hungary: 'hu', Netherlands: 'nl', Azerbaijan: 'az', Singapore: 'sg', Mexico: 'mx', Brazil: 'br', Qatar: 'qa', UAE: 'ae', 'United Arab Emirates': 'ae', Malaysia: 'my' };
const TEAM = { mercedes: '#27F4D2', ferrari: '#E8002D', mclaren: '#FF8000', red_bull: '#3671C6', rb: '#6692FF', racing_bulls: '#6692FF', alpine: '#2293D1', haas: '#B6BABD', audi: '#A9ADB2', sauber: '#A9ADB2', williams: '#64C4FF', aston_martin: '#229971', cadillac: '#6E7681' };
// Wikipedia article for each team's current car (from the app's f1-teams.ts); update each season.
const CAR = { Ferrari: 'Ferrari_SF-26', McLaren: 'McLaren_MCL40', Mercedes: 'Mercedes_W17', 'Red Bull': 'Red_Bull_Racing_RB22', Williams: 'Williams_FW48', 'Aston Martin': 'Aston_Martin_AMR26', 'Alpine F1 Team': 'Alpine_A526', 'Haas F1 Team': 'Haas_VF-26', 'RB F1 Team': 'Racing_Bulls_VCARB_03', 'Racing Bulls': 'Racing_Bulls_VCARB_03', Sauber: 'Audi_R26', Audi: 'Audi_R26', Cadillac: 'Cadillac_MAC-26' };

// Lead image of a Wikipedia article (driver photo, circuit map, car). Results are cached on the device.
const IMG = 'rw-img-v1';
let imgs = null;
// Wikimedia only serves standard thumbnail widths (330, 500, 960…); older cached 640px URLs are rewritten.
const store = () => imgs || (imgs = (() => { try { const s = JSON.parse(localStorage.getItem(IMG)) || {}; for (const k in s) if (s[k]) s[k] = s[k].replace(/\/640px-/, '/960px-'); return s; } catch { return {}; } })());
export const cachedImages = () => ({ ...store() });
export async function wikiImage(key, width = 960) {
  const s = store();
  if (key in s) return s[key];
  const title = key.includes('/wiki/') ? decodeURIComponent(key.split('/wiki/')[1].split('#')[0]) : key;
  let src = '';
  try {
    const r = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title.replace(/ /g, '_')));
    if (r.ok) {
      const j = await r.json(), o = j.originalimage, t = j.thumbnail;
      src = t && o && o.width > width ? t.source.replace(/\/\d+px-/, '/' + width + 'px-') : (o && o.source) || (t && t.source) || '';
    }
  } catch { return ''; }
  s[key] = src;
  try { localStorage.setItem(IMG, JSON.stringify(s)); } catch {}
  return src;
}

export const teamColor = (id = '', name = '') => TEAM[id] || TEAM[name.toLowerCase().replace(/ f1 team/, '').replace(/\s+/g, '_')] || '#8a919d';

const DUR = { FP1: 60, FP2: 60, FP3: 60, SQ: 45, Sprint: 60, Qualifying: 60, Race: 120 };
const NAME = { FP1: 'Practice 1', FP2: 'Practice 2', FP3: 'Practice 3', SQ: 'Sprint Qualifying', Sprint: 'Sprint', Qualifying: 'Qualifying', Race: 'Race' };
const KIND = { FP1: 'p', FP2: 'p', FP3: 'p', SQ: 's', Sprint: 's', Qualifying: 'q', Race: 'r' };

async function get(path) {
  const r = await fetch(BASE + path, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return (await r.json()).MRData;
}
const iso = t => (t && t.date) ? new Date(t.date + 'T' + (t.time || '12:00:00Z').replace(/Z?$/, 'Z')).toISOString() : null;
const person = d => ({ id: d.driverId, code: d.code || d.familyName.slice(0, 3).toUpperCase(), name: d.givenName + ' ' + d.familyName, last: d.familyName, num: d.permanentNumber || '', nat: d.nationality || '', url: d.url || '' });

function mapRace(r) {
  const loc = r.Circuit.Location;
  const m = TRACK[r.Circuit.circuitId] || [COUNTRY[loc.country] || 'un', null, null, null, r.raceName.replace(/ Grand Prix/, '')];
  const sprint = !!r.Sprint;
  const raw = sprint
    ? [['FP1', r.FirstPractice], ['SQ', r.SprintQualifying || r.SprintShootout], ['Sprint', r.Sprint], ['Qualifying', r.Qualifying]]
    : [['FP1', r.FirstPractice], ['FP2', r.SecondPractice], ['FP3', r.ThirdPractice], ['Qualifying', r.Qualifying]];
  raw.push(['Race', { date: r.date, time: r.time }]);
  const sessions = raw.filter(([, t]) => t && t.date)
    .map(([type, t]) => ({ type, name: NAME[type], kind: KIND[type], start: iso(t), dur: DUR[type] }))
    .sort((a, b) => (a.start < b.start ? -1 : 1));
  return {
    round: +r.round, season: +r.season, name: r.raceName, short: m[4], circuit: r.Circuit.circuitName, circuitId: r.Circuit.circuitId,
    city: loc.locality, country: loc.country, cc: m[0], flag: 'https://flagcdn.com/w80/' + m[0] + '.png',
    km: m[1], laps: m[2], tz: m[3], lat: +loc.lat, lon: +loc.long, sprint, sessions, wiki: r.Circuit.url || ''
  };
}

function mapResults(list = []) {
  return list.map(x => {
    const pt = x.positionText ?? x.position;
    const out = isNaN(+pt);
    return {
      ...person(x.Driver), pos: +x.position, posText: out ? (pt === 'D' ? 'DSQ' : 'DNF') : pt,
      team: x.Constructor.name, color: teamColor(x.Constructor.constructorId, x.Constructor.name),
      time: x.Time?.time || x.status || '', status: x.status || '', pts: +(x.points || 0), grid: +(x.grid || 0), out,
      q1: x.Q1 || '', q2: x.Q2 || '', q3: x.Q3 || '', best: x.Q3 || x.Q2 || x.Q1 || ''
    };
  });
}

export function cached() { try { return JSON.parse(localStorage.getItem(CACHE)); } catch { return null; } }

export async function loadSeason() {
  const [s, ds, cs, w, last] = await Promise.all([
    get('/current.json?limit=100'),
    get('/current/driverStandings.json?limit=100'),
    get('/current/constructorStandings.json?limit=100'),
    get('/current/results/1.json?limit=100').catch(() => null),
    get('/current/last/results.json?limit=100').catch(() => null)
  ]);
  const races = s.RaceTable.Races.map(mapRace);
  const dl = ds.StandingsTable.StandingsLists[0] || { DriverStandings: [], round: 0 };
  const cl = cs.StandingsTable.StandingsLists[0] || { ConstructorStandings: [] };
  const drivers = dl.DriverStandings.map(x => {
    const c = x.Constructors[x.Constructors.length - 1] || {};
    return { ...person(x.Driver), pos: +x.position || 0, pts: +x.points, wins: +x.wins, team: c.name || '', teamId: c.constructorId || '', color: teamColor(c.constructorId, c.name) };
  });
  const constructors = cl.ConstructorStandings.map(x => ({
    id: x.Constructor.constructorId, team: x.Constructor.name, nat: x.Constructor.nationality || '', pos: +x.position || 0, pts: +x.points, wins: +x.wins,
    color: teamColor(x.Constructor.constructorId, x.Constructor.name), url: x.Constructor.url || '', car: CAR[x.Constructor.name] || '',
    drivers: drivers.filter(d => d.teamId === x.Constructor.constructorId).map(d => d.last).join(' · ')
  }));
  const winners = {};
  (w?.RaceTable.Races || []).forEach(r => {
    const x = r.Results[0];
    if (x) winners[+r.round] = { name: x.Driver.givenName + ' ' + x.Driver.familyName, last: x.Driver.familyName, team: x.Constructor.name, color: teamColor(x.Constructor.constructorId, x.Constructor.name) };
  });
  const lr = last?.RaceTable.Races[0];
  const data = {
    season: +s.RaceTable.season, races, drivers, constructors, winners, standingsRound: +dl.round || 0,
    lastResults: lr ? { round: +lr.round, rows: mapResults(lr.Results) } : null, fetchedAt: Date.now()
  };
  try { localStorage.setItem(CACHE, JSON.stringify(data)); } catch {}
  return data;
}

export async function loadResults(round) {
  const [r, q, s] = await Promise.all(['results', 'qualifying', 'sprint'].map(k => get(`/current/${round}/${k}.json?limit=100`).catch(() => null)));
  const pick = (m, key) => { const x = m?.RaceTable.Races[0]; return x ? mapResults(x[key]) : []; };
  return { race: pick(r, 'Results'), quali: pick(q, 'QualifyingResults'), sprint: pick(s, 'SprintResults') };
}

export async function loadPrevWinner(season, circuitId) {
  try {
    const m = await get(`/${season - 1}/circuits/${circuitId}/results/1.json`);
    const x = m.RaceTable.Races[0]?.Results[0];
    return x ? x.Driver.givenName + ' ' + x.Driver.familyName : '';
  } catch { return ''; }
}

export async function loadDriver(id) {
  const m = await get(`/current/drivers/${id}/results.json?limit=100`);
  return m.RaceTable.Races.map(r => {
    const x = r.Results[0];
    return { round: +r.round, race: r.raceName.replace(' Grand Prix', ''), pos: isNaN(+x.positionText) ? 'DNF' : 'P' + x.positionText, top3: +x.positionText <= 3, pts: +x.points };
  }).reverse();
}

export async function loadTeam(id) {
  const m = await get(`/current/constructors/${id}/results.json?limit=100`);
  return m.RaceTable.Races.map(r => ({
    round: +r.round, race: r.raceName.replace(' Grand Prix', ''),
    pos: r.Results.map(x => (isNaN(+x.positionText) ? 'DNF' : 'P' + x.positionText)).join(' · '),
    top3: r.Results.some(x => +x.positionText <= 3), pts: r.Results.reduce((a, x) => a + +x.points, 0)
  })).reverse();
}

const WX = c => c === 0 ? ['Clear', 'clear_day'] : c <= 2 ? ['Mostly clear', 'partly_cloudy_day'] : c === 3 ? ['Cloudy', 'cloud'] : c <= 48 ? ['Fog', 'foggy'] : c <= 67 ? ['Rain', 'rainy'] : c <= 77 ? ['Snow', 'weather_snowy'] : c <= 82 ? ['Showers', 'rainy'] : c <= 86 ? ['Snow', 'weather_snowy'] : ['Storms', 'thunderstorm'];

// Upcoming/live weekends: forecast with rain probability. Finished weekends: recorded weather (ERA5 archive, forecast API as
// fallback for the ~5 days the archive lags) with rain in mm.
export async function loadWeather(race) {
  const tz = race.tz || 'UTC', S = race.sessions;
  const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false });
  const key = iso => fmt.format(new Date(iso)).replace(' ', 'T');
  const first = key(S[0].start).slice(0, 10), last = key(S[S.length - 1].start).slice(0, 10);
  const past = Date.now() > new Date(S[S.length - 1].start).getTime() + 3 * 36e5;
  const q = `latitude=${race.lat}&longitude=${race.lon}&timezone=${encodeURIComponent(tz)}&start_date=${first}&end_date=${last}&daily=weather_code,temperature_2m_max,temperature_2m_min,`
    + (past ? 'precipitation_sum&hourly=precipitation' : 'precipitation_probability_max&hourly=precipitation_probability');
  const get = async base => { const r = await fetch(base + q); if (!r.ok) throw new Error('weather ' + r.status); return r.json(); };
  let j = past ? await get('https://archive-api.open-meteo.com/v1/archive?').catch(() => null) : null;
  if (!j || !j.daily || j.daily.temperature_2m_max.some(x => x == null)) j = await get('https://api.open-meteo.com/v1/forecast?');
  const d = j.daily, h = j.hourly;
  const days = d.time.map((t, i) => ({ date: t, icon: WX(d.weather_code[i])[1], label: WX(d.weather_code[i])[0], hi: Math.round(d.temperature_2m_max[i]), lo: Math.round(d.temperature_2m_min[i]), rain: past ? null : d.precipitation_probability_max[i] ?? 0, mm: past ? Math.round((d.precipitation_sum[i] || 0) * 10) / 10 : null }));
  const rain = {};
  S.forEach(s => {
    const i = h.time.findIndex(t => t.startsWith(key(s.start)));
    if (i < 0) return;
    if (past) { let mm = 0; for (let k = 1; k <= Math.max(1, Math.ceil(s.dur / 60)); k++) mm += +(h.precipitation[i + k] || 0); rain[s.type] = Math.round(mm * 10) / 10; }
    else if (h.precipitation_probability[i] != null) rain[s.type] = h.precipitation_probability[i];
  });
  return { days, rain, past };
}
