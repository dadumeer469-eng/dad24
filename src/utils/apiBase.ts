// API base URL — makes Munchi voice work INSIDE the APK.
//
// The Capacitor APK bundles the web code and loads it from
// capacitor://localhost, where there is NO server — so a relative "/api/..."
// call fails and Munchi cannot speak in the app. In the native app, point
// /api calls at the live site instead (the API stays live there — user
// 28 Nov 02:52: "munchi voice inbuilt daldo app me, api bhi chordo").
// On the website, relative URLs keep working exactly as before.
import { Capacitor } from "@capacitor/core";

const LIVE_API_BASE = "https://www.dadufood.store";

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    return `${LIVE_API_BASE}${p}`;
  }
  return p;
}
