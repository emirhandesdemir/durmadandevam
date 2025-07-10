// scripts/firebase-messaging-sw.js
// Bu dosya, PWA'nın arka planda bildirim almasını sağlar.
// Tarayıcı, uygulama kapalıyken bile bu dosyayı çalıştırarak
// gelen bildirimleri dinler ve görüntüler.

// ÖNEMLİ: Bu dosyayı `public` klasöründe tutun.

import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// Firebase projenizin yapılandırma bilgileri.
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
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Arka planda gelen mesajları dinle.
onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Bildirimin başlığını ve içeriğini ayarla.
  const notificationTitle = payload.notification?.title || 'Yeni Bildirim';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/icons/icon-192x192.png'
  };

  // Bildirimi göster.
  self.registration.showNotification(notificationTitle, notificationOptions);
});
