export interface SavedAddressEntry {
  label: "Ghar" | "Dukan / Office" | "Hostel" | "Other";
  address: string;
  updatedAt: number;
}

const STORAGE_PREFIX = "dadu_saved_addresses_";

export function getSavedAddresses(uid?: string): SavedAddressEntry[] {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${uid}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedAddressEntry =>
        item && typeof item.address === "string" && item.address.trim().length > 0
    );
  } catch {
    return [];
  }
}

export function saveRecentAddress(
  uid: string | undefined,
  address: string,
  label: SavedAddressEntry["label"] = "Ghar"
): SavedAddressEntry[] {
  if (!uid || !address.trim()) return [];
  const trimmed = address.trim();
  const existing = getSavedAddresses(uid);

  // Deduplicate by normalized address text or same non-Other label if address matches
  const filtered = existing.filter(
    (entry) => entry.address.trim().toLowerCase() !== trimmed.toLowerCase()
  );

  const next: SavedAddressEntry[] = [
    { label, address: trimmed, updatedAt: Date.now() },
    ...filtered,
  ].slice(0, 4);

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${uid}`, JSON.stringify(next));
  } catch {
    // Ignore storage quota issues
  }
  return next;
}

export function removeSavedAddress(
  uid: string | undefined,
  address: string
): SavedAddressEntry[] {
  if (!uid) return [];
  const next = getSavedAddresses(uid).filter(
    (entry) => entry.address.trim().toLowerCase() !== address.trim().toLowerCase()
  );
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${uid}`, JSON.stringify(next));
  } catch {
    // Ignore storage quota issues
  }
  return next;
}
