import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** Generira QR kodo iz niza (lokalno, brez omrežja). */
export function QrCode({ value, size = 160 }: { value: string; size?: number }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then((u) => active && setUrl(u))
      .catch(() => active && setUrl(''));
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!url) return null;
  return <img src={url} width={size} height={size} alt={`QR: ${value}`} />;
}
