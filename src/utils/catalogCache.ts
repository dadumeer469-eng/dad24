// Versioned, TTL-aware localStorage cache for the Firestore catalogue.
//
// WHY THIS EXISTS
// Every page load used to run full getDocs on `menu` (152 docs) +
// `groceryProducts` (298 docs) + categories + vouchers — ~450+ reads per
// load. At the Spark free tier's 50,000 reads/day, ~110 page loads exhaust
// the quota in ~2 hours, after which EVERY Firestore read fails and even
// phone/Google login breaks (App.tsx reads Firestore before creating a
// session). This cache makes repeat loads cost 0 catalogue reads.
//
// HOW IT WORKS (stale-while-revalidate)
// - Each catalogue collection gets one versioned key holding
//   { v, savedAt, data }. `savedAt` is the epoch ms of the last successful
//   Firestore fetch.
// - TTL is 24 hours. Repeat loads inside a day cost ~0 catalogue reads,
//   and the catalogue delta (settings/catalog_delta, see
//   ./catalogDelta.ts) keeps prices/products fresh in between: when the
//   admin changes a price or adds a product, only that one item is
//   re-fetched and patched into the cache — the 24h TTL never has to
//   expire for an edit to reach users. The admin "Refresh All Users"
//   button still invalidates the cache immediately, so an intentional
//   edit reaches users at once.
// - On mount the UI renders from the cache immediately (first paint), even
//   if it is stale. The fetch effects then check freshness:
//     * Fresh cache (age < TTL)  -> skip Firestore entirely (0 reads).
//     * Stale/missing cache      -> fetch from Firestore, update cache + UI.
//     * Fetch fails (quota/offline) -> keep the cached/owner data; the page
//       never goes blank.
// - Bumping CATALOG_CACHE_VERSION invalidates every entry at once (use it
//   if the cached shape ever changes).
//
// WHAT IS CACHED
// menu, groceryProducts, groceryCategories, foodCategories, vouchers.
// Settings docs (delivery_config etc.) are NOT cached here — they are 1
// read each and control live fees/config, so they keep re-fetching as now.
// The 4 live onSnapshot listeners (user doc, orders, notifications, order
// chat) and the refresh_signal listener are untouched.

export const CATALOG_CACHE_VERSION = 1;

// 24 hours. Long enough that repeat loads inside a day cost ~0 catalogue
// reads. The catalogue delta (./catalogDelta.ts) applies admin edits
// (price change / product add) granularly on top of the cache, so a
// 24h TTL does NOT mean prices go stale for a day — only the changed
// item is re-fetched. Raise to 48h if the daily read quota still
// exhausts; lower it only if delta reads ever stop working.
export const CATALOG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const CATALOG_CACHE_KEYS = {
  menu: "dadu_catalog_v1_menu",
  groceryProducts: "dadu_catalog_v1_grocery_products",
  groceryCategories: "dadu_catalog_v1_grocery_categories",
  foodCategories: "dadu_catalog_v1_food_categories",
  vouchers: "dadu_catalog_v1_vouchers",
} as const;

export type CatalogCacheKey = keyof typeof CATALOG_CACHE_KEYS;

export interface CatalogCacheEntry<T> {
  /** Schema version — entries from an older version are ignored. */
  v: number;
  /** Epoch ms when this entry was written (last successful Firestore fetch). */
  savedAt: number;
  /** The fetched collection (already merged with the owner catalogue where applicable). */
  data: T;
}

function readEntry<T>(key: CatalogCacheKey): CatalogCacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_KEYS[key]);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogCacheEntry<T>;
    if (!parsed || parsed.v !== CATALOG_CACHE_VERSION) return null;
    if (typeof parsed.savedAt !== "number") return null;
    if (parsed.data === undefined || parsed.data === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Read a cache entry regardless of age (stale data is fine for first paint). */
export function readCatalogCache<T>(key: CatalogCacheKey): CatalogCacheEntry<T> | null {
  return readEntry<T>(key);
}

/**
 * Read a cache entry only when it is fresh (age < TTL). Returns the whole
 * entry (data + savedAt) — the delta logic needs savedAt to know which
 * admin changes happened after this cache was written. Returns null when
 * the entry is missing, from an older version, or expired — the caller
 * should then fetch from Firestore.
 */
export function readFreshCatalogEntry<T>(
  key: CatalogCacheKey,
): CatalogCacheEntry<T> | null {
  const entry = readEntry<T>(key);
  if (!entry) return null;
  if (Date.now() - entry.savedAt >= CATALOG_CACHE_TTL_MS) return null;
  return entry;
}

/**
 * Read cached data only when it is fresh (age < TTL). Returns null when the
 * entry is missing, from an older version, or expired — the caller should
 * then fetch from Firestore.
 */
export function readFreshCatalogCache<T>(key: CatalogCacheKey): T | null {
  const entry = readFreshCatalogEntry<T>(key);
  return entry ? entry.data : null;
}

/** Age of a cache entry in ms, or Infinity when missing/invalid. */
export function catalogCacheAgeMs(key: CatalogCacheKey): number {
  const entry = readEntry<unknown>(key);
  if (!entry) return Infinity;
  return Date.now() - entry.savedAt;
}

/**
 * Write a cache entry, stamping the current version and time.
 * `savedAtOverride` is used by the delta patch path: the cache is stamped
 * at the moment the delta was read, so an admin edit that lands after the
 * delta read (but before this write) is still newer than the cache and
 * gets applied on the next load instead of being silently skipped.
 */
export function writeCatalogCache<T>(
  key: CatalogCacheKey,
  data: T,
  savedAtOverride?: number,
): void {
  try {
    const entry: CatalogCacheEntry<T> = {
      v: CATALOG_CACHE_VERSION,
      savedAt: savedAtOverride ?? Date.now(),
      data,
    };
    localStorage.setItem(CATALOG_CACHE_KEYS[key], JSON.stringify(entry));
  } catch (e) {
    console.warn(`Failed to save catalogue cache ${CATALOG_CACHE_KEYS[key]}:`, e);
  }
}

/** Delete one cache entry. */
export function deleteCatalogCache(key: CatalogCacheKey): void {
  try {
    localStorage.removeItem(CATALOG_CACHE_KEYS[key]);
  } catch {
    /* ignore */
  }
}

/**
 * Delete ALL catalogue cache entries. Called when the admin presses
 * "Refresh All Users" (settings/refresh_signal) so the next fetch effects
 * re-read from Firestore immediately instead of serving the fresh cache.
 */
export function invalidateCatalogCache(): void {
  (Object.keys(CATALOG_CACHE_KEYS) as CatalogCacheKey[]).forEach((key) =>
    deleteCatalogCache(key),
  );
}

/**
 * First-paint read for a collection. Prefers the versioned cache (any age —
 * stale data still renders instantly), then the legacy raw-array key
 * (`dadu_cached_*`, written by older builds, so upgrading users keep their
 * first-paint data until the next fetch writes the versioned cache), then
 * the supplied fallback (owner catalogue / built-in defaults).
 */
export function readCatalogForPaint<T>(
  key: CatalogCacheKey,
  legacyKey: string,
  fallback: T,
): T {
  const entry = readEntry<T>(key);
  if (entry) return entry.data;
  try {
    const raw = localStorage.getItem(legacyKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) return parsed as T;
    }
  } catch {
    /* ignore — fall through to the fallback */
  }
  return fallback;
}
