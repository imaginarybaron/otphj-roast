export const LEAGUE_ID = '1376342936551170048';
export const API_BASE = 'https://api.sleeper.app/v1';
export const CACHE_DIR = new URL('./cache/', import.meta.url);

export const HOUR = 60 * 60 * 1000;
export const TTL = {
  players: 24 * HOUR, // /players/nfl is huge: at most once a day
  live: 1 * HOUR, // league, users, rosters, state, traded picks, current/future weeks
  final: Infinity, // completed weeks never change
};

// Minimum gap between network requests (ms). ~4 req/s, far under Sleeper's limit.
export const REQUEST_GAP_MS = 250;
