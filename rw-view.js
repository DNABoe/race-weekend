// Turns app state into template values: theme, nav, Home and Calendar. Race/Standings/Settings/Games live in rw-view2.js.
import * as F from './rw-fmt.js';
import { deriveMore } from './rw-view2.js';
import { trackImg, hasTrack } from './rw-tracks.js';

export const DOT = { p: '#7b828e', s: 'oklch(0.8 0.14 75)', q: 'oklch(0.72 0.16 22)', r: 'oklch(0.62 0.24 25)' };
const THEMES = {
  dark: { '--bg': '#0e1016', '--sf': '#161920', '--rs': '#1d2129', '--in': '#13161c', '--sel': '#2e333d', '--bd': 'rgba(255,255,255,0.07)', '--bd2': 'rgba(255,255,255,0.13)', '--tx': '#f3f4f6', '--t2': '#c9ced6', '--t3': '#a0a7b3', '--t4': '#8a919d', '--trk': '#262a33', '--st1': '#1b1e25', '--st2': '#161920', '--on': '#f3f4f6', '--onfg': '#0e1016', '--hl': 'rgba(230,50,60,0.10)', '--hdr': 'rgba(14,16,22,0.88)' },
  light: { '--bg': '#f4f4f6', '--sf': '#ffffff', '--rs': '#eceef2', '--in': '#f8f9fa', '--sel': '#ffffff', '--bd': 'rgba(14,16,22,0.08)', '--bd2': 'rgba(14,16,22,0.15)', '--tx': '#0e1016', '--t2': '#2f343d', '--t3': '#4f5560', '--t4': '#626873', '--trk': '#e3e6ea', '--st1': '#eceef1', '--st2': '#f6f7f9', '--on': '#0e1016', '--onfg': '#ffffff', '--hl': 'rgba(230,50,60,0.07)', '--hdr': 'rgba(244,244,246,0.9)' }
};
export const t0 = s => new Date(s.start).getTime();
export const t1 = s => t0(s) + s.dur * 6e4;
export const raceStatus = (r, now) => (now >= t1(r.sessions[r.sessions.length - 1]) ? 'done' : now >= t0(r.sessions[0]) ? 'live' : 'up');
export function nextSession(races, now) { for (const r of races) for (const s of r.sessions) if (t1(s) > now) return { r, s, live: t0(s) <= now }; return null; }
export const av = (src, code) => ({ photo: src, hasPhoto: !!src, noPhoto: !src, ini: code || '' });
export const seg = (opts, val, set) => opts.map(([k, l]) => ({ l, bg: k === val ? 'var(--sel)' : 'transparent', fg: k === val ? 'var(--tx)' : 'var(--t3)', click: () => set(k) }));
export const themeOf = st => (st.prefs.theme === 'system' ? (st.sysLight ? 'light' : 'dark') : st.prefs.theme);
export const star = (st, h, r) => { const on = st.starred.includes(r.circuitId); return { starColor: on ? 'oklch(0.8 0.14 75)' : 'var(--t4)', starFv: on ? "'FILL' 1" : "'FILL' 0", toggleStar: e => { e && e.stopPropagation(); h.toggleStar(r.circuitId); } }; };

export function sessionRows(race, st, h, nx) {
  const { prefs, now } = st, wx = st.weather[race.round];
  return race.sessions.map(s => {
    const done = now >= t1(s), live = !done && now >= t0(s), next = !!nx && nx.s === s && !live;
    const key = race.round + '-' + s.type, on = key in st.bells ? st.bells[key] : !!prefs.alerts[s.kind];
    const wr = wx ? wx.rain[s.type] : null, rain = wr == null ? '' : wx.past ? (wr >= 0.1 ? wr.toFixed(1) + ' mm' : '') : wr + '%';
    return {
      name: s.name, dow: F.dow(s.start, prefs, race), date: F.dayMon(s.start, prefs, race), time: F.time(s.start, prefs, race), alt: F.altTime(s.start, prefs, race),
      dur: s.dur >= 120 ? '2 h' : s.dur + ' min', dot: DOT[s.kind], rain, hasRain: !!rain, done, notDone: !done, live, next,
      tag: live ? 'Live' : 'Next', hasTag: live || next, rowBg: live || next ? 'var(--hl)' : 'transparent', nameColor: done ? 'var(--t3)' : 'var(--tx)',
      bell: on ? 'notifications_active' : 'notifications_off', bellColor: on ? 'var(--tx)' : 'var(--t4)', bellFv: on ? "'FILL' 1" : "'FILL' 0",
      toggleBell: () => h.toggleBell(key, !on), ics: () => h.sessionIcs(race.round, s.type)
    };
  });
}

