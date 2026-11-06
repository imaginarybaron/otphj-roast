import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { API_BASE, CACHE_DIR, REQUEST_GAP_MS, TTL } from '../config.js';

const FORCE = process.argv.includes('--force');
const stats = { hits: 0, fetched: 0 };
let lastRequest = 0;

export const getStats = () => ({ ...stats });

const cacheFile = (path) =>
  new URL(path.replace(/^\//, '').replace(/\//g, '_') + '.json', CACHE_DIR);

async function throttle() {
  const wait = lastRequest + REQUEST_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
}

async function download(path, attempt = 0) {
  await throttle();
  const res = await fetch(API_BASE + path);
  if ((res.status === 429 || res.status >= 500) && attempt < 1) {
    await new Promise((r) => setTimeout(r, 2000));
    return download(path, attempt + 1);
  }
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status} ${res.statusText}`);
  return res.text();
}

/**
 * Cached GET. ttl in ms (Infinity = never refetch). --force bypasses the
 * cache except for the players file, which always honours its 24h TTL.
 */
export async function get(path, { ttl = TTL.live, noForce = false } = {}) {
  const file = cacheFile(path);
  await mkdir(CACHE_DIR, { recursive: true });
  try {
    const age = Date.now() - (await stat(file)).mtimeMs;
    if (age < ttl && !(FORCE && !noForce)) {
      stats.hits++;
      console.log(`  cache hit  ${path}`);
      return JSON.parse(await readFile(file, 'utf8'));
    }
  } catch {
    /* no cache yet */
  }
  const text = await download(path);
  await writeFile(file, text);
  stats.fetched++;
  console.log(`  fetched    ${path}`);
  return JSON.parse(text);
}

export async function readCached(path) {
  return JSON.parse(await readFile(cacheFile(path), 'utf8'));
}

export const cacheDirPath = () => fileURLToPath(CACHE_DIR);
