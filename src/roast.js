// Roast copy: template banks filled with stats. Deterministic per team/category/week,
// so a page doesn't reshuffle jokes when rebuilt with the same data.
// Rule: roast the fantasy decisions, never team names or the people themselves.

function rng(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = (h ^= h >>> 16) >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const f1 = (n) => Number(n).toFixed(1);
const money = (n) => `$${n}`;

export function buildRoast({ power, schedule, waivers, trades, tiers, meta }) {
  const week = meta.lastScored;
  const pick = (key, arr, ...args) => arr[Math.floor(rng(`${key}:${week}`)() * arr.length)](...args);
  const P = power.rankings;
  const n = P.length;
  const wTeam = new Map(waivers.teams.map((t) => [t.rosterId, t]));
  const sTeam = new Map(schedule.rows.map((t) => [t.rosterId, t]));

  // ---------- per-team ----------
  const teamLines = {};
  for (const t of P) {
    const lines = [];
    const o = t.owner;
    const add = (tag, text) => lines.push({ tag, text });

    // power
    if (t.rank <= 3) add('power', pick(`pw${t.rosterId}`, [
      (t) => `Ranked ${ord(t.rank)} in the power rankings. ${t.owner} is playing on easy mode and the rest of the league can see it from space.`,
      (t) => `${ord(t.rank)} in power, ${t.power}/100. Insufferable. Please lose a game so we can enjoy it.`,
      (t) => `${f1(t.ppg)} points a week and an all-play record of ${t.allPlay}. ${t.owner} will bring this up at every opportunity.`,
    ], t));
    else if (t.rank <= 8) add('power', pick(`pw${t.rosterId}`, [
      (t) => `${ord(t.rank)} in the power rankings: good enough to feel important, not good enough to scare anyone.`,
      (t) => `Upper-middle class of the league at ${ord(t.rank)}. Nobody's afraid of ${t.team}, but nobody's laughing either. Yet.`,
      (t) => `${ord(t.rank)} overall. The fantasy equivalent of a participation trophy with a little gold sticker.`,
    ], t));
    else if (t.rank <= 13) add('power', pick(`pw${t.rosterId}`, [
      (t) => `${ord(t.rank)} in the power rankings. ${t.owner} has found the exact center of mediocrity and built a house there.`,
      (t) => `All-play record of ${t.allPlay}. That's less "contender" and more "strong opinions in the group chat."`,
      (t) => `${ord(t.rank)} of ${n}. The roster looks fine on paper, which is also what people say about gas station sushi.`,
    ], t));
    else add('power', pick(`pw${t.rosterId}`, [
      (t) => `${ord(t.rank)} out of ${n} in power. ${t.owner} is out here doing the league a service by being the floor.`,
      (t) => `${f1(t.ppg)} points a week. Some benches score more than that. Okay, not really, but it's funnier to say.`,
      (t) => `All-play record of ${t.allPlay}. Against every other team, every week, ${t.team} mostly just... loses. Impressive consistency.`,
    ], t));

    // luck
    if (t.luck >= 1) add('luck', pick(`lk${t.rosterId}`, [
      (t) => `Sitting at ${t.record} when the all-play record says ${f1(t.expectedWins)} wins. That's +${f1(t.luck)} wins of pure schedule luck. ${t.owner} is winning on vibes.`,
      (t) => `Lucky by ${f1(t.luck)} wins. If this were a casino, security would've walked ${t.owner} out already.`,
    ], t));
    else if (t.luck <= -1) add('luck', pick(`lk${t.rosterId}`, [
      (t) => `Should have ${f1(t.expectedWins)} wins, actually has ${t.wins}. That's ${f1(Math.abs(t.luck))} wins stolen by the schedule. The matchup gods personally hate ${t.owner}.`,
      (t) => `Unlucky by ${f1(Math.abs(t.luck))} wins. Every week ${t.owner} scores a normal amount of points and every week the opponent has a career day.`,
    ], t));
    else add('luck', pick(`lk${t.rosterId}`, [
      (t) => `Luck-neutral (${t.luck >= 0 ? '+' : ''}${f1(t.luck)} wins). The record is honest. No excuses, no sympathy.`,
      (t) => `Record matches the all-play almost exactly. ${t.owner} is exactly as good as this looks. Sorry.`,
    ], t));

    // form / chaos
    if (t.formDelta >= 10) add('form', `Last 3 weeks: ${f1(t.form)} a game, ${f1(t.formDelta)} above the season average. Hot streak. The league is begging it to cool off.`);
    else if (t.formDelta <= -10) add('form', `Last 3 weeks: ${f1(t.form)} a game, ${f1(Math.abs(t.formDelta))} below the season average. Something is broken and it's probably the lineup setter.`);
    else if (t.volatilityRank <= 3) add('form', `Boom-or-bust: best week ${f1(t.bestWeek.score)} (Wk ${t.bestWeek.week}), worst ${f1(t.worstWeek.score)} (Wk ${t.worstWeek.week}). A ${f1(t.bestWeek.score - t.worstWeek.score)}-point mood swing.`);
    else if (t.topWeeks >= 2) add('form', `Top scorer of the week ${t.topWeeks} times. ${t.owner} has shown the league what could be, and is therefore unbearable.`);
    else if (t.bottomWeeks >= 2) add('form', `Lowest score of the week ${t.bottomWeeks} times. A bottom-of-the-barrel specialist.`);

    // waivers
    const w = wTeam.get(t.rosterId);
    if (w) {
      if (w.spent === 0) add('waivers', `Has spent ${money(0)} of the ${money(100)} FAAB budget. Hoarding it like a dragon on a pile of gold it'll never use.`);
      else if (w.efficiencyRank && w.efficiencyRank > w.efficiencyOf - 3) add('waivers', pick(`wv${t.rosterId}`, [
        (w) => `Spent ${money(w.spent)} on waivers for ${f1(w.paidPts)} started points. That's ${money(w.paidPts > 0 ? f1(w.paidSpent / w.paidPts) : w.paidSpent)} a point. Set the money on fire, at least it'd keep someone warm.`,
        (w) => `FAAB efficiency: ${ord(w.efficiencyRank)} of ${w.efficiencyOf}. ${money(w.paidSpent)} spent, ${f1(w.paidPts)} points back. The waiver wire has a new favorite customer.`,
      ], w));
      else if (w.efficiencyRank && w.efficiencyRank <= 3) add('waivers', `${money(w.paidSpent)} of FAAB turned into ${f1(w.paidPts)} started points (${ord(w.efficiencyRank)} best in the league). Annoyingly good at this.`);
      else if (w.worstWhiff && w.worstWhiff.bid >= 10) add('waivers', `Biggest swing-and-miss: ${money(w.worstWhiff.bid)} on ${w.worstWhiff.player} for ${f1(w.worstWhiff.startedPts)} started points.`);
      if (w.failedClaims >= 8) add('waivers', `${w.failedClaims} failed waiver claims. Most-rejected person on the app, and that includes dating.`);
    }

    // trades
    const myTrades = trades.trades.filter((tr) => tr.sides.some((s) => s.rosterId === t.rosterId));
    for (const tr of myTrades) {
      if (tr.verdict === 'decided' && tr.winnerRosterId === t.rosterId) add('trades', `Won the Wk ${tr.week} trade by ${f1(tr.gap)} started points. Robbed someone and has the receipt.`);
      else if (tr.verdict === 'decided') add('trades', `Lost the Wk ${tr.week} trade by ${f1(tr.gap)} started points. Somebody check on ${t.owner}'s judgment.`);
      else if (tr.verdict === 'too-close') add('trades', `The Wk ${tr.week} trade is a wash (${f1(tr.gap)} point difference). Two teams spent a week negotiating to get nothing done.`);
    }
    teamLines[t.rosterId] = lines;
  }

  // ---------- per-category ----------
  const cat = {};
  const top = P[0], bot = P[n - 1];
  const riser = [...P].sort((a, b) => b.movement - a.movement)[0];
  const faller = [...P].sort((a, b) => a.movement - b.movement)[0];
  cat.power = [
    { title: 'King of the hill', text: pick('c-top', [
      (t) => `${t.team} is #1 with a power score of ${t.power}. ${t.owner} has been insufferable for weeks and the numbers say it's deserved. Boo.`,
      (t) => `${t.team} leads the way at ${f1(t.ppg)} a game. Everyone else is playing for second.`,
    ], top) },
    { title: 'Basement dweller', text: pick('c-bot', [
      (t) => `${t.team} anchors the league at ${f1(t.ppg)} a game. ${t.owner} is a public service to everyone else's confidence.`,
      (t) => `Dead last in power: ${t.team}. The good news is it can't get any worse. The bad news is that's what they said last week.`,
    ], bot) },
  ];
  if (riser.movement > 0) cat.power.push({ title: 'Biggest riser', text: `${riser.team} climbed ${riser.movement} spots to ${ord(riser.rank)}. Must have finally read the waiver wire.` });
  if (faller.movement < 0) cat.power.push({ title: 'Biggest faller', text: `${faller.team} dropped ${Math.abs(faller.movement)} spots to ${ord(faller.rank)}. Gravity is undefeated.` });

  const [lk1] = power.luckiest, [ul1] = power.unluckiest;
  cat.luck = [
    { title: 'Luckiest team', text: `${lk1.team} is ${lk1.record} but "should" be about ${f1(lk1.expectedWins)} wins. That's +${f1(lk1.luck)} wins from the schedule fairy. Go buy a lottery ticket, ${lk1.owner}.` },
    { title: 'Unluckiest team', text: `${ul1.team} is ${ul1.record} but the all-play record says ${f1(ul1.expectedWins)} wins. ${f1(Math.abs(ul1.luck))} wins stolen. ${ul1.owner} should file a police report.` },
  ];

  const easy = schedule.rows[0], hard = schedule.rows[schedule.rows.length - 1];
  cat.schedule = [
    { title: 'Cupcake schedule', text: `${easy.team} faces an average opponent power of ${easy.avgOppPower} the rest of the way. ${easy.owner}, you've been handed the answers to the test.` },
    { title: 'Gauntlet', text: `${hard.team} gets an average opponent power of ${hard.avgOppPower}. Every week is a boss fight. ${hard.owner}, we'll light a candle.` },
  ];

  const bp = waivers.bestPickups[0], bv = waivers.bestValue[0], wf = waivers.worstWhiffs[0], sp = waivers.biggestSpenders[0];
  cat.waivers = [];
  if (bp) cat.waivers.push({ title: 'Best pickup', text: `${bp.team} grabbed ${bp.player} in Week ${bp.week} (${bp.bid ? money(bp.bid) : 'free'}) and got ${f1(bp.startedPts)} started points out of him. Highway robbery.` });
  if (bv) cat.waivers.push({ title: 'Best bang for the buck', text: `${bv.player} for ${money(bv.bid)} gave ${bv.team} ${f1(bv.ptsPerDollar)} points per dollar. Somebody tell Wall Street.` });
  if (wf) cat.waivers.push({ title: 'Worst whiff', text: `${wf.team} blew ${money(wf.bid)} on ${wf.player} and got ${f1(wf.startedPts)} started points. ${wf.weeksHeld === 0 ? 'He was cut before he ever played a snap. ' : ''}A truly elite waste of resources.` });
  if (sp && sp !== bv) cat.waivers.push({ title: 'Biggest single bid', text: `${money(sp.bid)} on ${sp.player} from ${sp.team}. He's returned ${f1(sp.startedPts)} started points (${sp.ptsPerDollar} per dollar).` });

  cat.trades = trades.trades.length
    ? trades.trades.map((tr) => {
      const [a, b] = tr.sides;
      const txt = tr.verdict === 'decided'
        ? `${tr.winner} fleeced ${tr.loser} by ${f1(tr.gap)} started points. ${tr.sides[0].received.map((p) => p.name).join(', ')} > ${tr.sides[1].received.map((p) => p.name).join(', ')}.`
        : tr.verdict === 'too-close' ? `${a.team} and ${b.team} traded and it came out basically even (${f1(tr.gap)} points). Congrats on the paperwork.`
          : `${a.team} and ${b.team} just traded. Verdict pending until someone actually plays.`;
      return { title: `Week ${tr.week} trade`, text: txt };
    })
    : [{ title: 'Trade market', text: 'No trades yet. This league is a bunch of cowards holding assets like a family heirloom.' }];
  if (trades.count && trades.count <= 3) cat.trades.push({ title: 'Trade volume', text: `${trades.count} trades in ${week} weeks across 16 teams. The trade deadline is Week 13. Dust off your courage.` });

  // ---------- tier captions ----------
  const tierBanks = {
    S: [
      (k) => `${k} ${k === 1 ? 'team lives' : 'teams live'} up here. The rest of the league is playing for second place and everyone knows it.`,
      (k) => `The penthouse. ${k} ${k === 1 ? 'team has' : 'teams have'} been making the other tiers feel bad on purpose.`,
    ],
    A: [
      (k) => `Real contenders (${k}). Good enough to scare people, not quite good enough to be insufferable. Give it time.`,
      (k) => `${k} ${k === 1 ? 'team' : 'teams'} that would be favorites in any other league. Unfortunately for them, this is this league.`,
    ],
    B: [
      (k) => `The "we're fine, we're totally fine" tier (${k}). Playoff teams on paper, first-round exits in spirit.`,
      (k) => `${k} ${k === 1 ? 'team' : 'teams'} good enough to feel important and not good enough to matter.`,
    ],
    C: [
      (k) => `${k} ${k === 1 ? 'team' : 'teams'} stuck in the middle. Not good, not bad, just here. The league's beige.`,
      (k) => `The big middle. ${k} ${k === 1 ? 'team' : 'teams'} with strong opinions in the group chat and the results of a coin flip.`,
    ],
    D: [
      (k) => `${k} ${k === 1 ? 'team' : 'teams'} whose roster looked great in August. A lot can change in eight weeks. Mostly the standings.`,
      (k) => `Frauds (${k}). The trash talk is still elite. The scoreboard has not been consulted.`,
    ],
    F: [
      (k) => `Welcome to the basement. ${k} ${k === 1 ? 'team' : 'teams'} here, and the view from the top is only a rumor.`,
      (k) => `The floor. ${k === 1 ? 'One team is' : `${k} teams are`} holding the league up by being under it.`,
    ],
  };
  const tierCaptions = {};
  for (const tr of tiers.tiers) {
    tierCaptions[tr.tier] = tr.teams.length
      ? pick(`tier-${tr.tier}`, tierBanks[tr.tier], tr.teams.length)
      : { S: 'Nobody. Not one of you.', A: 'Empty. The league has no real contenders.', B: 'Empty. Everyone is either great or a disaster.', C: 'Empty. No middle class in this league.', D: 'Empty. Nobody is quite bad enough yet.', F: 'Empty. Somehow nobody is truly terrible.' }[tr.tier];
  }
  cat.tiers = tierCaptions;

  return { teams: teamLines, categories: cat };
}
