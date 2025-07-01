// Bu dosya, tarayıcıda arka planda çalışarak anlık bildirimleri yönetir.
// Uygulama kapalıyken bile bildirimlerin alınmasını ve gösterilmesini sağlar.

// Gerekli Firebase kütüphanelerini import et (tarayıcı uyumlu 'compat' versiyonları).
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Firebase yapılandırma bilgileri (bu bilgiler herkese açıktır).
// Not: `storageBucket` değeri, kullanıcının isteği üzerine değiştirilmemiştir.
const firebaseConfig = {
  apiKey: "AIzaSyBHLuoO7KM9ai0dMeCcGhmSHSVYCDO1rEo",
  authDomain: "yenidendeneme-ea9ed.firebaseapp.com",
  projectId: "yenidendeneme-ea9ed",
  storageBucket: "yenidendeneme-ea9ed",
  messagingSenderId: "903324685291",
  appId: "1:903324685291:web:2e82831fac65c682b3ffae",
  measurementId: "G-J3EB02J0LN"
};

// Firebase uygulamasını başlat.
firebase.initializeApp(firebaseConfig);

// Messaging servisini al.
const messaging = firebase.messaging();

// Arka planda bir bildirim geldiğinde tetiklenecek fonksiyon.
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Arka plan mesajı alındı: ",
    payload,
  );

  // Bildirim başlığını ve seçeneklerini ayarla.
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: payload.data.icon,
    data: {
        url: payload.data.link // Bildirime tıklandığında açılacak URL.
    }
  };

  // Bildirimi tarayıcıda göster.
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Kullanıcı bir bildirime tıkladığında tetiklenecek olay dinleyicisi.
self.addEventListener('notificationclick', (event) => {
    // Bildirimi kapat.
    event.notification.close();
    // Bildirim verisinden URL'yi al veya varsayılan olarak ana sayfayı aç.
    const urlToOpen = event.notification.data.url || '/';
    // Yeni bir pencere veya sekmede ilgili URL'yi aç.
    event.waitUntil(
        clients.openWindow(urlToOpen)
    );
});
