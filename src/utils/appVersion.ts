// App version + in-app update check.
//
// When a NEW APK version launches, the old app shows a notification banner
// the user can tap to install the new version (user 28 Nov 02:55).
// How it works:
// - APP_VERSION is bumped in code on every APK release (this build = 2).
// - The admin sets the latest version in Firestore `settings/app_version`
//   { version, apkUrl, message } from the Admin Panel (App Version section).
// - On startup the app reads that doc (one Firestore read). If the Firestore
//   version is NEWER than this build, the update banner appears with a
//   Download button that opens the APK link.
// - NOTE: only builds that CONTAIN this checker can show the banner, so the
//   notification starts working from this build onward (v1 had no checker).
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// Bump this on EVERY APK release. This build is version 2.
export const APP_VERSION = 3;

export interface AppVersionInfo {
  version: number;
  apkUrl: string;
  message?: string;
  updatedAt?: unknown;
}

export async function checkForAppUpdate(): Promise<AppVersionInfo | null> {
  try {
    const snap = await getDoc(doc(db, "settings", "app_version"));
    if (!snap.exists()) return null;
    const data = snap.data() as AppVersionInfo;
    if (!data || typeof data.version !== "number" || !data.apkUrl) return null;
    if (data.version > APP_VERSION) return data;
    return null;
  } catch {
    return null;
  }
}
