// public/firebase-messaging-sw.js

// This file needs to be in the public directory
// Make sure you have the correct firebase-app and firebase-messaging-sw js files
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHLuoO7KM9ai0dMeCcGhmSHSVYCDO1rEo",
  authDomain: "yenidendeneme-ea9ed.firebaseapp.com",
  projectId: "yenidendeneme-ea9ed",
  storageBucket: "yenidendeneme-ea9ed.appspot.com",
  messagingSenderId: "903324685291",
  appId: "1:903324685291:web:2e82831fac65c682b3ffae",
  measurementId: "G-J3EB02J0LN"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);
  
  // Customize notification here. We use the data payload for consistency.
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: payload.data.icon || '/icons/icon-192x192.png',
    data: {
        url: payload.data.link // Pass the URL to the 'notificationclick' event
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click to open the correct URL
self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // Close the notification

    const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

    // This looks for an existing window and focuses it.
    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then((clientList) => {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
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
