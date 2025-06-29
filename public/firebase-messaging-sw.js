// Arka planda anlık bildirimleri alabilmek için gerekli Firebase servisi.
// Bu dosyanın içeriği genellikle değiştirilmez.

import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging/sw';

// Not: Bu yapılandırma bilgileri src/lib/firebase.ts dosyasındaki ile aynı olmalıdır.
const firebaseConfig = {
  apiKey: "AIzaSyBHLuoO7KM9ai0dMeCcGhmSHSVYCDO1rEo",
  authDomain: "yenidendeneme-ea9ed.firebaseapp.com",
  projectId: "yenidendeneme-ea9ed",
  storageBucket: "yenidendeneme-ea9ed.appspot.com",
  messagingSenderId: "903324685291",
  appId: "1:903324685291:web:2e82831fac65c682b3ffae",
  measurementId: "G-J3EB02J0LN"
};

const app = initializeApp(firebaseConfig);

// Arka plan mesajlaşmasını başlat
getMessaging(app);

// Arka plan bildirimlerini dinlemek için gereken tek şey bu.
// Firebase SDK gerisini halleder.
console.info('Firebase messaging service worker is running.');
