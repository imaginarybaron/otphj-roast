import { pointsSince, playerInfo, r2 } from './common.js';

export function analyzeWaivers({ teams, transactions, weeks, meta, players }) {
  const teamName = new Map(teams.map((t) => [t.rosterId, t.teamName]));
  const owner = new Map(teams.map((t) => [t.rosterId, t.owner]));
  const adds = [];
  let ghosts = 0;

  for (const t of transactions) {
    if (t.status !== 'complete' || (t.type !== 'waiver' && t.type !== 'free_agent')) continue;
    const entries = Object.entries(t.adds ?? {});
    const bid = t.type === 'waiver' ? (t.settings?.waiver_bid ?? 0) / Math.max(entries.length, 1) : 0;
    for (const [pid, rid] of entries) {
      const h = pointsSince({ rosterId: rid, playerId: pid, week: t.week, weeks, lastScored: meta.lastScored });
      if (h.gamesPossible > 0 && !h.found) ghosts++;
      const p = playerInfo(players, pid);
      adds.push({
        txId: t.transaction_id, week: t.week, type: t.type, rosterId: rid, team: teamName.get(rid), owner: owner.get(rid),
        player: p.name, pos: p.pos, nfl: p.nfl, bid,
        startedPts: h.startedPts, rosteredPts: h.rosteredPts, weeksHeld: h.weeksHeld, startedWeeks: h.startedWeeks,
        gamesPossible: h.gamesPossible,
        ptsPerDollar: bid > 0 && h.gamesPossible > 0 ? r2(h.startedPts / bid) : null,
      });
    }
  }

  const failed = transactions.filter((t) => t.type === 'waiver' && t.status === 'failed').map((t) => ({
    week: t.week, rosterId: t.roster_ids?.[0], team: teamName.get(t.roster_ids?.[0]), bid: t.settings?.waiver_bid ?? 0,
    players: Object.keys(t.adds ?? {}).map((id) => playerInfo(players, id).name),
  }));

  const scored = adds.filter((a) => a.gamesPossible > 0);
  const paid = scored.filter((a) => a.bid > 0);
  const top = (arr, n) => arr.slice(0, n);
  const byPts = [...scored].sort((a, b) => b.startedPts - a.startedPts);
  const bestValue = [...paid].sort((a, b) => b.ptsPerDollar - a.ptsPerDollar);
  const whiffPool = paid.filter((a) => a.bid >= 5);
  const whiffs = [...(whiffPool.length >= 5 ? whiffPool : paid)].sort((a, b) => a.ptsPerDollar - b.ptsPerDollar || b.bid - a.bid);

  const teamRows = teams.map((t) => {
    const mine = adds.filter((a) => a.rosterId === t.rosterId);
    const myPaid = mine.filter((a) => a.bid > 0 && a.gamesPossible > 0);
    const spent = mine.reduce((s, a) => s + a.bid, 0);
    const paidSpent = myPaid.reduce((s, a) => s + a.bid, 0);
    const paidPts = myPaid.reduce((s, a) => s + a.startedPts, 0);
    const myFailed = failed.filter((f) => f.rosterId === t.rosterId);
    return {
      rosterId: t.rosterId, team: t.teamName, owner: t.owner,
      claims: mine.filter((a) => a.type === 'waiver').length,
      freeAgentAdds: mine.filter((a) => a.type === 'free_agent').length,
      spent, budgetLeft: 100 - t.faabUsed, sleeperUsed: t.faabUsed,
      paidPts: r2(paidPts), paidSpent,
      ptsPerDollar: paidSpent > 0 ? r2(paidPts / paidSpent) : null,
      freeAgentPts: r2(mine.filter((a) => a.bid === 0).reduce((s, a) => s + a.startedPts, 0)),
      totalAddedPts: r2(mine.reduce((s, a) => s + a.startedPts, 0)),
      failedClaims: myFailed.length,
      biggestFailedBid: myFailed.reduce((m, f) => Math.max(m, f.bid), 0),
      bestAdd: [...mine].sort((a, b) => b.startedPts - a.startedPts)[0] ?? null,
      worstWhiff: [...myPaid].sort((a, b) => a.ptsPerDollar - b.ptsPerDollar || b.bid - a.bid)[0] ?? null,
    };
  });
  const ranked = teamRows.filter((r) => r.ptsPerDollar != null).sort((a, b) => b.ptsPerDollar - a.ptsPerDollar);
  ranked.forEach((r, i) => { r.efficiencyRank = i + 1; r.efficiencyOf = ranked.length; });
  teamRows.sort((a, b) => b.spent - a.spent);

  return {
    totals: { adds: adds.length, paid: paid.length, faab: adds.reduce((s, a) => s + a.bid, 0), failedClaims: failed.length },
    ghosts,
    bestPickups: top(byPts, 10),
    bestValue: top(bestValue, 10),
    worstWhiffs: top(whiffs, 10),
    biggestSpenders: top([...paid].sort((a, b) => b.bid - a.bid), 5),
    teams: teamRows,
    failedTopBids: top([...failed].sort((a, b) => b.bid - a.bid), 5),
  };
}
