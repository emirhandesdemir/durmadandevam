// public/firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyBHLuoO7KM9ai0dMeCcGhmSHSVYCDO1rEo",
  authDomain: "yenidendeneme-ea9ed.firebaseapp.com",
  projectId: "yenidendeneme-ea9ed",
  storageBucket: "yenidendeneme-ea9ed.appspot.com",
  messagingSenderId: "903324685291",
  appId: "1:903324685291:web:2e82831fac65c682b3ffae",
  measurementId: "G-J3EB02J0LN"
};

firebase.initializeApp(firebaseConfig);

if (firebase.messaging.isSupported()) {
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log(
        "[firebase-messaging-sw.js] Received background message ",
        payload
      );

      const notificationTitle = payload.notification.title;
      const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon || "/icons/icon-192x192.png",
        data: {
            url: payload.fcmOptions?.link || '/'
        }
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });

    self.addEventListener('notificationclick', (event) => {
        event.notification.close();
        const targetUrl = event.notification.data.url || '/';
        event.waitUntil(
            self.clients.matchAll({ type: 'window' }).then(clientsArr => {
                // If a Window tab matching the targeted URL already exists, focus that.
                const hadWindowToFocus = clientsArr.some(windowClient => {
                    if (windowClient.url === targetUrl) {
                        windowClient.focus();
                        return true;
                    }
                    return false;
                });
                
                // Otherwise, open a new tab to the applicable URL and focus it.
                if (!hadWindowToFocus && self.clients.openWindow) {
                   return self.clients.openWindow(targetUrl);
                }
            })
        );
    });
}
