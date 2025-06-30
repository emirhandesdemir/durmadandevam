// Import scripts for Firebase and Firebase Messaging
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js');

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
const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/icons/icon-192x192.png',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
