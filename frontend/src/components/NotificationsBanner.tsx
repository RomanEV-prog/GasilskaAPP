import { useState } from 'react';
import { isFcmConfigured, registerFcm } from '../firebase';

const DISMISS_KEY = 'notifBannerDismissed';

/**
 * Pasica »Vklopi obvestila« — dovoljenje za push se sme vprašati šele ob
 * kliku uporabnika (iOS to zahteva, drugod je vljudneje). Prikaže se, dokler
 * dovoljenje ni odobreno ali zavrnjeno, in jo je mogoče skriti.
 */
export function NotificationsBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0); // po registraciji ponovno preveri permission

  if (
    dismissed ||
    !isFcmConfigured ||
    !('Notification' in window) ||
    Notification.permission !== 'default'
  ) {
    return null;
  }

  const enable = async () => {
    setBusy(true);
    await registerFcm();
    setBusy(false);
    setTick((t) => t + 1); // permission se je spremenil → pasica izgine
  };

  const hide = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignoriraj */
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
      <span className="flex-1">
        🔔 Vklopi obvestila, da ne zamudiš dogodkov in sporočil društva.
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={enable}
          disabled={busy}
          className="rounded-lg bg-primary px-3 py-1.5 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Vklapljam ...' : 'Vklopi'}
        </button>
        <button
          onClick={hide}
          className="px-2 text-blue-400 hover:text-blue-700"
          aria-label="Skrij"
        >
          ×
        </button>
      </div>
    </div>
  );
}
