/* eslint-disable no-undef */
// Service worker za Firebase Cloud Messaging (obvestila v ozadju).
//
// POMEMBNO: service worker NE more brati Vite env spremenljivk, zato je
// spodnja konfiguracija zapisana neposredno. Web Firebase config NI skrivnost.
// Zamenjaj vrednosti s svojimi iz Firebase konzole (Project settings → Web app).

importScripts(
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js',
);
importScripts(
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js',
);

firebase.initializeApp({
  apiKey: 'AIzaSyC7tiDewIFkLAYgpLmw8TbYQpd03NrYJGE',
  authDomain: 'gasilapp.firebaseapp.com',
  projectId: 'gasilapp',
  storageBucket: 'gasilapp.firebasestorage.app',
  messagingSenderId: '787182190075',
  appId: '1:787182190075:web:ef6aecbee1e6bd7652df5e',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  if (title) {
    self.registration.showNotification(title, {
      body: body || '',
      icon: '/vite.svg',
    });
  }
});
