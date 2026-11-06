import { mean, stdev, r2, playedWeeks } from './common.js';

const RECENT = 3;
const W = { pf: 0.35, allPlay: 0.4, form: 0.25 };

function tally(teams, weeks, weekList) {
  const s = new Map(teams.map((t) => [t.rosterId, {
    rosterId: t.rosterId, scores: [], pa: 0, w: 0, l: 0, t: 0, apW: 0, apL: 0, apT: 0, topWeeks: 0, bottomWeeks: 0, weekly: [],
  }]));
  for (const wk of weekList) {
    const ms = weeks[wk];
    const hi = Math.max(...ms.map((m) => m.score));
    const lo = Math.min(...ms.map((m) => m.score));
    for (const a of ms) {
      const x = s.get(a.roster_id);
      x.scores.push(a.score);
      if (a.score === hi) x.topWeeks++;
      if (a.score === lo) x.bottomWeeks++;
      for (const b of ms) {
        if (b === a) continue;
        if (a.score > b.score) x.apW++; else if (a.score < b.score) x.apL++; else x.apT++;
      }
      const opp = a.matchup_id == null ? null : ms.find((b) => b !== a && b.matchup_id === a.matchup_id);
      let result = null;
      if (opp) {
        x.pa += opp.score;
        result = a.score > opp.score ? 'W' : a.score < opp.score ? 'L' : 'T';
        if (result === 'W') x.w++; else if (result === 'L') x.l++; else x.t++;
      }
      x.weekly.push({ week: wk, score: a.score, opp: opp?.roster_id ?? null, oppScore: opp?.score ?? null, result });
    }
  }
  return s;
}

const norm = (vals) => {
  const lo = Math.min(...vals), hi = Math.max(...vals);
  return vals.map((v) => (hi === lo ? 0.5 : (v - lo) / (hi - lo)));
};

function rate(teams, weeks, weekList) {
  const s = tally(teams, weeks, weekList);
  const rows = teams.map((t) => {
    const x = s.get(t.rosterId);
    const games = x.scores.length;
    const apGames = x.apW + x.apL + x.apT;
    return {
      rosterId: t.rosterId, ...x, games,
      pf: x.scores.reduce((a, b) => a + b, 0),
      ppg: mean(x.scores),
      apPct: apGames ? (x.apW + 0.5 * x.apT) / apGames : 0,
      form: mean(x.scores.slice(-RECENT)),
    };
  });
  const nPpg = norm(rows.map((r) => r.ppg));
  const nAp = norm(rows.map((r) => r.apPct));
  const nForm = norm(rows.map((r) => r.form));
  rows.forEach((r, i) => { r.power = 100 * (W.pf * nPpg[i] + W.allPlay * nAp[i] + W.form * nForm[i]); });
  rows.sort((a, b) => b.power - a.power);
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

export function analyzePower({ teams, weeks, meta }) {
  const played = playedWeeks(meta);
  const now = rate(teams, weeks, played);
  const prev = played.length > 1 ? new Map(rate(teams, weeks, played.slice(0, -1)).map((r) => [r.rosterId, r.rank])) : new Map();
  const byId = new Map(teams.map((t) => [t.rosterId, t]));
  const sd = now.map((r) => stdev(r.scores));
  const sdSorted = [...sd].sort((a, b) => b - a);

  const rows = now.map((r, i) => {
    const t = byId.get(r.rosterId);
    const apGames = r.apW + r.apL + r.apT;
    const expectedWins = r.apPct * r.games;
    const actual = r.w + 0.5 * r.t;
    const best = r.weekly.reduce((m, x) => (x.score > m.score ? x : m));
    const worst = r.weekly.reduce((m, x) => (x.score < m.score ? x : m));
    return {
      rank: r.rank,
      prevRank: prev.get(r.rosterId) ?? null,
      movement: prev.has(r.rosterId) ? prev.get(r.rosterId) - r.rank : 0,
      rosterId: r.rosterId, team: t.teamName, owner: t.owner, division: t.division,
      record: `${r.w}-${r.l}${r.t ? '-' + r.t : ''}`,
      wins: r.w, losses: r.l, ties: r.t, games: r.games,
      pf: r2(r.pf), pa: r2(r.pa), ppg: r2(r.ppg), form: r2(r.form), formDelta: r2(r.form - r.ppg),
      allPlay: `${r.apW}-${r.apL}${r.apT ? '-' + r.apT : ''}`, allPlayPct: r2(r.apPct * 100, 1),
      power: r2(r.power, 1),
      expectedWins: r2(expectedWins), luck: r2(actual - expectedWins),
      stdev: r2(sd[i]), volatilityRank: sdSorted.indexOf(sd[i]) + 1,
      bestWeek: { week: best.week, score: r2(best.score) }, worstWeek: { week: worst.week, score: r2(worst.score) },
      topWeeks: r.topWeeks, bottomWeeks: r.bottomWeeks,
      weekly: r.weekly.map((x) => ({ ...x, score: r2(x.score), oppScore: r2(x.oppScore) })),
    };
  });

  const byLuck = [...rows].sort((a, b) => b.luck - a.luck);
  return {
    weights: W, recentWeeks: RECENT, weeksPlayed: played.length,
    rankings: rows,
    luckiest: byLuck.slice(0, 3),
    unluckiest: byLuck.slice(-3).reverse(),
  };
}
