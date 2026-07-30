import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * TOTP po RFC 6238 (SHA-1, 6 mest, 30 s korak) — združljivo z Google
 * Authenticator, Aegis, 1Password ... Lastna implementacija na node `crypto`,
 * ker so aktualne TOTP knjižnice ESM-only in se lomijo v Jest/CJS okolju
 * (otplib v13 → @scure/base v2).
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIOD_SECONDS = 30;
const DIGITS = 6;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

export function base32Decode(input: string): Buffer {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of input.replace(/=+$/, '').toUpperCase()) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue; // presledki/vezaji iz ročnega vnosa
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Nova naključna skrivnost (160 bitov, base32). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(secretBuf: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', secretBuf).update(msg).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return code.toString().padStart(DIGITS, '0');
}

/**
 * Preveri kodo z dovoljenim zamikom ±1 korak (±30 s) — ura telefona ni
 * nujno točna. Primerjava v konstantnem času.
 */
export function verifyTotpCode(secret: string, token: string): boolean {
  const normalized = token.replace(/\D/g, '');
  if (normalized.length !== DIGITS) return false;
  const secretBuf = base32Decode(secret);
  if (secretBuf.length === 0) return false;
  const counter = Math.floor(Date.now() / 1000 / PERIOD_SECONDS);
  const tokenBuf = Buffer.from(normalized);
  for (const delta of [0, -1, 1]) {
    const expected = Buffer.from(hotp(secretBuf, counter + delta));
    if (
      expected.length === tokenBuf.length &&
      timingSafeEqual(expected, tokenBuf)
    ) {
      return true;
    }
  }
  return false;
}

/** otpauth:// URI za QR kodo (Google Authenticator format). */
export function buildOtpauthUri(
  issuer: string,
  label: string,
  secret: string,
): string {
  const enc = encodeURIComponent;
  return `otpauth://totp/${enc(issuer)}:${enc(label)}?secret=${secret}&issuer=${enc(
    issuer,
  )}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD_SECONDS}`;
}
