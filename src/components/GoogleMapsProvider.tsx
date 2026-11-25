// Free-map provider passthrough (Leaflet + OpenStreetMap).
// Google Maps was removed: it needs a paid API key.
// This file keeps every export with the same name/signature so existing imports
// keep working, but renders children directly with no key, no loading state and
// no "API key not configured" fallback. Leaflet CSS is imported exactly once here.
import React, { createContext, useContext } from "react";
import "leaflet/dist/leaflet.css";

interface GoogleMapsConfigContextValue {
  apiKey: string;
  isConfigReady: boolean;
}

const GoogleMapsConfigContext = createContext<GoogleMapsConfigContextValue>({
  apiKey: "",
  isConfigReady: true,
});

export function useGoogleMapsConfig() {
  return useContext(GoogleMapsConfigContext);
}

// No Google Maps anymore, so there is never a quota/auth error.
export function isQuotaOrAuthMapsError(_err: unknown): boolean {
  return false;
}

export const isQuotaOrRateLimitError = isQuotaOrAuthMapsError;

// No-op: nothing to notify about anymore.
export function notifyGmpQuotaExceeded() {}

export const notifyMapsQuotaExceeded = notifyGmpQuotaExceeded;

interface GoogleMapsProviderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  return (
    <GoogleMapsConfigContext.Provider value={{ apiKey: "", isConfigReady: true }}>
      {children}
    </GoogleMapsConfigContext.Provider>
  );
}

export default GoogleMapsProvider;
