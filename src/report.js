import { loadLeague } from './load.js';

const data = await loadLeague();
const { league, state, teams, weeks, transactions, tradedPicks, players, meta } = data;
const surprises = [];
const h = (t) => console.log(`\n=== ${t} ===`);
const f = (n) => n.toFixed(2);
const pname = (id) => players[id] ? `${players[id].first_name} ${players[id].last_name}` : `#${id}`;

console.log(`OTPHJ validation report  (fetched ${meta.fetchedAt})`);
console.log(`League: ${league.name} | season ${league.season} | status ${league.status}`);

// 1. Teams
h('1. TEAMS (roster_id -> owner, division)');
console.table(
  [...teams].sort((a, b) => a.division.localeCompare(b.division) || a.rosterId - b.rosterId).map((t) => ({
    roster: t.rosterId, team: t.teamName, owner: t.owner ?? '(NONE)', division: t.division,
    ...(t.coOwners.length ? { coOwners: t.coOwners.join(',') } : {}),
  })),
);
const perDiv = {};
for (const t of teams) perDiv[t.division] = (perDiv[t.division] ?? 0) + 1;
console.log('Teams per division:', JSON.stringify(perDiv));
if (teams.some((t) => !t.owner)) surprises.push('Some rosters have no owner mapped.');
const names = teams.map((t) => t.teamName);
if (new Set(names).size !== names.length) surprises.push('Duplicate team names.');
const noCustom = teams.filter((t) => !t.hasCustomName).map((t) => t.owner);
if (noCustom.length) surprises.push(`No custom team name set (using "Team <owner>"): ${noCustom.join(', ')}`);
if (Object.values(perDiv).some((n) => n !== 4)) surprises.push('Divisions are not 4 teams each.');

// 2. Standings + cross-checks
h('2. STANDINGS');
const played = meta.matchupWeeks.filter((w) => w <= meta.lastScored);
const calc = new Map(teams.map((t) => [t.rosterId, { pf: 0, pa: 0, w: 0, l: 0, t: 0 }]));
for (const w of played) {
  const byId = new Map();
  for (const m of weeks[w]) {
    if (m.matchup_id == null) continue;
    (byId.get(m.matchup_id) ?? byId.set(m.matchup_id, []).get(m.matchup_id)).push(m);
  }
  for (const pair of byId.values()) {
    if (pair.length !== 2) continue;
    const [a, b] = pair;
    for (const [x, y] of [[a, b], [b, a]]) {
      const c = calc.get(x.roster_id);
      c.pf += x.score; c.pa += y.score;
      if (x.score > y.score) c.w++; else if (x.score < y.score) c.l++; else c.t++;
    }
  }
}
const rows = [...teams].sort((a, b) => b.wins - a.wins || b.pf - a.pf).map((t) => {
  const c = calc.get(t.rosterId);
  const ok = Math.abs(c.pf - t.pf) < 0.05 && Math.abs(c.pa - t.pa) < 0.05 && c.w === t.wins && c.l === t.losses;
  if (!ok) surprises.push(`Roster ${t.rosterId} ${t.teamName}: Sleeper says ${t.wins}-${t.losses} PF ${f(t.pf)} PA ${f(t.pa)}; matchups sum to ${c.w}-${c.l} PF ${f(c.pf)} PA ${f(c.pa)}.`);
  return { team: t.teamName, record: `${t.wins}-${t.losses}${t.ties ? '-' + t.ties : ''}`, PF: f(t.pf), PA: f(t.pa), div: t.division, 'matchups agree': ok ? 'yes' : 'NO' };
});
console.table(rows);

// 3. Weeks
h('3. WEEKS');
console.log(`NFL state: week ${state.week}, season_type ${state.season_type}. Last scored week: ${meta.lastScored}. Completed weeks: ${played.length}.`);
const cur = weeks[state.week];
if (cur) {
  const nonZero = cur.filter((m) => m.score > 0).length;
  console.log(`Current week ${state.week}: ${nonZero}/${cur.length} teams have a non-zero score (${nonZero ? 'in progress / partially scored' : 'not started'}).`);
}

// 4. Future schedule
h('4. REMAINING SCHEDULE AVAILABILITY');
const lastReg = (league.settings.playoff_week_start || 15) - 1;
for (const w of meta.matchupWeeks) {
  if (w <= meta.lastScored) continue;
  const ms = weeks[w] ?? [];
  const counts = new Map();
  for (const m of ms) if (m.matchup_id != null) counts.set(m.matchup_id, (counts.get(m.matchup_id) ?? 0) + 1);
  const good = [...counts.values()].filter((c) => c === 2).length;
  const tag = w > lastReg ? 'playoffs' : 'regular season';
  const ok = good === 8;
  console.log(`  Week ${w} (${tag}): ${ms.length} entries, ${good} complete pairings ${ok ? 'OK' : w > lastReg ? '(expected: bracket not set)' : '<-- MISSING'}`);
  if (!ok && w <= lastReg) surprises.push(`Regular-season week ${w} lacks full pairings; schedule analysis will be incomplete.`);
}

