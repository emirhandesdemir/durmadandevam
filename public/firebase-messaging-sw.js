// This service worker can be customized!
// See https://developers.google.com/web/tools/workbox/modules
// for more information.
if (typeof self !== 'undefined') {
    // eslint-disable-next-line no-undef
    importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
    // eslint-disable-next-line no-undef
    importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

    const firebaseConfig = {
        apiKey: "AIzaSyBHLuoO7KM9ai0dMeCcGhmSHSVYCDO1rEo",
        authDomain: "yenidendeneme-ea9ed.firebaseapp.com",
        projectId: "yenidendeneme-ea9ed",
        storageBucket: "yenidendeneme-ea9ed",
        messagingSenderId: "903324685291",
        appId: "1:903324685291:web:2e82831fac65c682b3ffae",
        measurementId: "G-J3EB02J0LN"
    };

    // Initialize the Firebase app in the service worker by passing in the
    // messagingSenderId.
    firebase.initializeApp(firebaseConfig);

    // Retrieve an instance of Firebase Messaging so that it can handle background
    // messages.
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw.js] Received background message ', payload);
        
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
            body: payload.notification.body,
            icon: payload.notification.icon || '/icons/icon.svg',
            data: {
                link: payload.fcmOptions.link // Use the link provided by FCM
            }
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });
    
    // This event listener is for clicking on the notification
    self.addEventListener('notificationclick', (event) => {
        console.log('On notification click: ', event.notification);
        event.notification.close();
        
        const link = event.notification.data.link;
        if (link) {
            event.waitUntil(clients.openWindow(link));
        }
    });

}
