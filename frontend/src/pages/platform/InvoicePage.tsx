import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { platformApi } from '../../api/platform.api';
import { Button, ErrorState, Spinner } from '../../components/ui';
import type { InvoiceIssuer, PlatformInvoice } from '../../types';

function formatDate(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('sl-SI') : '—';
}

function formatEur(value: number): string {
  return new Intl.NumberFormat('sl-SI', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

/** Sklic po pravilu SI00 — številka računa brez vezaja (2026-001 → SI00 2026001). */
function sklic(number: string): string {
  return `SI00 ${number.replace('-', '')}`;
}

/** Besedilo e-pošte, ki spremlja račun. */
function emailText(
  invoice: PlatformInvoice,
  issuer: InvoiceIssuer,
  gross: number,
): string {
  return [
    `Spoštovani,`,
    ``,
    `v prilogi vam pošiljamo račun št. ${invoice.number} za naročnino na Plamen`,
    `za obdobje od ${formatDate(invoice.periodFrom)} do ${formatDate(invoice.periodTo)}.`,
    ``,
    `Znesek za plačilo: ${formatEur(gross)}`,
    `Rok plačila: ${formatDate(invoice.dueAt)}`,
    `IBAN: ${issuer.iban}`,
    `Sklic: ${sklic(invoice.number)}`,
    ``,
    `Po prejemu plačila vam pošljemo aktivacijsko kodo, s katero v aplikaciji`,
    `podaljšate naročnino (Nastavitve → aktivacijska koda).`,
    ``,
    `Lep pozdrav,`,
    issuer.name,
    issuer.email,
  ].join('\n');
}

/**
 * Natisljiv račun (A4). Brskalnikov »Natisni → Shrani kot PDF« naredi
 * datoteko za e-pošto — brez knjižnice za PDF na strežniku.
 */
export function InvoicePage() {
  const { id = '' } = useParams();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['platform', 'invoice', id],
    queryFn: () => platformApi.getInvoice(id),
    enabled: !!id,
  });

  if (isLoading) return <Spinner />;
  if (isError || !data) return <ErrorState message="Računa ni bilo mogoče naložiti." />;

  const { invoice, totals, organization, issuer } = data;
  const besedilo = emailText(invoice, issuer, totals.gross);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(besedilo);
      setCopied(true);
    } catch {
      /* odložišče ni na voljo — besedilo je vidno spodaj */
    }
  };

  const mailto =
    `mailto:${organization?.email ?? ''}` +
    `?subject=${encodeURIComponent(`Račun ${invoice.number} — naročnina Plamen`)}` +
    `&body=${encodeURIComponent(besedilo)}`;

  return (
    <div className="space-y-4">
      {/* Orodna vrstica — ob tiskanju izgine */}
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button onClick={() => window.print()}>Natisni / shrani kot PDF</Button>
        <Button variant="secondary" onClick={copy}>
          {copied ? '✓ kopirano' : 'Kopiraj besedilo e-pošte'}
        </Button>
        <a href={mailto}>
          <Button variant="secondary">Odpri v e-pošti</Button>
        </a>
      </div>

      {issuer.missing.length > 0 && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 print:hidden">
          Račun ni popoln — v nastavitvah strežnika manjka:{' '}
          <strong>{issuer.missing.join(', ')}</strong>. Dopolni spremenljivke
          <code className="mx-1 rounded bg-yellow-100 px-1">INVOICE_ISSUER_*</code>
          v <code>.env.prod</code> in znova zaženi strežnik.
        </div>
      )}

      {/* Sam račun */}
      <div className="mx-auto max-w-[210mm] bg-white p-10 text-sm shadow-sm print:shadow-none">
        <div className="flex justify-between gap-8">
          <div>
            <p className="text-lg font-bold text-gray-900">{issuer.name}</p>
            <p className="text-gray-600">{issuer.address}</p>
            <p className="text-gray-600">{issuer.post}</p>
            <p className="mt-2 text-gray-600">
              Davčna št.: {issuer.taxNumber || '—'}
              {issuer.vatId ? ` · ID za DDV: ${issuer.vatId}` : ''}
            </p>
            {issuer.registrationNumber && (
              <p className="text-gray-600">
                Matična št.: {issuer.registrationNumber}
              </p>
            )}
            <p className="text-gray-600">{issuer.email}</p>
            {issuer.phone && <p className="text-gray-600">{issuer.phone}</p>}
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">RAČUN</p>
            <p className="mt-1 font-mono text-lg">{invoice.number}</p>
            {invoice.cancelledAt && (
              <p className="mt-1 font-semibold text-red-600">STORNIRAN</p>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-gray-50 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Prejemnik
          </p>
          <p className="font-semibold text-gray-900">
            {organization?.name ?? '—'}
          </p>
          {organization?.address && <p>{organization.address}</p>}
          {(organization?.postalCode || organization?.city) && (
            <p>
              {organization?.postalCode} {organization?.city}
            </p>
          )}
          {organization?.email && (
            <p className="text-gray-600">{organization.email}</p>
          )}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase text-gray-500">Datum izdaje</p>
            <p>{formatDate(invoice.issuedAt)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Rok plačila</p>
            <p className="font-medium">{formatDate(invoice.dueAt)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Datum storitve</p>
            <p>
              {formatDate(invoice.periodFrom)} – {formatDate(invoice.periodTo)}
            </p>
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left text-xs uppercase text-gray-500">
              <th className="py-2">Opis</th>
              <th className="py-2 text-right">Obdobje</th>
              <th className="py-2 text-right">Znesek</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-3">
                {invoice.note ?? 'Naročnina na platformo Plamen'}
                <div className="text-xs text-gray-500">
                  {formatDate(invoice.periodFrom)} – {formatDate(invoice.periodTo)}
                </div>
              </td>
              <td className="py-3 text-right">{invoice.months} mes.</td>
              <td className="py-3 text-right">{formatEur(totals.net)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <table className="text-sm">
            <tbody>
              <tr>
                <td className="py-1 pr-8 text-gray-600">Osnova</td>
                <td className="py-1 text-right">{formatEur(totals.net)}</td>
              </tr>
              <tr>
                <td className="py-1 pr-8 text-gray-600">
                  DDV ({Number(invoice.vatRate)} %)
                </td>
                <td className="py-1 text-right">{formatEur(totals.vat)}</td>
              </tr>
              <tr className="border-t border-gray-300">
                <td className="py-2 pr-8 font-semibold">Za plačilo</td>
                <td className="py-2 text-right text-lg font-bold">
                  {formatEur(totals.gross)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 rounded-lg border border-gray-200 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Plačilo
          </p>
          <p>
            IBAN: <span className="font-mono">{issuer.iban || '—'}</span>
            {issuer.bank ? ` (${issuer.bank})` : ''}
          </p>
          <p>
            Sklic: <span className="font-mono">{sklic(invoice.number)}</span>
          </p>
          <p>Namen: Naročnina Plamen — {organization?.name ?? ''}</p>
        </div>

        {issuer.footerNote && (
          <p className="mt-6 text-xs text-gray-500">{issuer.footerNote}</p>
        )}
        <p className="mt-2 text-xs text-gray-500">
          Račun je izdan v elektronski obliki in je veljaven brez žiga in
          podpisa.
        </p>
      </div>

      {/* Besedilo e-pošte — vidno tudi, če odložišče ni na voljo */}
      <details className="print:hidden">
        <summary className="cursor-pointer text-sm text-gray-600">
          Besedilo e-pošte
        </summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-xs">
          {besedilo}
        </pre>
      </details>
    </div>
  );
}
