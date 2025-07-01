// Bu dosya, Firebase Cloud Messaging için arka plan servis çalışanıdır.
// Uygulama kapalıyken veya arka plandayken gelen anlık bildirimleri yönetir.

// Gerekli Firebase SDK'larını import et.
importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js");

// Firebase yapılandırma bilgileri (bu bilgiler herkese açıktır).
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

// Messaging servisini al.
const messaging = firebase.messaging();

// Arka planda bir bildirim alındığında ne yapılacağını belirle.
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Arka planda bildirim alındı: ",
    payload
  );

  // Bildirim verilerini ayıkla.
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: payload.data.icon,
    data: {
        // Tıklanınca açılacak linki 'data' objesine ekle.
        link: payload.data.link
    }
  };

  // Kullanıcıya bildirimi göster.
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Bildirime tıklandığında ne olacağını belirleyen olay dinleyici.
self.addEventListener('notificationclick', (event) => {
    // Bildirim penceresini kapat.
    event.notification.close();
    
    // Bildirim verisindeki linki al.
    const link = event.notification.data.link;

    // Eğer bir link varsa, o linki yeni bir sekmede açmaya çalış.
    if (link) {
        event.waitUntil(clients.openWindow(link));
    }
});
