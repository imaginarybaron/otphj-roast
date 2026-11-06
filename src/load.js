import { LEAGUE_ID } from '../config.js';
import { readCached } from './sleeper.js';

const L = `/league/${LEAGUE_ID}`;
const num = (n, dec = 0) => (n ?? 0) + (dec ?? 0) / 100;

/** Reads the cache and returns a joined league model. Run `npm run fetch` first. */
export async function loadLeague() {
  const metaFile = await readCached('/_meta');
  const [state, league, users, rosters, tradedPicks, players] = await Promise.all([
    readCached('/state/nfl'),
    readCached(L),
    readCached(`${L}/users`),
    readCached(`${L}/rosters`),
    readCached(`${L}/traded_picks`),
    readCached('/players/nfl'),
  ]);

  const userById = new Map(users.map((u) => [u.user_id, u]));
  const divisionName = (n) => league.metadata?.[`division_${n}`] ?? (n ? `Division ${n}` : 'None');

  const teams = rosters.map((r) => {
    const owners = [r.owner_id, ...(r.co_owners ?? [])].filter(Boolean).map((id) => userById.get(id)).filter(Boolean);
    const owner = owners[0];
    const s = r.settings ?? {};
    return {
      rosterId: r.roster_id,
      ownerId: r.owner_id,
      owner: owner?.display_name ?? null,
      coOwners: owners.slice(1).map((u) => u.display_name),
      teamName: owner?.metadata?.team_name || (owner ? `Team ${owner.display_name}` : `Roster ${r.roster_id}`),
      hasCustomName: Boolean(owner?.metadata?.team_name),
      division: divisionName(s.division),
      wins: s.wins ?? 0,
      losses: s.losses ?? 0,
      ties: s.ties ?? 0,
      pf: num(s.fpts, s.fpts_decimal),
      pa: num(s.fpts_against, s.fpts_against_decimal),
      faabUsed: s.waiver_budget_used ?? 0,
      players: r.players ?? [],
      starters: r.starters ?? [],
    };
  });

  const weeks = {};
  for (const w of metaFile.matchupWeeks) {
    const raw = await readCached(`${L}/matchups/${w}`);
    weeks[w] = raw.map((m) => ({
      ...m,
      // custom_points is a commissioner override; otherwise use Sleeper's points as-is.
      score: m.custom_points ?? m.points ?? 0,
    }));
  }

  const transactions = [];
  for (const w of metaFile.txWeeks) {
    for (const t of await readCached(`${L}/transactions/${w}`)) transactions.push({ ...t, week: w });
  }

  return { meta: metaFile, state, league, users, teams, weeks, transactions, tradedPicks, players };
}
