// Granular catalogue delta — lets a single admin price change or product
// add reach users WITHOUT re-fetching the whole catalogue.
//
// WHY THIS EXISTS
// The catalogue cache (./catalogCache.ts, 24h TTL) makes repeat page loads
// cost ~0 Firestore reads, but a 24h TTL on its own would mean an admin
// price change takes up to a day to reach users who already have a fresh
// cache. The delta closes that gap: every admin save that touches a
// catalogue document also records ONE tiny entry in the shared delta doc
// (settings/catalog_delta). On load, a user with a fresh cache reads just
// that one doc (1 read) and re-fetches ONLY the items that changed since
// their cache was saved — a price change updates only that item's price,
// a product add inserts only that product.
//
// DELTA DOC — settings/catalog_delta
// {
//   updatedAt: number,            // ms epoch of the last recorded change
//   clearedAt: number,            // ms epoch; set by "Refresh All Users".
//                                  // Entries at/before clearedAt are ignored.
//   changes: {                     // map, keyed "collection__sanitisedId"
//     "menu__custom_1735123456789": { c: "menu", id: "custom_...", at: 173..., a: "upsert" },
//     "groceryProducts__gprod_173...": { c: "groceryProducts", id: "gprod_...", at: 173..., a: "delete" },
//   },
//   full: { "menu": 173... }       // per-collection full-refetch markers
//                                  // (bulk ops: rename/delete a restaurant,
//                                  // clear entire menu, category migration).
// }
//
// HOW THE APP USES IT (see applyCatalogDelta)
// - No delta doc, or the delta read fails (quota/offline) -> keep the
//   cache as-is, never a blank page.
// - clearedAt > cache savedAt (admin pressed Refresh while this page was
//   closed) -> full re-fetch of that collection.
// - full[collection] > cache savedAt (a bulk op touched the collection)
//   -> full re-fetch of that collection.
// - Otherwise, take the per-item changes newer than the cache savedAt:
//   none -> use the cache (0 catalogue reads beyond the 1 delta read);
//   1..20 -> getDoc each changed item by ID and patch it into the cached
//   list (price change = that item only, add = that item only, delete =
//   remove it); > 20 -> full re-fetch (cheaper than 20+ single reads).
// - After patching, the cache is re-stamped at the moment the delta was
//   read, so an admin edit landing mid-patch is still newer than the
//   cache and gets applied on the next load.
//
// WHAT IS *NOT* RECORDED (deliberate)
// - App-side owner-catalogue seeding (the data is identical to the owner
//   fallback every user already has; recording it would spam the delta).
// - App-side one-time menu self-heal corrections (legacy, effectively
//   no-ops now; they run only during a full fetch anyway).
// - Voucher redemptions at checkout (per-user usage counts; checkout
//   validates the chosen voucher with a live getDoc, so a stale list can
//   never redeem an expired voucher).
// - Settings docs (delivery_config etc.) — not catalogue, stay live.

import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export type CatalogDeltaCollection =
  | "menu"
  | "groceryProducts"
  | "groceryCategories"
  | "foodCategories"
  | "vouchers";

export type CatalogDeltaAction = "upsert" | "delete";

export interface CatalogDeltaChange {
  /** Collection the changed document belongs to. */
  c: CatalogDeltaCollection;
  /** Firestore document ID (original, unsanitised). */
  id: string;
  /** ms epoch when the admin saved the change. */
  at: number;
  /** "upsert" = re-fetch the doc by ID (price change / add / edit);
      "delete" = remove it from the cached list (no read needed). */
  a: CatalogDeltaAction;
}

export interface CatalogDeltaDoc {
  updatedAt?: number;
  clearedAt?: number;
  changes?: Record<string, CatalogDeltaChange>;
  full?: Record<string, number>;
}

export type DeltaPatchResult<T> =
  | { mode: "cache" }
  | { mode: "patched"; list: T[]; readAt: number }
  | { mode: "full" };

/** Above this many changed items in one collection, a full re-fetch is cheaper. */
export const CATALOG_DELTA_MAX_PATCH_ITEMS = 20;

const DELTA_DOC_ID = "catalog_delta";

