/**
 * Računanje datumov naročnine.
 *
 * Naročnina društva je `organizations.subscription_expires_at`;
 * `null` pomeni neomejeno.
 */

/**
 * Prišteje mesece datumu in pripne dan v mesecu, kadar ciljni mesec nima
 * toliko dni. Brez tega bi 31. januar + 1 mesec padel na 3. marec
 * (JavaScript `setMonth` prelije čez konec meseca).
 */
export function addMonths(base: Date, months: number): Date {
  const result = new Date(base.getTime());
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDayOfTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();
  result.setDate(Math.min(day, lastDayOfTargetMonth));
  return result;
}

/**
 * Nov datum poteka ob unovčenju kode.
 *
 * Če naročnina še teče, se meseci **prištejejo obstoječemu roku** (društvo
 * ne izgubi preostanka, če podaljša predčasno). Če je že potekla, se šteje
 * od danes naprej.
 */
export function extendSubscription(
  current: Date | null | undefined,
  months: number,
  now: Date = new Date(),
): Date {
  const base = current && current.getTime() > now.getTime() ? current : now;
  return addMonths(base, months);
}

/** Ali je naročnina potekla. `null` (neomejeno) ni nikoli potekla. */
export function isExpired(
  expiresAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  return !!expiresAt && expiresAt.getTime() <= now.getTime();
}

/** Koliko dni je še do poteka; `null` pri neomejeni naročnini. */
export function daysUntilExpiry(
  expiresAt: Date | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!expiresAt) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((expiresAt.getTime() - now.getTime()) / msPerDay);
}
