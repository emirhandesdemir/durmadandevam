// Import the Firebase app and messaging packages.
// These are imported using importScripts, and are used via the global
// 'firebase' object.
self.importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
self.importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyBHLuoO7KM9ai0dMeCcGhmSHSVYCDO1rEo",
    authDomain: "yenidendeneme-ea9ed.firebaseapp.com",
    projectId: "yenidendeneme-ea9ed",
    storageBucket: "yenidendeneme-ea9ed.appspot.com",
    messagingSenderId: "903324685291",
    appId: "1:903324685291:web:2e82831fac65c682b3ffae",
    measurementId: "G-J3EB02J0LN"
};

// Initialize the Firebase app in the service worker
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// If you want to handle background messages, add a handler for it
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.data?.title || "Yeni Bildirim";
  const notificationOptions = {
    body: payload.data?.body || "",
    icon: payload.data?.icon || "/icons/icon.svg",
    data: {
      url: payload.data?.link || '/' 
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const notificationData = event.notification.data;
  
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Use the full URL from the event's data.
            // Fallback to '/' if not present.
            const urlToOpen = new URL(notificationData.url || '/', self.location.origin).href;

            // Check if there's already a window open with the same URL.
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }

            // If not, open a new window.
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