/** Delta map key — sanitised so it is safe as a Firestore dotted field path. */
function deltaKey(collection: CatalogDeltaCollection, id: string): string {
  return `${collection}__${String(id).replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

function deltaRef() {
  return doc(db, "settings", DELTA_DOC_ID);
}

/**
 * Record ONE catalogue item change in the delta doc. Fire-and-forget:
 * never throws, never blocks the admin save (the 24h cache TTL is the
 * backstop if this write ever fails). Uses updateDoc with a dotted path
 * so concurrent edits to different items never clobber each other; falls
 * back to setDoc(merge) when the delta doc does not exist yet.
 */
export function recordCatalogChange(
  collection: CatalogDeltaCollection,
  id: string,
  action: CatalogDeltaAction,
): void {
  if (!id) return;
  const now = Date.now();
  const key = deltaKey(collection, id);
  const change: CatalogDeltaChange = {
    c: collection,
    id: String(id),
    at: now,
    a: action,
  };
  updateDoc(deltaRef(), {
    updatedAt: now,
    [`changes.${key}`]: change,
  }).catch(async () => {
    try {
      await setDoc(
        deltaRef(),
        { updatedAt: now, clearedAt: 0, changes: { [key]: change }, full: {} },
        { merge: true },
      );
    } catch {
      /* delta is best-effort — the cache TTL is the backstop */
    }
  });
}

/**
 * Record a BULK change to a whole collection (rename/delete a restaurant,
 * clear the entire menu, migrate categories, delete a category with all
 * its products, bulk import). The next load re-fetches that whole
 * collection once instead of patching dozens of items one by one.
 * Fire-and-forget, never throws.
 */
export function recordCatalogFull(collection: CatalogDeltaCollection): void {
  const now = Date.now();
  updateDoc(deltaRef(), {
    updatedAt: now,
    [`full.${collection}`]: now,
  }).catch(async () => {
    try {
      await setDoc(
        deltaRef(),
        { updatedAt: now, clearedAt: 0, changes: {}, full: { [collection]: now } },
        { merge: true },
      );
    } catch {
      /* delta is best-effort */
    }
  });
}

/**
 * Clear the delta — called by the admin "Refresh All Users" button (after
 * it writes settings/refresh_signal). Open user pages invalidate their
 * local cache via the refresh signal and full re-fetch; closed pages see
 * clearedAt > their cache savedAt on the next load and full re-fetch too.
 * Failures are swallowed (the refresh signal alone still refreshes open
 * pages; the delta simply keeps applying per-item changes).
 */
export async function clearCatalogDelta(): Promise<void> {
  try {
    await setDoc(
      deltaRef(),
      { clearedAt: Date.now(), changes: {}, full: {} },
      { merge: true },
    );
  } catch {
    /* non-fatal — see above */
  }
}

// The delta doc is shared by all 5 catalogue collections, and all 5 fetch
// effects run at mount — memoise the single read briefly so a page load
// costs exactly 1 delta read, while a tab-visible refetch minutes later
// still sees fresh admin edits.
let deltaMemo: { at: number; promise: Promise<CatalogDeltaDoc | null> } | null =
  null;
const DELTA_MEMO_MS = 60 * 1000;

/** Read the delta doc once per page load (memoised 60s). Null = no delta yet or the read failed (quota/offline). */
export function getCatalogDelta(): Promise<CatalogDeltaDoc | null> {
  const now = Date.now();
  if (deltaMemo && now - deltaMemo.at < DELTA_MEMO_MS) return deltaMemo.promise;
  const promise = (async (): Promise<CatalogDeltaDoc | null> => {
    try {
      const snap = await getDoc(deltaRef());
      if (!snap.exists()) return null;
      return snap.data() as CatalogDeltaDoc;
    } catch {
      return null;
    }
  })();
  deltaMemo = { at: now, promise };
  return promise;
}

/**
 * Apply the delta on top of a fresh cached list.
 * - "cache": no relevant changes — use the cache as-is.
 * - "patched": only the changed items were re-fetched by ID and merged
 *   in (price change = that item only, add = that item only, delete =
 *   removed). `readAt` is when the delta was read; the caller re-stamps
 *   the cache at readAt so a concurrent admin edit is not skipped.
 * - "full": a Refresh / bulk op / >20 changes — the caller should do a
 *   full getDocs of the collection as before.
 * Never throws and never returns an empty list: on any failure it falls
 * back to "cache" so the page keeps showing the cached catalogue.
 */
export async function applyCatalogDelta<T extends { id: string }>(
  collection: CatalogDeltaCollection,
  cached: T[],
  cacheSavedAt: number,
): Promise<DeltaPatchResult<T>> {
  const readAt = Date.now();
  let delta: CatalogDeltaDoc | null;
  try {
    delta = await getCatalogDelta();
  } catch {
    return { mode: "cache" };
  }
  if (!delta) return { mode: "cache" };
  const since = cacheSavedAt;
  // Admin pressed Refresh while this page was closed: re-fetch everything.
  if (delta.clearedAt && delta.clearedAt > since) return { mode: "full" };
  // A bulk op touched this collection after the cache was saved.
  const fullAt = delta.full?.[collection];
  if (fullAt && fullAt > since) return { mode: "full" };
  const changes = Object.values(delta.changes || {});
  const relevant = changes.filter(
    (e) =>
      e &&
      e.c === collection &&
      typeof e.at === "number" &&
      e.at > since &&
      typeof e.id === "string" &&
      e.id,
  );
  if (relevant.length === 0) return { mode: "cache" };
  if (relevant.length > CATALOG_DELTA_MAX_PATCH_ITEMS) return { mode: "full" };
  // Latest change per document wins (an item edited twice patches once).
  const latest = new Map<string, CatalogDeltaChange>();
  for (const e of relevant) {
    const prev = latest.get(e.id);
    if (!prev || e.at > prev.at) latest.set(e.id, e);
  }
  let list = [...cached];
  for (const e of latest.values()) {
    if (e.a === "delete") {
      list = list.filter((item) => item.id !== e.id);
      continue;
    }
    try {
      const snap = await getDoc(doc(db, collection, e.id));
      if (!snap.exists()) {
        list = list.filter((item) => item.id !== e.id);
        continue;
      }
      const fresh = { id: snap.id, ...(snap.data() as object) } as T;
      const idx = list.findIndex((item) => item.id === e.id);
      if (idx >= 0) list[idx] = fresh;
      else list.push(fresh);
    } catch {
      // getDoc failed (quota/offline) — keep the cached item as-is.
      continue;
    }
  }
  return { mode: "patched", list, readAt };
}
