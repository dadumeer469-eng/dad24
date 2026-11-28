// TTL-aware localStorage cache for small settings docs.
//
// Settings (delivery_config, groceryDeliveryConfig, deal_config, ui_config,
// seo_config) change rarely — only when the admin edits them — but App.tsx
// re-reads them on EVERY page load AND on every tab-visible event (~6 reads
// per tab switch, multiplied across all open sessions). That steady drip is
// what keeps the free-tier Firestore quota (50,000 reads/day) under pressure
// even after the catalogue itself costs ~0 reads (7-day cache + delta +
// bundled lists). A 1-hour TTL cuts settings reads to ~6 per hour per
// device. Trade-off (honest): an admin edit takes up to 1 hour to reach a
// customer who already has a fresh cached copy — including the delivery fee
// shown at checkout, which comes from this cached state. The admin's
// "Refresh All Users" button busts the cache immediately (clearSettingsCache
// is called from the refresh-signal handler), so an edit he pushes with
// Refresh reaches everyone at once.
const SETTINGS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const PREFIX = "dadu_settings_cache:";

export function readSettingsCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: T; savedAt: number };
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt >= SETTINGS_CACHE_TTL_MS) return null;
    return parsed.data as T;
  } catch {
    return null;
  }
}

export function writeSettingsCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(
      PREFIX + key,
      JSON.stringify({ data, savedAt: Date.now() }),
    );
  } catch {
    /* storage full/blocked — non-fatal, next load re-reads Firestore */
  }
}

const SETTINGS_CACHE_KEYS = [
  "delivery_config",
  "groceryDeliveryConfig",
  "deal_config",
  "ui_config",
  "seo_config",
  "voice_config",
] as const;

/** Drop all settings cache entries (admin "Refresh All Users" signal). */
export function clearSettingsCache(): void {
  SETTINGS_CACHE_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  });
}
