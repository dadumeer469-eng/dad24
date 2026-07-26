// Firebase Cloud Messaging Service Worker for Dadu Food Express
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize Firebase in Service Worker using applet credentials
firebase.initializeApp({
  apiKey: "AIzaSyDy1nSNE3BOBktBy5WXwGvuyyFHKGnWOpY",
  authDomain: "gen-lang-client-0422088194.firebaseapp.com",
  projectId: "gen-lang-client-0422088194",
  storageBucket: "gen-lang-client-0422088194.firebasestorage.app",
  messagingSenderId: "1050097353065",
  appId: "1:1050097353065:web:7dfe35f2281a020a24fdf8"
});

const messaging = firebase.messaging();

// Handle Background Push Messages from FCM
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);
  const notificationTitle = payload.notification?.title || '🛵 Dadu Food Express Update';
  const notificationOptions = {
    body: payload.notification?.body || 'A new update regarding your order is available!',
    icon: payload.notification?.icon || '/logo-192.png',
    badge: '/logo-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: payload.data?.url || '/',
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle Generic Push Events for fallback native notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || '🛵 Dadu Food Express';
      const options = {
        body: data.body || 'You have a new update from Dadu Food!',
        icon: data.icon || '/logo-192.png',
        badge: '/logo-192.png',
        vibrate: [200, 100, 200],
        data: { url: data.url || '/' },
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification('🛵 Dadu Food Express', {
          body: text,
          icon: '/logo-192.png',
          vibrate: [150, 100, 150],
        })
      );
    }
  }
});

// Focus or open app window on notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
