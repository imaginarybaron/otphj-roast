// Turns the cached Sleeper data into JSON files for the site (site/_data/*.json).
import { mkdir, writeFile } from 'node:fs/promises';
import { loadLeague } from './load.js';
import { analyzePower } from './analysis/power.js';
import { analyzeSchedule } from './analysis/schedule.js';
import { analyzeWaivers } from './analysis/waivers.js';
import { analyzeTrades } from './analysis/trades.js';
import { analyzeTiers } from './analysis/tiers.js';
import { buildRoast } from './roast.js';

const OUT = new URL('../site/_data/', import.meta.url);
const data = await loadLeague();
const { league, state, meta, teams, weeks, transactions, players } = data;

const power = analyzePower({ teams, weeks, meta });
const schedule = analyzeSchedule({ league, weeks, meta, power });
const waivers = analyzeWaivers({ teams, transactions, weeks, meta, players });
const trades = analyzeTrades({ teams, transactions, weeks, meta, players });
const tiers = analyzeTiers({ power });
const roast = buildRoast({ power, schedule, waivers, trades, tiers, meta });

const site = {
  leagueName: league.name,
  season: league.season,
  weeksPlayed: power.weeksPlayed,
  currentWeek: state.week,
  generatedAt: new Date().toISOString(),
  dataFetchedAt: meta.fetchedAt,
  divisions: [1, 2, 3, 4].map((n) => league.metadata?.[`division_${n}`]).filter(Boolean),
};

const warnings = [];
for (const t of waivers.teams) {
  if (t.spent !== t.sleeperUsed) warnings.push(`FAAB mismatch ${t.team}: transactions sum $${t.spent}, Sleeper says $${t.sleeperUsed} used.`);
}
if (waivers.ghosts) warnings.push(`${waivers.ghosts} pickups never appear on the adding roster in a scored week (usually added and cut within the same week); counted as 0 pts. Info only.`);

await mkdir(OUT, { recursive: true });
const files = { site, power, schedule, waivers, trades, tiers, roast };
for (const [name, obj] of Object.entries(files)) await writeFile(new URL(`${name}.json`, OUT), JSON.stringify(obj, null, 2));

console.log(`Wrote ${Object.keys(files).length} data files to site/_data (week ${site.weeksPlayed} of results).`);
if (warnings.length) { console.log('Warnings:'); warnings.forEach((w) => console.log('  -', w)); }
