// Firebase SDK'larını içe aktar (importScripts ile)
importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js");

// Firebase yapılandırması (projenizin ayarlarından alınmalıdır)
const firebaseConfig = {
  apiKey: "AIzaSyBHLuoO7KM9ai0dMeCcGhmSHSVYCDO1rEo",
  authDomain: "yenidendeneme-ea9ed.firebaseapp.com",
  projectId: "yenidendeneme-ea9ed",
  storageBucket: "yenidendeneme-ea9ed.appspot.com",
  messagingSenderId: "903324685291",
  appId: "1:903324685291:web:2e82831fac65c682b3ffae",
  measurementId: "G-J3EB02J0LN"
};


// Firebase uygulamasını başlat
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Arka planda gelen bildirimleri dinle
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: payload.data.icon,
    data: {
      link: payload.data.link || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});


// Bildirime tıklanma olayını dinle
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();

  const link = event.notification.data.link;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Zaten açık olan bir pencere olup olmadığını kontrol et
      for (const client of clientList) {
        // Eğer aynı linke sahip bir pencere açıksa, ona odaklan
        if (new URL(client.url).pathname === link && 'focus' in client) {
          return client.focus();
        }
      }
      // Eğer açık pencere yoksa, yeni bir tane aç
      if (clients.openWindow) {
        return clients.openWindow(link);
      }
    })
  );
});
