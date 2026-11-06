export const r2 = (n, d = 2) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d);
export const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
export const stdev = (a) => {
  const m = mean(a);
  return a.length ? Math.sqrt(mean(a.map((x) => (x - m) ** 2))) : 0;
};
export const playedWeeks = (meta) => meta.matchupWeeks.filter((w) => w <= meta.lastScored);
export const lastRegWeek = (league) => (league.settings.playoff_week_start || 15) - 1;

export function playerInfo(players, id) {
  const p = players?.[id];
  if (!p) return { id, name: `Player ${id}`, pos: '?', nfl: '' };
  const name = p.full_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || `Player ${id}`;
  return { id, name, pos: p.position ?? '?', nfl: p.team ?? 'FA' };
}

/**
 * Points a player scored for `rosterId` from `week` on, for as long as they stay on that roster.
 * Uses Sleeper's players_points as-is. "Started" = points while in the starting lineup.
 * Start week tolerates the add being logged one week early (week or week+1).
 */
export function pointsSince({ rosterId, playerId, week, weeks, lastScored }) {
  const empty = { startedPts: 0, rosteredPts: 0, weeksHeld: 0, startedWeeks: 0, firstWeek: null, lastWeek: null, gamesPossible: 0, found: false };
  const entry = (w) => weeks[w]?.find((m) => m.roster_id === rosterId);
  const has = (w) => entry(w)?.players?.includes(playerId);
  if (week > lastScored) return empty;
  let start = null;
  for (const w of [week, week + 1]) {
    if (w > lastScored) break;
    if (has(w)) { start = w; break; }
  }
  if (start == null) return { ...empty, gamesPossible: lastScored - week + 1 };
  const out = { ...empty, found: true, firstWeek: start, gamesPossible: lastScored - start + 1 };
  for (let w = start; w <= lastScored && has(w); w++) {
    const m = entry(w);
    const pts = m.players_points?.[playerId] ?? 0;
    out.rosteredPts += pts;
    out.weeksHeld++;
    out.lastWeek = w;
    if (m.starters?.includes(playerId)) { out.startedPts += pts; out.startedWeeks++; }
  }
  out.startedPts = Math.round(out.startedPts * 100) / 100;
  out.rosteredPts = Math.round(out.rosteredPts * 100) / 100;
  return out;
}
