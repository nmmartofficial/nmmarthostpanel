import { firebaseApp, firebaseConfig, firebaseVapidKey } from '../lib/firebase.js';

const FIREBASE_MESSAGING_WORKER_PATH = '/firebase-messaging-sw.js';
const FIREBASE_MESSAGING_WORKER_SCOPE = '/firebase-messaging/';

const result = (status, token = null) => ({ status, token });

async function waitForWorkerActivation(registration) {
  if (registration.active) return registration;

  const worker = registration.installing || registration.waiting;
  if (!worker) throw new Error('Firebase messaging service worker did not start.');

  await new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      worker.removeEventListener('statechange', onStateChange);
      reject(new Error('Timed out while activating the Firebase messaging service worker.'));
    }, 15000);

    const onStateChange = () => {
      if (worker.state === 'activated') {
        window.clearTimeout(timeout);
        worker.removeEventListener('statechange', onStateChange);
        resolve();
      } else if (worker.state === 'redundant') {
        window.clearTimeout(timeout);
        worker.removeEventListener('statechange', onStateChange);
        reject(new Error('Firebase messaging service worker could not be installed.'));
      }
    };

    worker.addEventListener('statechange', onStateChange);
    onStateChange();
  });

  if (!registration.active) throw new Error('Firebase messaging service worker is not active.');
  return registration;
}

async function registerFirebaseMessagingWorker() {
  const expectedScope = new URL(FIREBASE_MESSAGING_WORKER_SCOPE, window.location.origin).href;
  const registrations = await navigator.serviceWorker.getRegistrations();
  const existing = registrations.find(registration => registration.scope === expectedScope);

  if (existing) {
    const worker = existing.active || existing.waiting || existing.installing;
    const workerPath = worker && new URL(worker.scriptURL).pathname;
    if (workerPath !== FIREBASE_MESSAGING_WORKER_PATH) {
      throw new Error('A different service worker already uses the Firebase messaging scope.');
    }
    return waitForWorkerActivation(existing);
  }

  const workerUrl = new URL(FIREBASE_MESSAGING_WORKER_PATH, window.location.origin);
  workerUrl.searchParams.set('config', JSON.stringify(firebaseConfig));

  const registration = await navigator.serviceWorker.register(workerUrl.href, {
    scope: FIREBASE_MESSAGING_WORKER_SCOPE
  });
  return waitForWorkerActivation(registration);
}

export async function requestAdminFcmToken() {
  if (
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    typeof Notification === 'undefined' ||
    !window.isSecureContext ||
    !navigator.serviceWorker
  ) {
    return result('unsupported');
  }

  if (Notification.permission === 'denied') return result('permission-denied');

  const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
  if (!(await isSupported())) return result('unsupported');

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();

  if (permission !== 'granted') return result('permission-not-granted');

  const registration = await registerFirebaseMessagingWorker();
  const token = await getToken(getMessaging(firebaseApp), {
    vapidKey: firebaseVapidKey,
    serviceWorkerRegistration: registration
  });

  return token ? result('granted', token) : result('token-unavailable');
}