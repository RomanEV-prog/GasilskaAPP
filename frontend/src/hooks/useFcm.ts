import { useEffect } from 'react';
import { registerFcm } from '../firebase';
import { useAuth } from '../stores/auth.store';

/**
 * Ob prijavi osveži FCM žeton na backendu — a samo, če je dovoljenje za
 * obvestila že odobreno. Prvo vprašanje za dovoljenje sproži uporabnik
 * s klikom (NotificationsBanner); iOS gesto celo zahteva.
 * Vgradi se enkrat v AppLayout (znotraj zaščitenih poti).
 */
export function useFcm() {
  const { user } = useAuth();
  useEffect(() => {
    if (
      user &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      void registerFcm();
    }
  }, [user]);
}
