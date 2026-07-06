import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from 'firebase/messaging';
import { authApi } from './api/auth.api';

/**
 * Firebase web konfiguracija — iz VITE_FIREBASE_* env spremenljivk.
 * Če ni nastavljena (razvoj), FCM gracefully ne dela.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/** Ali je Firebase sploh konfiguriran. */
export const isFcmConfigured = Boolean(firebaseConfig.apiKey && vapidKey);

let app: FirebaseApp | undefined;
let messaging: Messaging | undefined;

/**
 * Zaprosi za dovoljenje, pridobi FCM žeton in ga pošlje na backend.
 * Kliči po uspešni prijavi. Vse napake se tiho pogoltnejo (FCM je opcijski).
 */
export async function registerFcm(): Promise<void> {
  if (!isFcmConfigured) return;
  try {
    if (!(await isSupported())) return;
    if (!('Notification' in window)) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    app ??= initializeApp(firebaseConfig);
    messaging ??= getMessaging(app);

    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
    );

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    if (token) {
      await authApi.updateFcmToken(token);
    }

    // Obvestila v ospredju (ko je zavihek odprt).
    onMessage(messaging, (payload) => {
      const { title, body } = payload.notification ?? {};
      if (title && 'Notification' in window) {
        new Notification(title, { body: body ?? '' });
      }
    });
  } catch (err) {
    // FCM je opcijski — ne blokiraj aplikacije.
    // eslint-disable-next-line no-console
    console.warn('FCM registracija ni uspela:', err);
  }
}
