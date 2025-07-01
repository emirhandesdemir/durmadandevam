// Bu dosya, PWA anlık bildirimlerinin çalışması için zorunludur.
// Arka planda gelen mesajları dinler ve bildirim olarak gösterir.

// Firebase'in uyumluluk (compat) kütüphanelerini içe aktar.
// Service Worker ortamında bu yöntem daha güvenilirdir.
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Firebase yapılandırma bilgileri.
// Bu bilgiler `src/lib/firebase.ts` dosyasıyla aynı olmalıdır.
const firebaseConfig = {
  apiKey: "AIzaSyBHLuoO7KM9ai0dMeCcGhmSHSVYCDO1rEo",
  authDomain: "yenidendeneme-ea9ed.firebaseapp.com",
  projectId: "yenidendeneme-ea9ed",
  storageBucket: "yenidendeneme-ea9ed.appspot.com",
  messagingSenderId: "903324685291",
  appId: "1:903324685291:web:2e82831fac65c682b3ffae",
  measurementId: "G-J3EB02J0LN"
};

// Firebase uygulamasını başlat.
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Arka planda bir mesaj geldiğinde çalışacak olan dinleyici.
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Arka plan mesajı alındı: ', payload);

  // Gelen veriden bildirim başlığını ve seçeneklerini oluştur.
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: payload.data.icon,
    data: {
      url: payload.data.link, // Tıklanınca açılacak URL'yi veriye ekle.
    },
  };

  // Bildirimi kullanıcıya göster.
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Kullanıcı bildirime tıkladığında çalışacak olan dinleyici.
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Bildirimi kapat.

  // Tıklanınca açılacak olan URL'yi al.
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  // Mevcut bir sekme varsa ona odaklan, yoksa yeni bir sekme aç.
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    let matchingClient = null;

    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url === urlToOpen) {
        matchingClient = windowClient;
        break;
      }
    }

    if (matchingClient) {
      return matchingClient.focus();
    } else {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});
