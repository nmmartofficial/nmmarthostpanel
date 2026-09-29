importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

const configParameter = new URL(self.location.href).searchParams.get('config');
if (!configParameter) throw new Error('Firebase configuration is missing from the messaging worker URL.');

firebase.initializeApp(JSON.parse(configParameter));

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const notification = payload.notification || {};
  const notificationTitle = notification.title || 'NM MART';
  const notificationOptions = {
    body: notification.body || payload.data?.body || 'You have a new notification.',
    icon: notification.icon || '/favicon.ico',
    data: payload.data || {}
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/nm-mart/dashboard'));
});