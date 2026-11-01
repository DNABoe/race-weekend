// Template values for the race page, standings, settings and games.
import * as F from './rw-fmt.js';
import { sessionRows, raceStatus, t0, t1, seg, star, av } from './rw-view.js';
import { trackImg, hasTrack } from './rw-tracks.js';

const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
const toggle = (on, click) => ({ bg: on ? 'oklch(0.58 0.23 25)' : 'var(--sel)', left: on ? '21px' : '3px', knob: on ? '#ffffff' : 'var(--t3)', click });
const GAMES = [
  ['Slipstream', 'One-tap · Ride the hills', 'Tap and hold on downhills to stick to the tarmac and gain speed, release on the crest to launch. Chain smooth landings to fill the DRS Train and unleash boost.'],
  ['GrandTour', 'Road trip · Beat the clock', 'Arcade road racer on scenic roads inspired by F1 venues. Beat the clock at every checkpoint, weave through traffic and pick left or right at each fork: five stages, fifteen roads, five finishes. Original synth soundtrack.'],
  ['ApexRush', 'Endless · Trace the line', "Neon endless racer. Auto-throttle through an infinite circuit, clip every apex to build Flow, chain combos and unleash boost. One bad exit and it's over."],
  ['Pole Position', 'Real circuits · Race the grid', 'Start last on the real grid at the next Grand Prix circuit and race through the field. Brake for the corners, use the slipstream, chase your ghost lap and take on the weekend challenge.'],
  ["Grand Prix Simulator '86", 'Top-down · Real circuits', "Top-down racer in the spirit of the 1986 Codemasters classic, on this season's real circuits. Five laps against four title contenders with tyre wear, pit stops, rain and DRS boosts. Race once, run the whole season or chase your ghost in time trial."]
];

