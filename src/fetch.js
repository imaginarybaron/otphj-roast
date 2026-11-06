import { writeFile } from 'node:fs/promises';
import { LEAGUE_ID, CACHE_DIR, TTL } from '../config.js';
import { get, getStats } from './sleeper.js';

const L = `/league/${LEAGUE_ID}`;

console.log('Fetching Sleeper data for league', LEAGUE_ID);

const state = await get('/state/nfl');
const league = await get(L);
await get(`${L}/users`);
await get(`${L}/rosters`);

const currentWeek = state.leg ?? state.week;
const lastScored = league.settings.last_scored_leg ?? 0;
const playoffStart = league.settings.playoff_week_start || 15;
const lastMatchupWeek = playoffStart + 2; // playoffs: weeks 15-17
const lastTxWeek = Math.min(currentWeek, 18);

// Matchups: completed weeks cached forever; current/future weeks refetched hourly.
const matchupWeeks = [];
for (let w = 1; w <= lastMatchupWeek; w++) {
  // Stat corrections land days after a week ends, so recent weeks refresh daily.
  const ttl = w <= lastScored - 2 ? TTL.final : w <= lastScored ? 24 * 60 * 60 * 1000 : TTL.live;
  await get(`${L}/matchups/${w}`, { ttl });
  matchupWeeks.push(w);
}

// Transactions are indexed by week ("round"). Completed weeks are final.
const txWeeks = [];
for (let w = 1; w <= lastTxWeek; w++) {
  await get(`${L}/transactions/${w}`, { ttl: w < currentWeek ? TTL.final : TTL.live });
  txWeeks.push(w);
}

await get(`${L}/traded_picks`);
await get('/players/nfl', { ttl: TTL.players, noForce: true });

const meta = {
  fetchedAt: new Date().toISOString(),
  currentWeek,
  lastScored,
  matchupWeeks,
  txWeeks,
};
await writeFile(new URL('_meta.json', CACHE_DIR), JSON.stringify(meta, null, 2));

const s = getStats();
console.log(`\nDone. ${s.fetched} network request(s), ${s.hits} cache hit(s).`);
