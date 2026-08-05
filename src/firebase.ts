import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setLogLevel } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import appletConfig from "../firebase-applet-config.json";

// Silence verbose Firebase network warnings in restricted environments
setLogLevel("error");

// Safe loading of config using Vite environment variables or local applet fallback
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || appletConfig.appId,
  measurementId: (import.meta as any).env.VITE_FIREBASE_MEASUREMENT_ID || (appletConfig as any).measurementId,
};

// Initialize Firebase App
console.log("Firebase Init Config:", { ...firebaseConfig, apiKey: "***" });
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Analytics safely (only if supported and measurementId is present)
let analytics: any = null;
if (firebaseConfig.measurementId && typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (e) {
        console.warn("Analytics initialization skipped:", e);
      }
    }
  }).catch(() => {
    // Ignore analytics check failures in restricted iframe/sandbox environments
  });
}

// Initialize Firestore with robust multi-tab IndexedDB cache for instant offline access
const databaseId = (import.meta as any).env.VITE_FIREBASE_DATABASE_ID || appletConfig.firestoreDatabaseId;
console.log("Firestore Initializing with Database ID:", databaseId);

const firestoreSettings = {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
};

const db = databaseId 
  ? initializeFirestore(app, firestoreSettings, databaseId) 
  : initializeFirestore(app, firestoreSettings);

console.log("Firestore instance initialized successfully with IndexedDB cache.");

// Initialize Auth
const auth = getAuth(app);
const storage = getStorage(app);

// Graceful FireStore Error Mapper for diagnostics
export function handleFirestoreError(err: any): string {
  console.error("Firestore operation failure:", err);
  if (err?.code === "resource-exhausted" || err?.message?.includes("Quota")) {
    return "Dadu's daily Firebase limits reached! Everything will continue to run beautifully offline.";
  }
  if (err?.code === "permission-denied") {
    return "Database permission denied. (Database ke rules lagane/auth permissions check karein).";
  }
  return err?.message || "Something went wrong in real-time communication. Please reload.";
}

// Recursively remove undefined fields to avoid Firestore "Unsupported field value: undefined" validation errors
export function cleanObject<T = any>(obj: any): T {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj as any;
  if (Array.isArray(obj)) {
    return obj.map(v => cleanObject(v)) as any;
  }
  if (typeof obj === 'object') {
    const proto = Object.getPrototypeOf(obj);
    if (proto !== null && proto !== Object.prototype) {
      return obj;
    }
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = cleanObject(val);
      }
    }
    return cleaned;
  }
  return obj;
}

export { app, db, auth, storage, analytics, firebaseConfig, databaseId };
