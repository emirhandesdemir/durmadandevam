// public/firebase-messaging-sw.js
// Bu dosya, PWA'nız kapalıyken bile Firebase'den gelen anlık bildirimleri yakalar ve görüntüler.

// ÖNEMLİ: Service Worker'lar kendi kapsamlarında çalışır ve doğrudan DOM'a erişemezler.
// Bu yüzden Firebase SDK'larının özel 'sw' (service worker) sürümlerini kullanırız.

try {
  // Firebase SDK'larını içe aktar
  self.importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js');
  self.importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js');

  // Firebase yapılandırmanızı buraya yapıştırın.
  // Bu bilgiler, uygulamanızdaki `src/lib/firebase.ts` dosyasındakilerle aynı olmalıdır.
  const firebaseConfig = {
      apiKey: "AIzaSyBHLuoO7KM9ai0dMeCcGhmSHSVYCDO1rEo",
      authDomain: "yenidendeneme-ea9ed.firebaseapp.com",
      projectId: "yenidendeneme-ea9ed",
      storageBucket: "yenidendeneme-ea9ed.appspot.com",
      messagingSenderId: "903324685291",
      appId: "1:903324685291:web:2e82831fac65c682b3ffae"
  };

  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Arka planda gelen mesajları dinle
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Arka plan mesajı alındı: ', payload);
    
    // Gelen payload'dan bildirim başlığını ve seçeneklerini çıkar
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: payload.notification.icon || '/icons/icon-192x192.png',
      // 'data' alanı, bildirime tıklandığında hangi URL'nin açılacağını belirler
      data: {
          url: payload.fcmOptions?.link || '/' // Cloud Function'dan gelen link
      }
    };

    // Bildirimi kullanıcının ekranında göster
    self.registration.showNotification(notificationTitle, notificationOptions);
  });

  // Bildirime tıklandığında ne olacağını belirleyen event listener
  self.addEventListener('notificationclick', (event) => {
    // Bildirimi kapat
    event.notification.close();

    const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

    // Odaklanılacak veya açılacak pencereyi bulma/açma işlemini başlat
    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true // Diğer sekmelerdeki client'ları da dahil et
        }).then((clientList) => {
            // Eğer uygulama zaten o URL'de açıksa, o sekmeye odaklan
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // Eğer uygulama açık ama farklı bir sayfadaysa, o sayfaya git
            if (clientList.length > 0 && 'navigate' in clientList[0]) {
                 return clientList[0].navigate(urlToOpen).then(client => client.focus());
            }
            // Değilse yeni bir sekmede aç
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
  });

} catch (e) {
  console.error("Service Worker başlatılırken hata oluştu:", e);
}
