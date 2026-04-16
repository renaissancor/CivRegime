/**
 * Simple in-memory fetch cache for API responses.
 * Caches JSON responses by URL — avoids redundant fetches
 * when navigating within a page session.
 */
const _fetchCache = {};

async function cachedFetch(url) {
  if (_fetchCache[url]) return _fetchCache[url];
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const data = await res.json();
  _fetchCache[url] = data;
  return data;
}