export function deriveMore(st, h, v, { races, nx, cur, cd, pic }) {
  const { data, prefs, now } = st, mob = v.mob;

  const race = races.find(r => r.round === st.raceRound) || cur, rs = raceStatus(race, now);
  const rnx = race.sessions.find(s => t1(s) > now), rLive = !!rnx && t0(rnx) <= now;
  const res = st.results[race.round];
  const tabs = res ? [['race', 'Race', res.race], ['quali', 'Qualifying', res.quali], ['sprint', 'Sprint', res.sprint]].filter(x => x[2].length) : [];
  const act = tabs.find(x => x[0] === st.resTab) || tabs[0], rows = act ? act[2] : [], isQ = !!act && act[0] === 'quali';
  const rRows = sessionRows(race, st, h, nx), pend = rRows.filter(r => r.notDone), rAllOn = pend.length > 0 && pend.every(r => r.bell === 'notifications_active');
  const wx = st.weather[race.round], w = data.winners[race.round];
  Object.assign(v, {
    rFlag: race.flag, rRound: `Round ${race.round} of ${races.length}`, rSprint: race.sprint, rTitle: race.name,
    rMeta: `${race.circuit} · ${race.city} · ${F.range(race, prefs)}`, rDone: rs === 'done', rNotDone: rs !== 'done', rLive,
    rCdLabel: rnx ? rnx.name + (rLive ? ' ends in' : ' starts in') : '', rCd: rnx ? F.parts((rLive ? t1(rnx) : t0(rnx)) - now).short : '',
    rWinner: w ? w.name + ' won · ' + w.team : 'Finished', rDoneCount: `${race.sessions.filter(s => now >= t1(s)).length} of ${race.sessions.length} done`,
    rProgress: race.sessions.map(s => {
      const d = now >= t1(s), hot = !d && s === rnx;
      return { l: (s.type === 'SQ' ? 'Sprint Quali' : s.name.replace('Practice ', 'FP')) + ' · ' + F.dow(s.start, prefs, race), bg: d ? 'oklch(0.72 0.16 152)' : hot ? 'oklch(0.62 0.24 25)' : 'var(--trk)', fg: d || hot ? 'var(--tx)' : 'var(--t3)' };
    }),
    rRows, rAlertsLabel: rAllOn ? 'Alerts on' : 'Alert me', rAlertsIcon: rAllOn ? 'notifications_active' : 'notifications', rAlertsFv: rAllOn ? "'FILL' 1" : "'FILL' 0",
    rToggleAlerts: () => h.weekendAlerts(race.round, !rAllOn), rIcs: () => h.weekendIcs(race.round), back: () => h.go('calendar'),
    rHasResults: tabs.length > 0, rNoResults: tabs.length === 0, rResSeg: seg(tabs.map(x => [x[0], x[1]]), act ? act[0] : '', k => h.set({ resTab: k })),
    rResNote: st.resLoading ? 'Loading results…' : rs === 'up' ? 'Results show up here after each session.' : 'No classification published yet.',
    rPodium: !isQ && rows.length >= 3 ? [rows[1], rows[0], rows[2]].map((x, i) => ({ code: x.code, team: x.team, color: x.color, time: x.time, pos: x.pos, h: ['84px', '112px', '64px'][i], ...av(pic(x.url), x.code) })) : [],
    rHasPodium: !isQ && rows.length >= 3,
    rRes: rows.map(x => ({ pos: x.out ? x.posText : x.pos, name: x.name, team: x.team, color: x.color, time: isQ ? x.best : x.out ? x.status : x.time, pts: !isQ && x.pts ? '+' + x.pts : '', fg: x.out ? 'var(--t3)' : 'var(--tx)', ...av(pic(x.url), x.code) })),
    rTrack: trackImg(race.circuitId, 'lg', v.theme), rHasTrack: hasTrack(race.circuitId), rNoTrack: !hasTrack(race.circuitId),
    rKm: race.km ? race.km.toFixed(3) + ' km' : '—', rLaps: String(race.laps || '—'), rPrev: st.prev[race.round] || '—', rPrevLabel: `${data.season - 1} winner`, rTz: race.tz || '—',
    rWx: wx ? wx.days.map(d => ({ day: new Date(d.date + 'T12:00:00Z').toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }), icon: d.icon, hi: d.hi + '°', lo: d.lo + '°', rain: wx.past ? (d.mm >= 0.1 ? d.mm.toFixed(1) + ' mm rain' : 'Dry') : d.rain + '% rain' })) : [],
    rWxTitle: (wx ? wx.past : rs === 'done') ? 'Weather' : 'Forecast', rWxSrc: wx && wx.past ? 'Recorded · Open-Meteo' : 'Open-Meteo',
    rHasWx: !!wx, rNoWx: !wx, rWxNote: st.wxErr[race.round] ? (rs === 'done' ? 'Weather records for this race aren’t available.' : 'The forecast appears about two weeks before the race.') : 'Loading weather…',
    ...Object.fromEntries(Object.entries(star(st, h, race)).map(([k, x]) => ['r' + k[0].toUpperCase() + k.slice(1), x]))
  });

  const isD = st.standTab === 'drivers', lead = data.drivers[0] ? data.drivers[0].pts : 0, clead = data.constructors[0] ? data.constructors[0].pts : 0;
  const selId = st.sel || (isD ? data.drivers[0] && data.drivers[0].id : data.constructors[0] && data.constructors[0].id);
  const hl = id => (id === selId && !mob ? ['var(--rs)', 'var(--bd2)'] : ['transparent', 'transparent']);
  Object.assign(v, {
    sSeg: seg([['drivers', 'Drivers'], ['teams', 'Constructors']], st.standTab, k => h.set({ standTab: k, sel: null, sheet: false })), sIsD: isD, sIsT: !isD,
    standCols: mob ? 'minmax(0,1fr)' : 'minmax(0,1.45fr) minmax(0,1fr)',
    sDrivers: data.drivers.map((d, i) => ({ pos: d.pos, name: d.name, code: d.code, team: d.team, color: d.color, wins: d.wins || '–', pts: d.pts, gap: i ? '−' + (lead - d.pts) : 'Leader', bar: Math.round(d.pts / (lead || 1) * 100) + '%', rowBg: hl(d.id)[0], rowBd: hl(d.id)[1], open: () => h.openDriver(d.id), ...av(pic(d.url), d.code) })),
    sTeams: data.constructors.map((c, i) => ({ pos: c.pos, team: c.team, drv: c.drivers, color: c.color, wins: c.wins || '–', pts: c.pts, gap: i ? '−' + (clead - c.pts) : 'Leader', bar: Math.max(1, Math.round(c.pts / (clead || 1) * 100)) + '%', rowBg: hl(c.id)[0], rowBd: hl(c.id)[1], open: () => h.openTeam(c.id) }))
  });
  const d = isD ? data.drivers.find(x => x.id === selId) : null, c = isD ? null : data.constructors.find(x => x.id === selId), det = st.detail[selId];
  const sub = d ? [d.team, d.nat].filter(Boolean).join(' · ') : c ? [c.drivers, c.nat].filter(Boolean).join(' · ') : '';
  const pos = d ? d.pos : c ? c.pos : 0, pts = d ? d.pts : c ? c.pts : 0, top = isD ? lead : clead, second = isD ? (data.drivers[1] || {}).pts : (data.constructors[1] || {}).pts;
  const pKey = d ? d.url : c ? c.car : '', photo = pic(pKey);
  Object.assign(v, {
    pShow: (d || c) && (!mob || st.sheet), pScrim: mob && st.sheet, closeSheet: () => h.set({ sheet: false }),
    panelStyle: mob
      ? { position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 90, maxHeight: '84vh', overflowY: 'auto', background: 'var(--sf)', borderRadius: '22px 22px 0 0', boxShadow: '0 -16px 48px rgba(0,0,0,0.45)' }
      : { position: 'sticky', top: '84px', background: 'var(--sf)', border: '1px solid var(--bd2)', borderRadius: '14px', overflow: 'hidden' },
    pTitle: d ? d.name : c ? c.team : '', pSub: sub, pNum: d ? d.num : '', pColor: (d || c || {}).color || 'var(--trk)', pIsD: !!d,
    pPhoto: photo, pHasPhoto: !!photo, pNoPhoto: !photo, pPos: d ? '50% 18%' : '50% 55%', pNumFg: photo ? '#ffffff' : 'var(--tx)',
    pHeroBg: photo ? 'var(--rs)' : `color-mix(in oklch, ${(d || c || {}).color || '#8a919d'} 26%, var(--rs))`, pHasFoot: !!photo || !!(d && d.url),
    pStats: [['Position', ord(pos)], ['Points', String(pts)], ['Wins', String((d || c || {}).wins || 0)], pos === 1 ? ['Lead', '+' + (pts - (second || 0))] : ['Gap', '−' + (top - pts)]].map(([l, x]) => ({ l, x })),
    pRows: (det || []).map(r => ({ race: r.race, pos: r.pos, pts: r.pts ? '+' + r.pts : '', bg: r.top3 ? 'oklch(0.72 0.16 152 / 0.18)' : 'var(--rs)', fg: r.top3 ? 'oklch(0.8 0.14 152)' : 'var(--t2)' })),
    pLoading: !det, pHasRows: !!det && det.length > 0, pUrl: d && d.url ? d.url : '', pHasUrl: !!(d && d.url)
  });

  const ns = st.notif, ok = ns === 'granted';
  const lr = cur.sessions[cur.sessions.length - 1].start, P = { ...prefs, tz: 'local' };
  Object.assign(v, {
    nStatus: ok ? 'Allowed in this browser' : ns === 'denied' ? 'Blocked in your browser settings' : ns === 'unsupported' ? 'Not supported in this browser' : 'Not turned on yet',
    nDot: ok ? 'oklch(0.72 0.16 152)' : ns === 'denied' ? 'oklch(0.62 0.24 25)' : 'var(--t4)', nOk: ok, nAsk: ns === 'default', askNotif: h.askNotif, testNotif: h.testNotif,
    nScheduled: ok ? `${st.scheduled} alert${st.scheduled === 1 ? '' : 's'} set for the next 3 weeks while this tab is open.` : 'Alerts need permission first.',
    alertChips: [['p', 'Practice'], ['s', 'Sprint'], ['q', 'Qualifying'], ['r', 'Race']].map(([k, l]) => {
      const on = !!prefs.alerts[k];
      return { l, icon: on ? 'check' : 'add', bg: on ? 'var(--on)' : 'var(--rs)', fg: on ? 'var(--onfg)' : 'var(--t3)', bd: on ? 'var(--on)' : 'var(--bd)', click: () => h.setAlert(k, !on) };
    }),
    leadSeg: seg([[0, 'At start'], [15, '15 min'], [60, '1 hour'], [1440, '1 day']], prefs.lead, k => h.setPref('lead', k)),
    resultsTg: toggle(prefs.results, () => h.setPref('results', !prefs.results)), changesTg: toggle(prefs.changes, () => h.setPref('changes', !prefs.changes)),
    calPracticeTg: toggle(prefs.calPractice, () => h.setPref('calPractice', !prefs.calPractice)),
    calRemSeg: seg([[0, 'None'], [15, '15 min'], [60, '1 hour']], prefs.calReminder, k => h.setPref('calReminder', k)),
    hourSeg: seg([[false, '24-hour'], [true, '12-hour']], prefs.hour12, k => h.setPref('hour12', k)),
    tzSeg3: seg([['local', 'Your time'], ['track', 'Track'], ['utc', 'UTC']], prefs.tz, k => h.setPref('tz', k)),
    tzPreview: `${cur.short} race: ${F.time(lr, P, cur, F.localTz())} your time · ${F.time(lr, P, cur, cur.tz || 'UTC')} track · ${F.time(lr, P, cur, 'UTC')} UTC`,
    themeSeg: seg([['dark', 'Dark'], ['light', 'Light'], ['system', 'System']], prefs.theme, k => h.setPref('theme', k)),
    syncedLong: st.syncing ? 'Syncing…' : `Synced ${F.ago(data.fetchedAt, now)} · saved for offline use`, syncNow: h.retry,
    aboutOpen: !!st.about, openAbout: () => h.set({ about: true }), closeAbout: () => h.set({ about: false }), localTzName: F.localTz()
  });

  const GT = 1, PP = 3, GP = 4, SHOT = { 1: ['assets/grandtour-card.jpg', 'GrandTour gameplay on the Monaco Coast'], 3: ['assets/pole-position-card.jpg', 'Pole Position gameplay at Silverstone'], 4: ['assets/gp86-card.jpg', "Grand Prix Simulator '86 gameplay at Suzuka"] }, gr = (nx && nx.r) || races[races.length - 1];
  let gpCircuit = null;
  if (gr) {
    const rs = gr.sessions.find(x => x.type === 'Race') || gr.sessions[gr.sessions.length - 1];
    let hm = 14;
    try { const pt = new Intl.DateTimeFormat('en-GB', { timeZone: gr.tz || 'UTC', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(rs.start)); hm = +pt.find(x => x.type === 'hour').value + +pt.find(x => x.type === 'minute').value / 60; } catch (e) {}
    gpCircuit = { id: gr.circuitId, km: gr.km, name: gr.circuit, gp: gr.name, short: gr.short, round: gr.round, season: gr.season, tod: hm >= 18 ? 'night' : hm >= 16.5 ? 'dusk' : 'day' };
  }
  Object.assign(v, {
    games: GAMES.map(([t, tag, desc], i) => ({ t, tag, desc, shot: !!SHOT[i], src: SHOT[i] ? SHOT[i][0] : '', alt: SHOT[i] ? SHOT[i][1] : '', noImg: !SHOT[i], art: t.toLowerCase() + ' gameplay', play: () => h.set({ game: i }) })),
    gameOpen: st.game != null, gameTitle: st.game != null ? GAMES[st.game][0] : '', gameTag: st.game != null ? GAMES[st.game][1] : '', closeGame: () => h.set({ game: null }),
    gamePP: st.game === PP, gameGP: st.game === GP, gameGT: st.game === GT, gameSoon: st.game != null && st.game !== PP && st.game !== GP && st.game !== GT, gameW: st.game === PP ? '440px' : st.game === GP || st.game === GT ? '960px' : '880px',
    gtNext: gr ? { id: gr.circuitId, gp: gr.name, round: gr.round, season: gr.season } : null,
    gpCal: races.map(r => ({ id: r.circuitId, km: r.km, name: r.circuit, gp: r.name, short: r.short, round: r.round, season: r.season })), gpNext: gr ? gr.round : null,
    gpTop4: data.drivers.slice(0, 4).map(d => ({ code: d.code, name: d.name, color: d.color })),
    gpCircuit, gpRivals: data.drivers.slice(0, 21).map(d => ({ code: d.code, name: d.name, color: d.color, team: d.team })),
    gameHint: nx ? (nx.live ? `${nx.s.name} is live now` : `${nx.s.name} starts in ${cd.short}`) : ''
  });
  return v;
}
