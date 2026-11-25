import React, { createContext, useContext, useEffect, useState } from "react";
import {
  APIProvider,
  APILoadingStatus,
  useApiLoadingStatus,
} from "@vis.gl/react-google-maps";
import { AlertTriangle, Loader2 } from "lucide-react";

interface GoogleMapsConfigContextValue {
  apiKey: string;
  isConfigReady: boolean;
}

const GoogleMapsConfigContext = createContext<GoogleMapsConfigContextValue>({
  apiKey: "",
  isConfigReady: false,
});

export function useGoogleMapsConfig() {
  return useContext(GoogleMapsConfigContext);
}

let cachedRuntimeMapsKey: string | null = null;
let inflightKeyPromise: Promise<string> | null = null;

function getBuildTimeMapsKey(): string {
  try {
    return (
      (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ||
      ""
    );
  } catch {
    return "";
  }
}

async function resolveMapsApiKey(): Promise<string> {
  const buildKey = getBuildTimeMapsKey();
  if (buildKey) return buildKey;
  if (cachedRuntimeMapsKey !== null) return cachedRuntimeMapsKey;

  if (!inflightKeyPromise) {
    inflightKeyPromise = fetch("/api/maps-config")
      .then((res) => (res.ok ? res.json() : { apiKey: "" }))
      .then((data) => {
        const key = typeof data?.apiKey === "string" ? data.apiKey.trim() : "";
        cachedRuntimeMapsKey = key;
        return key;
      })
      .catch(() => {
        cachedRuntimeMapsKey = "";
        return "";
      })
      .finally(() => {
        inflightKeyPromise = null;
      });
  }
  return inflightKeyPromise;
}

export function isQuotaOrAuthMapsError(err: unknown): boolean {
  if (!err) return false;
  const text =
    typeof err === "string"
      ? err
      : `${(err as any)?.code || ""} ${(err as any)?.status || ""} ${(err as any)?.message || ""}`;
  return /429|RESOURCE_EXHAUSTED|OVER_QUERY_LIMIT|OverQuotaMapError|QuotaExceededError/i.test(
    text
  );
}

export const isQuotaOrRateLimitError = isQuotaOrAuthMapsError;

export function notifyGmpQuotaExceeded() {
  window.dispatchEvent(new CustomEvent("gmp-quota-exceeded"));
}

export const notifyMapsQuotaExceeded = notifyGmpQuotaExceeded;

function MapsStatusGuard({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const status = useApiLoadingStatus();

  useEffect(() => {
    if (status === APILoadingStatus.AUTH_FAILURE) {
      notifyGmpQuotaExceeded();
    }
  }, [status]);

  if (
    status === APILoadingStatus.AUTH_FAILURE ||
    status === APILoadingStatus.FAILED
  ) {
    return (
      <>
        {fallback || (
          <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center p-5 text-center bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 gap-2">
            <AlertTriangle className="w-7 h-7 text-[#E21B70]" />
            <p className="text-xs font-extrabold">
              Google Maps could not load right now.
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs">
              Please check your network connection or Google Maps API quota and
              try again.
            </p>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}

interface GoogleMapsProviderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function GoogleMapsProvider({
  children,
  fallback,
}: GoogleMapsProviderProps) {
  const [apiKey, setApiKey] = useState<string>(
    () => getBuildTimeMapsKey() || cachedRuntimeMapsKey || ""
  );
  const [isConfigReady, setIsConfigReady] = useState<boolean>(() =>
    Boolean(getBuildTimeMapsKey() || cachedRuntimeMapsKey !== null)
  );

  useEffect(() => {
    let active = true;
    if (apiKey) {
      setIsConfigReady(true);
      return;
    }
    resolveMapsApiKey().then((resolved) => {
      if (!active) return;
      setApiKey(resolved);
      setIsConfigReady(true);
    });
    return () => {
      active = false;
    };
  }, [apiKey]);

  return (
    <GoogleMapsConfigContext.Provider value={{ apiKey, isConfigReady }}>
      {!isConfigReady ? (
        <div className="w-full h-full min-h-[220px] flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 text-xs font-bold">
          <Loader2 className="w-4 h-4 animate-spin text-[#E21B70]" />
          <span>Loading Google Maps...</span>
        </div>
      ) : !apiKey ? (
        fallback || (
          <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center p-5 text-center bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 gap-2">
            <AlertTriangle className="w-7 h-7 text-[#E21B70]" />
            <p className="text-xs font-extrabold">
              Google Maps API key not configured
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs">
              Enable Google Maps in settings or configure
              VITE_GOOGLE_MAPS_API_KEY in your environment.
            </p>
          </div>
        )
      ) : (
        <APIProvider
          apiKey={apiKey}
          language="en"
          region="PK"
          libraries={["places", "routes", "marker"]}
        >
          <MapsStatusGuard fallback={fallback}>{children}</MapsStatusGuard>
        </APIProvider>
      )}
    </GoogleMapsConfigContext.Provider>
  );
}

export default GoogleMapsProvider;
