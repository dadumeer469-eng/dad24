import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import appletConfig from "../firebase-applet-config.json";

// Safe loading of config using Vite environment variables or local applet fallback
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || appletConfig.appId,
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore
const databaseId = (import.meta as any).env.VITE_FIREBASE_DATABASE_ID || appletConfig.firestoreDatabaseId;
const db = getFirestore(app, databaseId);

// Initialize Auth
const auth = getAuth(app);

// Graceful FireStore Error Mapper for diagnostics
export function handleFirestoreError(err: any): string {
  console.error("Firestore operation failure:", err);
  if (err?.code === "permission-denied") {
    return "Database permission denied. (Database ke rules lagane/auth permissions check karein).";
  }
  return err?.message || "Something went wrong in real-time communication. Please reload.";
}

export { app, db, auth };
