import { getApps, initializeApp } from 'firebase/app';

const env = import.meta.env || {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyCQFjvttmeWYhfpTcpyN3iolphmcVuOujY',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'nmmart-ca8f7.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'nmmart-ca8f7',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'nmmart-ca8f7.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '349627616977',
  appId: env.VITE_FIREBASE_APP_ID || '1:349627616977:web:32ba36717fb00d5e053ff0'
};

export const firebaseVapidKey = env.VITE_FIREBASE_VAPID_KEY ||
  'BJUBjGNZwhv123Q21HaFJI7pP5jopDd7ZfROQvAaPUzNqgxdlgNQkJ08JDdg-7mFttX-ukJJrOHY45ubNmQGKjE';

const appName = 'nm-mart-admin-push';

export const firebaseApp = getApps().find(app => app.name === appName) ||
  initializeApp(firebaseConfig, appName);