import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { app } from "../firebase";

let messagingInstance: any = null;

/**
 * Initializes Firebase Cloud Messaging & Service Worker for push notifications.
 * Prompts user for notification permission on initial launch.
 */
export async function initPushNotifications(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    console.log("Push notifications or service worker not supported in this browser environment.");
    return null;
  }

  try {
    // Check if FCM is supported in current environment
    const supported = await isSupported().catch(() => false);
    
    // Register Service Worker first
    let registration: ServiceWorkerRegistration | null = null;
    try {
      registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
      console.log("FCM Service Worker registered successfully with scope:", registration.scope);
    } catch (swErr) {
      console.warn("Service worker registration failed, attempting standard sw.js fallback:", swErr);
      try {
        registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (e) {
        console.warn("Fallback SW registration failed:", e);
      }
    }

    // Request Notification permission if default
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      console.log("Notification permission response:", permission);
    }

    if (Notification.permission !== "granted") {
      console.log("Notification permission was not granted.");
      return null;
    }

    // Initialize Messaging if supported
    if (supported && registration) {
      try {
        messagingInstance = getMessaging(app);

        // Listen for foreground FCM push messages
        onMessage(messagingInstance, (payload) => {
          console.log("Foreground FCM message received:", payload);
          const title = payload.notification?.title || "🛵 Dadu Food Express";
          const body = payload.notification?.body || "New update regarding your food order!";
          
          // Display native browser notification
          showNativeNotification(title, {
            body,
            icon: payload.notification?.icon || "/logo-192.png",
          });
        });

        // Retrieve FCM Registration Token if possible
        const currentToken = await getToken(messagingInstance, {
          serviceWorkerRegistration: registration,
        }).catch((err) => {
          console.warn("Could not retrieve FCM token (VAPID key might be needed or restricted iframe):", err);
          return null;
        });

        if (currentToken) {
          console.log("FCM Registration Token retrieved:", currentToken);
          localStorage.setItem("dadu_fcm_token", currentToken);
          return currentToken;
        }
      } catch (fcmErr) {
        console.warn("FCM Messaging setup notice:", fcmErr);
      }
    }

    return null;
  } catch (err) {
    console.error("Error in initPushNotifications:", err);
    return null;
  }
}

/**
 * Sends a native system push notification directly to the OS / device notification center.
 */
export function showNativeNotification(title: string, options: NotificationOptions = {}) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const defaultOptions: any = {
    icon: "/logo-192.png",
    badge: "/logo-192.png",
    vibrate: [200, 100, 200],
    tag: "dadu-food-notification",
    ...options,
  };

  try {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.showNotification(title, defaultOptions);
        })
        .catch(() => {
          new Notification(title, defaultOptions);
        });
    } else {
      new Notification(title, defaultOptions);
    }
  } catch (e) {
    console.warn("Error showing native notification:", e);
  }
}

/**
 * Explicitly requests notification permission upon user interaction (button click).
 */
export async function requestNotificationPermission(): Promise<string> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      // Re-initialize FCM & Service worker
      await initPushNotifications();
    }
    return permission;
  } catch (err) {
    console.warn("Error requesting notification permission:", err);
    return "denied";
  }
}

/**
 * Sends a test push notification & triggers haptic feedback for user verification.
 */
export function testNotificationAndHaptic() {
  showNativeNotification("🛵 Dadu Food Express Test Notification", {
    body: "Background push notifications & haptic feedback are fully operational! 🎉",
    icon: "/logo-192.png",
  });
}

export default {
  initPushNotifications,
  requestNotificationPermission,
  showNativeNotification,
  testNotificationAndHaptic,
};
