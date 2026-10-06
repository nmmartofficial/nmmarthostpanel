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

const playOrderSoundInOpenClient = (client, payload) => new Promise(resolve => {
  const channel = new MessageChannel();
  const timeout = setTimeout(() => {
    channel.port1.close();
    resolve(false);
  }, 350);

  channel.port1.onmessage = event => {
    clearTimeout(timeout);
    channel.port1.close();
    resolve(event.data?.played === true);
  };

  try {
    client.postMessage({ type: 'NM_MART_NEW_ORDER_SOUND', payload }, [channel.port2]);
  } catch {
    clearTimeout(timeout);
    channel.port1.close();
    resolve(false);
  }
});

messaging.onBackgroundMessage(async payload => {
  const notification = payload.notification || {};
  const data = payload.data || {};
  const isNewOrder = data.notification_type === 'new_order';
  let customSoundPlayed = false;

  if (isNewOrder) {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const orderedClients = clients.sort((left, right) => Number(right.focused) - Number(left.focused));

    for (const client of orderedClients) {
      if (await playOrderSoundInOpenClient(client, { notification, data })) {
        customSoundPlayed = true;
        break;
      }
    }
  }

  const notificationTitle = notification.title || (isNewOrder ? '🔔 New Order Received' : 'NM MART');
  const notificationOptions = {
    body: notification.body || payload.data?.body || 'You have a new notification.',
    icon: notification.icon || '/favicon.ico',
    tag: isNewOrder && (data.order_id || data.order_number)
      ? `nm-order-${data.order_id || data.order_number}`
      : undefined,
    renotify: false,
    silent: customSoundPlayed,
    data
  };

  await self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = new URL('/orders', self.location.origin);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existingClient = windows.find(client => new URL(client.url).origin === targetUrl.origin);

    if (existingClient) {
      const targetClient = await existingClient.navigate(targetUrl.href);
      await (targetClient || existingClient).focus();
      return;
    }

    await self.clients.openWindow(targetUrl.href);
  })());
});