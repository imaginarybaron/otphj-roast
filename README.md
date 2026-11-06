# OTPHJ Roast Site

Entertainment-only trash-talk site for the OTPHJ Sleeper league (2026). Uses only the public, read-only Sleeper API (no auth). Static site built with Eleventy, rebuilt weekly by GitHub Actions.

**Stack:** Node.js. The fetch and analysis code has no dependencies (built-in `fetch`); Eleventy renders the pages.

## Commands

```
npm run fetch     # pull everything into ./cache (add --force to bypass cache)
npm run report    # Phase 1 validation report from the cache
npm run data      # analysis + roast copy -> site/_data/*.json
npm run site      # render pages -> _site/
npm run serve     # local preview with live reload
npm run build     # fetch + data + site (what CI runs)
```

## Layout

| Path | Purpose |
|---|---|
| `config.js` | League ID, API base, cache TTLs |
| `src/sleeper.js` | Throttled (~4 req/s) disk-cached GET helper |
| `src/fetch.js` | Pulls state, league, users, rosters, matchups (wk 1-17), transactions, traded picks, players |
| `src/load.js` | Joins the cache into one league model |
| `src/report.js` | Console validation report |
| `src/analysis/power.js` | Power rankings, all-play, luck |
| `src/analysis/tiers.js` | S-F tier list from the power score |
| `src/analysis/schedule.js` | Rest-of-season strength of schedule |
| `src/analysis/waivers.js` | Pickup value, FAAB efficiency, whiffs |
| `src/analysis/trades.js` | Trade winners/losers, traded picks list |
| `src/roast.js` | Roast copy: template banks filled with stats |
| `src/build-data.js` | Runs all analysis, writes `site/_data/*.json` |
| `site/` | Eleventy pages (`*.njk`), layout, CSS |
| `.github/workflows/weekly.yml` | Weekly rebuild + GitHub Pages deploy |

## How the numbers work

- Points always come from Sleeper's matchup data (IDP and TE premium included). Nothing is rescored. `custom_points` overrides win if present.
- **Power** = 35% points per game + 40% all-play win% + 25% last-3-week average, each scaled 0-100.
- **Luck** = actual wins minus all-play expected wins.
- **Tiers** = fixed cutoffs on the power score: S 90+, A 75+, B 55+, C 35+, D 15+, F below.
- **Schedule** = average power of remaining regular-season opponents.
- **Waivers**: "started points" the player scored in the adding team's lineup from the add until they leave that roster. Points per dollar only counts paid claims.
- **Trades**: started points scored by the players each side received, after the trade. Under 5 points apart is a "push". Picks are listed, not valued.
- **Roast copy** is deterministic (same data = same jokes) and roasts decisions, never team names.

Known limits: Sleeper doesn't expose points for a player who isn't on a roster, so points after a drop are invisible, and players added and cut in the same week show 0.

## Weekly rebuild / deploy

`weekly.yml` runs Tuesdays 12:00 UTC (and on manual trigger). It restores `cache/`, runs `npm run build`, and deploys `_site/` to GitHub Pages.

One-time setup: push this folder to a GitHub repo, then **Settings -> Pages -> Source: GitHub Actions**. Run the workflow once from the Actions tab.

## Cache rules

- `/players/nfl` (huge): refetched at most every 24h, even with `--force`.
- Matchups older than the last 2 scored weeks, and past-week transactions: cached permanently.
- Last 2 scored weeks: 24h (Sleeper applies stat corrections after the fact).
- Everything else (league, rosters, state, current/future weeks, traded picks): 1h.
