import { mean, r2, lastRegWeek } from './common.js';

/** Rest-of-season schedule difficulty = average power score of remaining opponents. */
export function analyzeSchedule({ league, weeks, meta, power }) {
  const lastReg = lastRegWeek(league);
  const byId = new Map(power.rankings.map((r) => [r.rosterId, r]));
  const remainingWeeks = meta.matchupWeeks.filter((w) => w > meta.lastScored && w <= lastReg);

  const rows = power.rankings.map((me) => {
    const games = [];
    for (const wk of remainingWeeks) {
      const mine = weeks[wk]?.find((m) => m.roster_id === me.rosterId);
      const opp = mine && mine.matchup_id != null ? weeks[wk].find((m) => m !== mine && m.matchup_id === mine.matchup_id) : null;
      if (!opp) continue;
      const o = byId.get(opp.roster_id);
      games.push({ week: wk, opp: o.team, oppRosterId: o.rosterId, oppRank: o.rank, oppPower: o.power, oppPpg: o.ppg });
    }
    return {
      rosterId: me.rosterId, team: me.team, owner: me.owner, rank: me.rank, record: me.record,
      gamesLeft: games.length,
      avgOppPower: r2(mean(games.map((g) => g.oppPower)), 1),
      avgOppPpg: r2(mean(games.map((g) => g.oppPpg)), 1),
      avgOppRank: r2(mean(games.map((g) => g.oppRank)), 1),
      toughest: games.length ? games.reduce((m, g) => (g.oppPower > m.oppPower ? g : m)) : null,
      easiest: games.length ? games.reduce((m, g) => (g.oppPower < m.oppPower ? g : m)) : null,
      games,
    };
  });
  rows.sort((a, b) => a.avgOppPower - b.avgOppPower);
  // 1 = easiest. Teams with identical remaining opponents (this league schedules in "twin" pairs) tie.
  rows.forEach((r, i) => { r.sosRank = i > 0 && r.avgOppPower === rows[i - 1].avgOppPower ? rows[i - 1].sosRank : i + 1; });
  return { remainingWeeks, lastRegWeek: lastReg, rows, easiest: rows.slice(0, 3), toughest: rows.slice(-3).reverse() };
}
