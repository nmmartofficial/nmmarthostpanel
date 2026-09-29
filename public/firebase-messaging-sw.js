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
  const data = payload.data || {};
  const isNewOrder = data.notification_type === 'new_order';
  const notificationTitle = notification.title || (isNewOrder ? '🔔 New Order Received' : 'NM MART');
  const notificationOptions = {
    body: notification.body || payload.data?.body || 'You have a new notification.',
    icon: notification.icon || '/favicon.ico',
    tag: isNewOrder && (data.order_id || data.order_number)
      ? `nm-order-${data.order_id || data.order_number}`
      : undefined,
    renotify: false,
    silent: false,
    data
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = new URL('/nm-mart/dashboard?tab=Orders', self.location.origin);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existingClient = windows.find(client => new URL(client.url).origin === self.location.origin);

    if (existingClient) {
      const targetClient = await existingClient.navigate(targetUrl.href);
      await (targetClient || existingClient).focus();
      return;
    }

    await self.clients.openWindow(targetUrl.href);
  })());
});