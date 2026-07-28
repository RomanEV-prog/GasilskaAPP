/**
 * Podatki izdajatelja računov (tvoja firma).
 *
 * Berejo se iz okolja, ker se med razvojem in produkcijo razlikujejo in ne
 * sodijo v git. Nastavi jih v `.env.prod` — glej `backend/.env.example`.
 *
 * Slovenski račun mora vsebovati: naziv in naslov izdajatelja, davčno
 * številko, zaporedno številko računa, datum izdaje, opis storitve, znesek
 * in razčlenitev DDV. Če nisi zavezanec za DDV, mora biti na računu
 * navedena podlaga (privzeto besedilo spodaj) — takrat pusti
 * `INVOICE_VAT_RATE` na 0.
 *
 * Davčno potrjevanje računov (furs) velja za gotovinsko poslovanje;
 * plačila po položnici/nakazilu vanj ne sodijo.
 */
export interface IzdajateljPodatki {
  name: string;
  address: string;
  post: string;
  taxNumber: string;
  registrationNumber?: string;
  vatId?: string;
  iban: string;
  bank?: string;
  email: string;
  phone?: string;
  website?: string;
  /** Privzeta stopnja DDV v odstotkih; 0 = nezavezanec. */
  vatRate: number;
  /** Opomba pod zneskom (podlaga za oprostitev DDV ipd.). */
  footerNote: string;
  /** Privzet rok plačila v dneh. */
  paymentDays: number;
  /** Privzeta cena letne naročnine v EUR. */
  yearlyPrice: number;
  /** Privzeta cena mesečne naročnine v EUR. */
  monthlyPrice: number;
}

const NEZAVEZANEC =
  'DDV ni obračunan na podlagi 1. odstavka 94. člena ZDDV-1 ' +
  '(mali davčni zavezanec).';

function env(key: string, fallback = ''): string {
  return process.env[key]?.trim() || fallback;
}

function envNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  const parsed = raw !== undefined ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Trenutni podatki izdajatelja. Bere se ob vsakem klicu, da sprememba v
 * okolju ne zahteva ponovnega prevoda (le ponovni zagon vsebnika).
 */
export function izdajatelj(): IzdajateljPodatki {
  return {
    name: env('INVOICE_ISSUER_NAME', 'Ni nastavljeno (INVOICE_ISSUER_NAME)'),
    address: env('INVOICE_ISSUER_ADDRESS'),
    post: env('INVOICE_ISSUER_POST'),
    taxNumber: env('INVOICE_ISSUER_TAX'),
    registrationNumber: env('INVOICE_ISSUER_REG') || undefined,
    vatId: env('INVOICE_ISSUER_VAT_ID') || undefined,
    iban: env('INVOICE_ISSUER_IBAN'),
    bank: env('INVOICE_ISSUER_BANK') || undefined,
    email: env('INVOICE_ISSUER_EMAIL'),
    phone: env('INVOICE_ISSUER_PHONE') || undefined,
    website: env('INVOICE_ISSUER_WEBSITE') || undefined,
    vatRate: envNumber('INVOICE_VAT_RATE', 0),
    footerNote: env('INVOICE_FOOTER_NOTE', NEZAVEZANEC),
    paymentDays: envNumber('INVOICE_PAYMENT_DAYS', 8),
    yearlyPrice: envNumber('INVOICE_YEARLY_PRICE', 0),
    monthlyPrice: envNumber('INVOICE_MONTHLY_PRICE', 0),
  };
}

/** Ali so obvezni podatki izpolnjeni — vmesnik na to opozori. */
export function izdajateljManjka(p: IzdajateljPodatki): string[] {
  const manjka: string[] = [];
  if (!p.address) manjka.push('naslov');
  if (!p.post) manjka.push('pošta');
  if (!p.taxNumber) manjka.push('davčna številka');
  if (!p.iban) manjka.push('IBAN');
  if (!p.email) manjka.push('e-pošta');
  if (p.name.startsWith('Ni nastavljeno')) manjka.push('naziv');
  return manjka;
}
