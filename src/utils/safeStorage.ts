// Safari WebKit Safe LocalStorage Utility
export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[SafeStorage] Reading '${key}' failed:`, e);
    }
    return null;
  },

  setItem: (key: string, value: string): boolean => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        // Prevent storing huge base64 payloads (>150KB) in localStorage to avoid Safari QuotaExceededError
        if (value && value.length > 150000) {
          console.warn(`[SafeStorage] Payload for '${key}' too large (${value.length} chars), skipping cache.`);
          return false;
        }
        localStorage.setItem(key, value);
        return true;
      }
    } catch (e) {
      console.warn(`[SafeStorage] Writing '${key}' failed:`, e);
    }
    return false;
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[SafeStorage] Removing '${key}' failed:`, e);
    }
  }
};
