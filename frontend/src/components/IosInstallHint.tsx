import { useState } from 'react';

const DISMISS_KEY = 'iosInstallHintDismissed';

/** Ali stran teče na iPhonu/iPadu v brskalniku (ne kot nameščena PWA)? */
function isIosBrowser(): boolean {
  const ua = navigator.userAgent;
  const isIos =
    /iPhone|iPad|iPod/.test(ua) ||
    // iPadOS se predstavlja kot Mac, a ima zaslon na dotik
    (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari-specifično polje (ni v tipih)
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return isIos && !standalone;
}

/**
 * Namig za iPhone: push obvestila na iOS delujejo šele, ko je stran dodana
 * na začetni zaslon (Safari → Deli → Dodaj na začetni zaslon).
 */
export function IosInstallHint() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (dismissed || !isIosBrowser()) return null;

  return (
    <div className="relative mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <button
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(DISMISS_KEY, '1');
          } catch {
            /* ignoriraj */
          }
        }}
        className="absolute right-2 top-2 px-1 text-amber-500 hover:text-amber-800"
        aria-label="Skrij namig"
      >
        ×
      </button>
      <p className="font-semibold">📱 Imaš iPhone?</p>
      <p className="mt-1">
        Dodaj GasilApp na začetni zaslon in dobivala boš tudi obvestila: v
        Safariju pritisni <strong>Deli</strong>{' '}
        <span aria-hidden>(kvadrat s puščico)</span> →{' '}
        <strong>Dodaj na začetni zaslon</strong>, nato aplikacijo odpiraj z
        ikono 🚒.
      </p>
    </div>
  );
}