// 5. Transactions
h('5. TRANSACTIONS');
const tally = {};
let faab = 0;
for (const t of transactions) {
  const k = `${t.type}/${t.status}`;
  tally[k] = (tally[k] ?? 0) + 1;
  if (t.type === 'waiver' && t.status === 'complete') faab += t.settings?.waiver_bid ?? 0;
}
console.table(Object.entries(tally).sort().map(([k, n]) => ({ 'type/status': k, count: n })));
console.log(`Total FAAB spent on successful waiver claims: $${faab}`);
const trades = transactions.filter((t) => t.type === 'trade' && t.status === 'complete');
const withPicks = trades.filter((t) => t.draft_picks?.length).length;
const withFaab = trades.filter((t) => t.waiver_budget?.length).length;
console.log(`Completed trades: ${trades.length} (${withPicks} include picks, ${withFaab} include FAAB)`);
const zeroBidFA = transactions.filter((t) => t.type === 'waiver' && t.status === 'complete' && !(t.settings?.waiver_bid > 0)).length;
console.log(`Waiver adds with $0 bid: ${zeroBidFA}`);
const failed = transactions.filter((t) => t.status === 'failed').length;
if (failed) surprises.push(`${failed} failed transactions (lost waiver claims etc.) are present: roast material, but exclude them from pickup valuation.`);
const outsiders = transactions.filter((t) => t.status === 'complete' && Object.keys(t.adds ?? {}).length === 0 && Object.keys(t.drops ?? {}).length === 0 && t.type !== 'trade').length;
if (outsiders) surprises.push(`${outsiders} completed non-trade transactions have no adds/drops.`);

// 6. Per-player points
h('6. PER-PLAYER POINTS');
let tw = 0, withPP = 0, sumOk = 0, benchGap = 0, customUsed = 0;
for (const w of played) {
  for (const m of weeks[w]) {
    tw++;
    if (m.custom_points != null) customUsed++;
    if (m.players_points && Object.keys(m.players_points).length) {
      withPP++;
      const startSum = (m.starters ?? []).reduce((s, id) => s + (m.players_points[id] ?? 0), 0);
      if (Math.abs(startSum - (m.points ?? 0)) < 0.05) sumOk++;
      else if (benchGap++ < 3) console.log(`  mismatch wk${w} roster ${m.roster_id}: starters sum ${f(startSum)} vs points ${f(m.points ?? 0)}`);
    }
  }
}
console.log(`Team-weeks with players_points: ${withPP}/${tw}`);
console.log(`Starters' players_points sum == team points: ${sumOk}/${withPP}`);
console.log(`Team-weeks with custom_points override: ${customUsed}`);
if (withPP < tw) surprises.push(`players_points missing for ${tw - withPP} team-weeks.`);
if (sumOk < withPP) surprises.push(`Starter points don't sum to team points in ${withPP - sumOk} team-weeks (check how to value players).`);
if (customUsed) surprises.push(`${customUsed} team-weeks use custom_points overrides.`);
const sample = weeks[played[0]]?.find((m) => m.players_points);
if (sample) {
  const top = Object.entries(sample.players_points).sort((a, b) => b[1] - a[1]).slice(0, 3);
  console.log(`Sample (wk${played[0]}, roster ${sample.roster_id}) top players: ${top.map(([id, p]) => `${pname(id)} ${p}`).join(', ')}`);
}

// 7. Traded picks
h('7. TRADED PICKS');
const bySeason = {};
for (const p of tradedPicks) bySeason[p.season] = (bySeason[p.season] ?? 0) + 1;
console.log(`Total traded picks: ${tradedPicks.length}`, JSON.stringify(bySeason));
if (transactions.some((t) => t.draft_picks?.length) && tradedPicks.length === 0) surprises.push('Trades include picks but /traded_picks is empty.');

// 8. Surprises
h('8. SURPRISES / GAPS');
const known = [
  'Transactions give no "drop week" pairing: valuing a pickup needs roster-ownership timelines built from adds/drops/trades.',
  'players_points only covers players rostered on that team that week, so a dropped player\'s later points are invisible unless picked up elsewhere. Whiff analysis is limited.',
  'Pick value is not modeled (listing only, per spec).',
];
[...surprises, ...known].forEach((s, i) => console.log(`${i + 1}. ${s}`));
console.log('\nReport complete.');
