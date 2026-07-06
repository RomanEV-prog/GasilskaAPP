import { useEffect } from 'react';
import { registerFcm } from '../firebase';
import { useAuth } from '../stores/auth.store';

/**
 * Ob prijavi registrira FCM žeton na backendu.
 * Vgradi se enkrat v AppLayout (znotraj zaščitenih poti).
 */
export function useFcm() {
  const { user } = useAuth();
  useEffect(() => {
    if (user) {
      void registerFcm();
    }
  }, [user]);
}
