import { pointsSince, playerInfo, r2 } from './common.js';

const MARGIN = 5; // started-points gap below which a trade is "too close to call"

export function analyzeTrades({ teams, transactions, weeks, meta, players }) {
  const teamName = new Map(teams.map((t) => [t.rosterId, t.teamName]));
  const owner = new Map(teams.map((t) => [t.rosterId, t.owner]));
  const trades = [];
  const picks = [];

  for (const t of transactions.filter((x) => x.type === 'trade' && x.status === 'complete')) {
    const sides = (t.roster_ids ?? []).map((rid) => {
      const received = Object.entries(t.adds ?? {}).filter(([, r]) => r === rid).map(([pid]) => {
        const h = pointsSince({ rosterId: rid, playerId: pid, week: t.week, weeks, lastScored: meta.lastScored });
        return { ...playerInfo(players, pid), startedPts: h.startedPts, rosteredPts: h.rosteredPts, weeksHeld: h.weeksHeld };
      });
      const sent = Object.entries(t.drops ?? {}).filter(([, r]) => r === rid).map(([pid]) => playerInfo(players, pid));
      const picksIn = (t.draft_picks ?? []).filter((p) => p.owner_id === rid).map(fmtPick);
      const picksOut = (t.draft_picks ?? []).filter((p) => p.previous_owner_id === rid).map(fmtPick);
      const faabIn = (t.waiver_budget ?? []).filter((b) => b.receiver === rid).reduce((s, b) => s + b.amount, 0);
      const faabOut = (t.waiver_budget ?? []).filter((b) => b.sender === rid).reduce((s, b) => s + b.amount, 0);
      return {
        rosterId: rid, team: teamName.get(rid), owner: owner.get(rid), received, sent, picksIn, picksOut, faabIn, faabOut,
        startedPts: r2(received.reduce((s, p) => s + p.startedPts, 0)),
        rosteredPts: r2(received.reduce((s, p) => s + p.rosteredPts, 0)),
      };
    });
    const gamesAfter = Math.max(0, meta.lastScored - t.week + 1);
    sides.sort((a, b) => b.startedPts - a.startedPts);
    const gap = sides.length >= 2 ? r2(sides[0].startedPts - sides[sides.length - 1].startedPts) : 0;
    let verdict = 'decided';
    if (gamesAfter === 0) verdict = 'too-early';
    else if (gap < MARGIN) verdict = 'too-close';
    trades.push({
      txId: t.transaction_id, week: t.week, date: t.status_updated ? new Date(t.status_updated).toISOString().slice(0, 10) : null,
      gamesAfter, verdict, gap,
      winner: verdict === 'decided' ? sides[0].team : null, loser: verdict === 'decided' ? sides[sides.length - 1].team : null,
      winnerRosterId: verdict === 'decided' ? sides[0].rosterId : null, loserRosterId: verdict === 'decided' ? sides[sides.length - 1].rosterId : null,
      sides,
    });
    for (const p of t.draft_picks ?? []) {
      picks.push({ week: t.week, ...fmtPick(p), from: teamName.get(p.previous_owner_id), to: teamName.get(p.owner_id) });
    }
  }
  trades.sort((a, b) => b.week - a.week);
  return { count: trades.length, trades, tradedPicks: picks };
}

function fmtPick(p) {
  return { season: p.season, round: p.round, label: `${p.season} round ${p.round}` };
}