function raceRow(r, st, h) {
  const { prefs } = st, rs = r.sessions[r.sessions.length - 1], w = st.data.winners[r.round];
  return {
    r: r.round, name: r.short, full: r.name, circuit: r.circuit, flag: r.flag, dates: F.range(r, prefs), sprint: r.sprint,
    track: trackImg(r.circuitId, 'sm', themeOf(st)), hasTrack: hasTrack(r.circuitId),
    day: F.dow(rs.start, prefs, r) + ' ' + F.dayMon(rs.start, prefs, r), time: F.time(rs.start, prefs, r),
    winner: w ? w.name : 'Result pending', wlast: w ? w.last : '', wteam: w ? w.team : '', wcolor: w ? w.color : 'var(--trk)',
    open: () => h.openRace(r.round), ...star(st, h, r)
  };
}

export function derive(st, h) {
  const mob = st.w < 820, { data, prefs, now } = st;
  const theme = themeOf(st);
  const tab = st.tab === 'race' ? 'calendar' : st.tab;
  const v = {
    mob, desk: !mob, theme, wantImages: [],
    rootStyle: { ...THEMES[theme], minHeight: '100vh', background: 'var(--bg)', color: 'var(--tx)', fontFamily: "'IBM Plex Sans',sans-serif", paddingBottom: mob ? '172px' : '0px' },
    pagePad: mob ? '8px 16px 32px' : '32px 40px 72px',
    loading: !data && !st.error, failed: !data && !!st.error, ready: !!data, retry: h.retry,
    toast: st.toast || '', hasToast: !!st.toast,
    isHome: st.tab === 'home', isCal: st.tab === 'calendar', isRace: st.tab === 'race', isStand: st.tab === 'standings', isGames: st.tab === 'games', isSet: st.tab === 'settings',
    goHome: () => h.go('home'), goCal: () => h.go('calendar'), goStand: () => h.go('standings'), goSet: () => h.go('settings'),
    gearBg: st.tab === 'settings' ? 'var(--rs)' : 'transparent', gearFg: st.tab === 'settings' ? 'var(--tx)' : 'var(--t3)',
    tabs: [['home', 'Home', 'home'], ['calendar', 'Calendar', 'calendar_month'], ['standings', 'Standings', 'leaderboard'], ['games', 'Games', 'sports_esports']].map(([k, l, i]) => ({
      l, i, click: () => h.go(k), color: tab === k ? 'var(--tx)' : 'var(--t3)', icolor: tab === k ? 'oklch(0.66 0.22 25)' : 'var(--t4)',
      fv: tab === k ? "'FILL' 1" : "'FILL' 0", bar: tab === k ? 'oklch(0.62 0.24 25)' : 'transparent'
    }))
  };
  if (!data) return v;
  const want = v.wantImages, pic = key => { if (!key) return ''; const x = st.images[key]; if (x === undefined) { if (!want.includes(key)) want.push(key); return ''; } return x; };

  const races = data.races, nx = nextSession(races, now), cur = nx ? nx.r : races[races.length - 1];
  const tzWord = prefs.tz === 'local' ? 'your time' : prefs.tz === 'utc' ? 'UTC' : 'track time';
  const target = nx ? (nx.live ? t1(nx.s) : t0(nx.s)) : now, cd = F.parts(target - now);
  Object.assign(v, {
    hasNext: !!nx, stripLive: !!nx && nx.live, stripIdle: !(nx && nx.live), stripFlag: cur.flag, stripRace: cur.short + ' GP',
    stripTitle: nx ? (nx.live ? nx.s.name + ' · live' : nx.s.name + ' · ' + F.dow(nx.s.start, prefs, cur) + ' ' + F.time(nx.s.start, prefs, cur)) : 'Season complete',
    stripCount: nx ? (nx.live ? cd.short + ' left' : cd.short) : '', openCur: () => h.openRace(cur.round),
    synced: F.ago(data.fetchedAt, now), offline: !!st.offline, online: !st.offline
  });

  const rows = sessionRows(cur, st, h, nx), pending = rows.filter(r => r.notDone), allOn = pending.length > 0 && pending.every(r => r.bell === 'notifications_active');
  const started = now >= t0(cur.sessions[0]);
  Object.assign(v, {
    heroFlag: cur.flag, heroRound: `Round ${cur.round} of ${races.length}`, heroSprint: cur.sprint, heroTitle: cur.name, heroMeta: cur.circuit + ' · ' + F.range(cur, prefs),
    heroLive: !!nx && nx.live, heroIdle: !(nx && nx.live), heroEyebrow: started ? 'Race weekend · day ' + (Math.floor((now - t0(cur.sessions[0])) / 864e5) + 1) : 'Next race weekend',
    cdLabel: nx ? (nx.live ? nx.s.name + ' ends in' : nx.s.name + ' starts in') : 'The season is over', cd, hasCd: !!nx,
    heroWhen: nx ? `${F.dow(nx.s.start, prefs, cur)} ${F.dayMon(nx.s.start, prefs, cur)} · ${F.time(nx.s.start, prefs, cur)} ${tzWord}` : '',
    heroAlt: nx ? F.altTime(nx.s.start, prefs, cur) : '', curRows: rows, heroTrack: trackImg(cur.circuitId, 'md', theme), hasHeroTrack: hasTrack(cur.circuitId),
    alertsLabel: allOn ? 'Alerts on' : 'Alert me', alertsFv: allOn ? "'FILL' 1" : "'FILL' 0", alertsIcon: allOn ? 'notifications_active' : 'notifications',
    toggleWeekendAlerts: () => h.weekendAlerts(cur.round, !allOn), curIcs: () => h.weekendIcs(cur.round),
    watchUrl: 'https://www.formula1.com/en/racing/' + data.season,
    tzSeg: seg([['local', 'Your time'], ['track', 'Track']], prefs.tz, k => h.setPref('tz', k)),
    tzLabel: prefs.tz === 'local' ? 'Your time · ' + F.localTz() : prefs.tz === 'utc' ? 'UTC' : 'Track time · ' + (cur.tz || 'local')
  });

  const lr = data.lastResults, lastRace = lr && races.find(r => r.round === lr.round);
  const afterFlag = !!lastRace && now - t1(lastRace.sessions[lastRace.sessions.length - 1]) < 48 * 36e5 && !started;
  const lead = data.drivers[0] ? data.drivers[0].pts : 0, clead = data.constructors[0] ? data.constructors[0].pts : 0;
  Object.assign(v, {
    hasLast: !!lastRace, afterFlag, lastName: lastRace ? lastRace.name : '', lastFlag: lastRace ? lastRace.flag : '', lastWinner: lr && lr.rows[0] ? lr.rows[0].last : '',
    lastPodium: lr ? lr.rows.slice(0, 3).map(x => ({ pos: x.pos, name: x.name, team: x.team, color: x.color, time: x.time, ...av(pic(x.url), x.code) })) : [],
    lastDnf: lr ? lr.rows.filter(x => x.out).map(x => x.last).join(', ') || 'None' : '', openLast: () => lastRace && h.openRace(lastRace.round),
    standRound: `After Round ${data.standingsRound} of ${races.length}`,
    top5: data.drivers.slice(0, 5).map((d, i) => ({ pos: d.pos, name: d.name, color: d.color, pts: d.pts, gap: i ? '−' + (lead - d.pts) : 'Leader', open: () => h.openDriver(d.id), ...av(pic(d.url), d.code) })),
    con5: data.constructors.slice(0, 5).map(c => ({ pos: c.pos, team: c.team, pts: c.pts, color: c.color, bar: Math.max(1, Math.round(c.pts / (clead || 1) * 100)) + '%', open: () => h.openTeam(c.id) })),
    consLead: data.constructors[1] ? `${data.constructors[0].team} lead by ${clead - data.constructors[1].pts}` : '',
    coming: races.filter(r => r.round > cur.round).slice(0, 4).map(r => raceRow(r, st, h)), hasComing: races.some(r => r.round > cur.round)
  });

  const done = races.filter(r => raceStatus(r, now) === 'done' && r !== cur), f = st.calFilter, starOk = r => st.starred.includes(r.circuitId);
  const pick = r => (f === 'sprint' ? r.sprint : f === 'starred' ? starOk(r) : true);
  const earlier = done.slice(0, -2), wins = {};
  earlier.forEach(r => { const w = data.winners[r.round]; if (w) wins[w.last] = (wins[w.last] || 0) + 1; });
  const doneRows = f === 'upcoming' ? [] : f === 'all' ? (st.showEarlier ? done : done.slice(-2)) : done.filter(pick);
  const upRows = races.filter(r => r.round > cur.round && pick(r));
  Object.assign(v, {
    calSeg: seg([['all', 'All'], ['upcoming', 'Upcoming'], ['sprint', 'Sprint'], ['starred', 'Starred']], f, k => h.set({ calFilter: k })),
    showEarlierRow: f === 'all' && earlier.length > 0, earlierLabel: `Rounds 1–${earlier.length}`, earlierBtn: st.showEarlier ? 'Hide' : 'Show', earlierIcon: st.showEarlier ? 'expand_less' : 'expand_more',
    earlierWins: Object.entries(wins).sort((a, b) => b[1] - a[1]).map(([n, c]) => n + ' ' + c).join(' · '), toggleEarlier: () => h.set({ showEarlier: !st.showEarlier }),
    doneRows: doneRows.map(r => raceRow(r, st, h)), upRows: upRows.map(r => raceRow(r, st, h)),
    showNext: pick(cur) && raceStatus(cur, now) !== 'done', nextRow: raceRow(cur, st, h), nextTag: started ? 'This weekend' : 'Next', nextCount: nx ? (nx.live ? nx.s.name + ' is live' : nx.s.name + ' in ' + cd.short) : '',
    calEmpty: f === 'starred' && !races.some(starOk), doneCount: races.filter(r => raceStatus(r, now) === 'done').length, toGo: races.filter(r => raceStatus(r, now) !== 'done').length, raceCount: races.length,
    ticks: races.map(r => {
      const s = raceStatus(r, now), isCur = r === cur && s !== 'done';
      return { r: r.round, open: () => h.openRace(r.round), bg: isCur ? 'oklch(0.62 0.24 25)' : s === 'done' ? 'var(--sel)' : 'transparent', bd: isCur ? 'oklch(0.62 0.24 25)' : s === 'done' ? 'var(--sel)' : 'var(--bd2)', fg: isCur ? '#ffffff' : s === 'done' ? 'var(--t3)' : 'var(--t4)', dot: r.sprint ? 'oklch(0.8 0.14 75)' : 'transparent', thin: isCur ? 'oklch(0.62 0.24 25)' : s === 'done' ? 'var(--t4)' : 'var(--trk)' };
    }),
    seasonIcs: h.seasonIcs
  });
  return deriveMore(st, h, v, { races, nx, cur, cd, tzWord, pic });
}
