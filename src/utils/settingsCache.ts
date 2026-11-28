// TTL-aware localStorage cache for small settings docs.
//
// Settings (delivery_config, groceryDeliveryConfig, deal_config, ui_config,
// seo_config) change rarely — only when the admin edits them — but App.tsx
// re-reads them on EVERY page load AND on every tab-visible event (~6 reads
// per tab switch, multiplied across all open sessions). That steady drip is
// what keeps the free-tier Firestore quota (50,000 reads/day) under pressure
// even after the catalogue itself costs ~0 reads (7-day cache + delta +
// bundled lists). A 1-hour TTL cuts settings reads to ~6 per hour per
// device, while admin edits still show within an hour. Checkout-critical
// settings are re-read live at order time by the checkout path, so a stale
// cached fee can never be charged.
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
