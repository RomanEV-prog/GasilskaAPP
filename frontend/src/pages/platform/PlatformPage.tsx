import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { platformApi } from '../../api/platform.api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Spinner,
} from '../../components/ui';
import {
  PLAN_LABELS,
  type PlatformInvoice,
  type PlatformOrganization,
  type RegistrationCode,
  type SubscriptionPlan,
} from '../../types';

/** Prednastavljena trajanja naročnine. `null` = neomejeno. */
const DURATIONS: { value: string; label: string; months: number | null }[] = [
  { value: '12', label: '12 mesecev (letna naročnina)', months: 12 },
  { value: '2', label: '2 meseca (preizkus)', months: 2 },
  { value: 'custom', label: 'Poljubno št. mesecev …', months: null },
  { value: 'unlimited', label: 'Neomejeno', months: null },
];

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('sl-SI') : '—';
}

function formatEur(value: number): string {
  return new Intl.NumberFormat('sl-SI', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function apiMessage(error: unknown): string {
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? 'Dejanje ni uspelo.';
}

/** Stanje naročnine društva kot barvna značka. */
function SubscriptionBadge({ org }: { org: PlatformOrganization }) {
  if (org.subscriptionExpiresAt === null) {
    return <Badge color="blue">neomejeno</Badge>;
  }
  if (org.expired) {
    return <Badge color="red">potekla {formatDate(org.subscriptionExpiresAt)}</Badge>;
  }
  const soon = (org.daysLeft ?? 0) <= 30;
  return (
    <Badge color={soon ? 'yellow' : 'green'}>
      do {formatDate(org.subscriptionExpiresAt)} ({org.daysLeft} dni)
    </Badge>
  );
}

function CodeStatusBadge({ code }: { code: RegistrationCode }) {
  if (code.status === 'used') {
    return (
      <Badge color="gray">
        porabljena{code.usedByOrganizationName ? ` — ${code.usedByOrganizationName}` : ''}
      </Badge>
    );
  }
  if (code.status === 'revoked') return <Badge color="red">preklicana</Badge>;
  return <Badge color="green">na voljo</Badge>;
}

/** Izdaja novih aktivacijskih kod. */
function IssueCodesCard({ onIssued }: { onIssued: (c: RegistrationCode[]) => void }) {
  const queryClient = useQueryClient();
  const [duration, setDuration] = useState('12');
  const [customMonths, setCustomMonths] = useState('6');
  const [count, setCount] = useState('1');
  const [note, setNote] = useState('');

  const validMonths: number | null =
    duration === 'unlimited'
      ? null
      : duration === 'custom'
        ? Number(customMonths) || 1
        : Number(duration);

  const issue = useMutation({
    mutationFn: () =>
      platformApi.issueCodes({
        count: Number(count) || 1,
        validMonths,
        note: note.trim() || undefined,
      }),
    onSuccess: (codes) => {
      onIssued(codes);
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['platform', 'codes'] });
    },
  });

  return (
    <Card title="Izdaj aktivacijske kode">
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          issue.mutate();
        }}
      >
        <Select
          label="Veljavnost naročnine"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        >
          {DURATIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>

        {duration === 'custom' && (
          <Input
            label="Št. mesecev"
            type="number"
            min={1}
            max={60}
            value={customMonths}
            onChange={(e) => setCustomMonths(e.target.value)}
          />
        )}

        <Input
          label="Št. kod (največ 20)"
          type="number"
          min={1}
          max={20}
          value={count}
          onChange={(e) => setCount(e.target.value)}
        />

        <Input
          label="Opomba (komu je koda izdana)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="PGD Radvanje — g. Kovač"
          className="sm:col-span-2"
        />

        <div className="sm:col-span-2">
          <Button type="submit" disabled={issue.isPending}>
            {issue.isPending ? 'Izdajam …' : 'Izdaj kode'}
          </Button>
          {issue.isError && (
            <span className="ml-3 text-xs text-red-600">
              {apiMessage(issue.error)}
            </span>
          )}
        </div>
      </form>

      <p className="mt-4 text-xs text-gray-500">
        Koda ob aktivaciji odklene društvu izbrano število mesecev. Po poteku
        podatki ostanejo vidni, vnašanje in urejanje pa je onemogočeno, dokler
        administrator ne vnese nove kode.
      </p>
    </Card>
  );
}

/** Sveže izdane kode s hitrim kopiranjem — po osvežitvi strani izginejo. */
function FreshCodes({ codes }: { codes: RegistrationCode[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!codes.length) return null;

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
    } catch {
      /* brskalnik ni dovolil dostopa do odložišča — koda je vidna na zaslonu */
    }
  };

  const emailText = codes
    .map(
      (c) =>
        `Aktivacijska koda: ${c.code}\n` +
        `Veljavnost: ${c.validMonths === null ? 'neomejeno' : `${c.validMonths} mesecev`}`,
    )
    .join('\n\n');

  return (
    <Card title="Pravkar izdane kode">
      <ul className="space-y-2">
        {codes.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3">
            <code className="rounded bg-gray-100 px-2 py-1 font-mono text-sm">
              {c.code}
            </code>
            <span className="text-xs text-gray-500">
              {c.validMonths === null ? 'neomejeno' : `${c.validMonths} mesecev`}
            </span>
            <Button variant="ghost" onClick={() => copy(c.code, c.id)}>
              {copied === c.id ? '✓ kopirano' : 'Kopiraj'}
            </Button>
          </li>
        ))}
      </ul>
      <Button
        variant="secondary"
        className="mt-4"
        onClick={() => copy(emailText, 'all')}
      >
        {copied === 'all' ? '✓ kopirano' : 'Kopiraj besedilo za e-pošto'}
      </Button>
    </Card>
  );
}

/** Seznam vseh izdanih kod s preklicem. */
function CodesCard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['platform', 'codes'],
    queryFn: platformApi.listCodes,
  });

  const revoke = useMutation({
    mutationFn: (id: string) => platformApi.revokeCode(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['platform', 'codes'] }),
  });

  if (isLoading) return <Spinner />;
  if (!data?.length) return <EmptyState message="Nobena koda še ni izdana." />;

  return (
    <Card title={`Izdane kode (${data.length})`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2">Koda</th>
              <th className="py-2">Veljavnost</th>
              <th className="py-2">Opomba</th>
              <th className="py-2">Izdana</th>
              <th className="py-2">Stanje</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((c) => (
              <tr key={c.id}>
                <td className="py-2 font-mono">{c.code}</td>
                <td className="py-2">
                  {c.validMonths === null ? 'neomejeno' : `${c.validMonths} mes.`}
                </td>
                <td className="py-2 text-gray-600">{c.note ?? '—'}</td>
                <td className="py-2 text-gray-600">{formatDate(c.createdAt)}</td>
                <td className="py-2">
                  <CodeStatusBadge code={c} />
                </td>
                <td className="py-2 text-right">
                  {c.status === 'available' && (
                    <Button
                      variant="ghost"
                      className="text-red-600"
                      disabled={revoke.isPending}
                      onClick={() => revoke.mutate(c.id)}
                    >
                      Prekliči
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {revoke.isError && (
        <p className="mt-2 text-xs text-red-600">{apiMessage(revoke.error)}</p>
      )}
    </Card>
  );
}

/** Vsa društva na platformi + ročno urejanje naročnine. */
function OrganizationsCard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['platform', 'organizations'],
    queryFn: platformApi.listOrganizations,
  });

  const setSubscription = useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      addMonths?: number;
      unlimited?: boolean;
      plan?: SubscriptionPlan;
    }) => platformApi.setSubscription(id, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['platform', 'organizations'] }),
  });

  if (isLoading) return <Spinner />;
  if (!data?.length) return <EmptyState message="Ni še nobenega društva." />;

  return (
    <Card title={`Društva (${data.length})`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2">Društvo</th>
              <th className="py-2">Članov</th>
              <th className="py-2">Paket</th>
              <th className="py-2">Naročnina</th>
              <th className="py-2">Ročno</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((org) => (
              <tr key={org.id}>
                <td className="py-2">
                  <div className="font-medium text-gray-800">{org.name}</div>
                  <div className="text-xs text-gray-500">
                    {org.city ?? '—'} · {org.email ?? 'brez e-pošte'}
                  </div>
                </td>
                <td className="py-2">{org.memberCount}</td>
                <td className="py-2">
                  <select
                    value={org.subscriptionPlan ?? ''}
                    disabled={setSubscription.isPending}
                    onChange={(e) =>
                      setSubscription.mutate({
                        id: org.id,
                        plan: e.target.value as SubscriptionPlan,
                      })
                    }
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                  >
                    <option value="">—</option>
                    {(
                      Object.keys(PLAN_LABELS) as SubscriptionPlan[]
                    ).map((plan) => (
                      <option key={plan} value={plan}>
                        {PLAN_LABELS[plan]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2">
                  <SubscriptionBadge org={org} />
                </td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-1">
                    <Button
                      variant="ghost"
                      disabled={setSubscription.isPending}
                      onClick={() =>
                        setSubscription.mutate({ id: org.id, addMonths: 12 })
                      }
                    >
                      +12 mes.
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={setSubscription.isPending}
                      onClick={() =>
                        setSubscription.mutate({ id: org.id, addMonths: 1 })
                      }
                    >
                      +1 mes.
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={setSubscription.isPending}
                      onClick={() =>
                        setSubscription.mutate({ id: org.id, unlimited: true })
                      }
                    >
                      Neomejeno
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {setSubscription.isError && (
        <p className="mt-2 text-xs text-red-600">
          {apiMessage(setSubscription.error)}
        </p>
      )}
    </Card>
  );
}

const INVOICE_STATUS: Record<
  PlatformInvoice['status'],
  { label: string; color: 'green' | 'yellow' | 'red' | 'gray' }
> = {
  paid: { label: 'plačan', color: 'green' },
  open: { label: 'odprt', color: 'yellow' },
  overdue: { label: 'zapadel', color: 'red' },
  cancelled: { label: 'storniran', color: 'gray' },
};

/** Izdaja računa za izbrano društvo + pregled odprtega dolga. */
function InvoicesCard() {
  const queryClient = useQueryClient();
  // Isti ključ kot v OrganizationsCard — react-query poizvedbo deli, ne podvoji.
  const { data: orgs = [] } = useQuery({
    queryKey: ['platform', 'organizations'],
    queryFn: platformApi.listOrganizations,
  });
  const [orgId, setOrgId] = useState('');
  const [months, setMonths] = useState('12');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const { data: issuer } = useQuery({
    queryKey: ['platform', 'issuer'],
    queryFn: platformApi.getIssuer,
    staleTime: 10 * 60 * 1000,
  });
  const { data: summary } = useQuery({
    queryKey: ['platform', 'invoices', 'summary'],
    queryFn: platformApi.invoicesSummary,
  });
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['platform', 'invoices'],
    queryFn: platformApi.listInvoices,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['platform'] });
  };

  const create = useMutation({
    mutationFn: () =>
      platformApi.createInvoice({
        organizationId: orgId,
        months: Number(months) || 1,
        amount: Number(amount.replace(',', '.')) || 0,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      setNote('');
      setAmount('');
      refresh();
    },
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => platformApi.markInvoicePaid(id),
    onSuccess: refresh,
  });

  const cancel = useMutation({
    mutationFn: (id: string) => platformApi.cancelInvoice(id),
    onSuccess: refresh,
  });

  // Predlagana cena iz nastavitev — 12 mes. letna, sicer mesečna × št. mesecev.
  const suggested =
    issuer && Number(months) === 12
      ? issuer.yearlyPrice
      : issuer
        ? issuer.monthlyPrice * (Number(months) || 1)
        : 0;

  return (
    <Card title="Računi">
      {summary && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs uppercase text-gray-500">Odprt dolg</div>
            <div className="text-xl font-bold text-gray-800">
              {formatEur(summary.outstanding)}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs uppercase text-gray-500">
              Neplačanih računov
            </div>
            <div className="text-xl font-bold text-gray-800">
              {summary.openCount}
            </div>
          </div>
          <div
            className={`rounded-lg p-3 ${
              summary.overdueCount ? 'bg-red-50' : 'bg-gray-50'
            }`}
          >
            <div className="text-xs uppercase text-gray-500">Zapadlih</div>
            <div
              className={`text-xl font-bold ${
                summary.overdueCount ? 'text-red-700' : 'text-gray-800'
              }`}
            >
              {summary.overdueCount}
            </div>
          </div>
        </div>
      )}

      {issuer && issuer.missing.length > 0 && (
        <p className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-900">
          Podatki izdajatelja niso popolni (manjka: {issuer.missing.join(', ')}).
          Račun je mogoče izdati, a izpis ne bo veljaven, dokler ne dopolniš
          <code className="mx-1">INVOICE_ISSUER_*</code> v <code>.env.prod</code>.
        </p>
      )}

      <form
        className="grid gap-4 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (orgId) create.mutate();
        }}
      >
        <Select
          label="Društvo"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          className="sm:col-span-2"
        >
          <option value="">— izberi društvo —</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
        <Input
          label="Obdobje (mesecev)"
          type="number"
          min={1}
          max={60}
          value={months}
          onChange={(e) => setMonths(e.target.value)}
        />
        <Input
          label="Znesek brez DDV (EUR)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={suggested ? String(suggested) : '0'}
        />
        <Input
          label="Opis na računu"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Naročnina na platformo Plamen"
          className="sm:col-span-3"
        />
        <div className="flex items-end">
          <Button type="submit" disabled={!orgId || create.isPending}>
            {create.isPending ? 'Izdajam …' : 'Izdaj račun'}
          </Button>
        </div>
        {create.isError && (
          <p className="text-xs text-red-600 sm:col-span-4">
            {apiMessage(create.error)}
          </p>
        )}
      </form>

      {isLoading ? (
        <Spinner />
      ) : !invoices?.length ? (
        <p className="mt-6 text-sm text-gray-500">Nobenega računa še ni.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2">Št.</th>
                <th className="py-2">Društvo</th>
                <th className="py-2">Obdobje</th>
                <th className="py-2 text-right">Znesek</th>
                <th className="py-2">Rok</th>
                <th className="py-2">Stanje</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="py-2 font-mono">
                    <Link
                      to={`/platform/racun/${inv.id}`}
                      className="text-primary hover:underline"
                    >
                      {inv.number}
                    </Link>
                  </td>
                  <td className="py-2">{inv.organizationName}</td>
                  <td className="py-2 text-gray-600">
                    {formatDate(inv.periodFrom)} – {formatDate(inv.periodTo)}
                  </td>
                  <td className="py-2 text-right">
                    {formatEur(inv.totals.gross)}
                  </td>
                  <td className="py-2 text-gray-600">{formatDate(inv.dueAt)}</td>
                  <td className="py-2">
                    <Badge color={INVOICE_STATUS[inv.status].color}>
                      {INVOICE_STATUS[inv.status].label}
                      {inv.paidAt ? ` ${formatDate(inv.paidAt)}` : ''}
                    </Badge>
                  </td>
                  <td className="py-2 text-right">
                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <>
                        <Button
                          variant="ghost"
                          disabled={markPaid.isPending}
                          onClick={() => markPaid.mutate(inv.id)}
                        >
                          Plačano
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-red-600"
                          disabled={cancel.isPending}
                          onClick={() => cancel.mutate(inv.id)}
                        >
                          Storniraj
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500">
        »Plačano« podaljša naročnino društva za obdobje računa. E-pošte sistem
        ne pošilja sam — na računu je gumb za kopiranje besedila oz. odpiranje
        v tvojem e-poštnem odjemalcu.
      </p>

      {(markPaid.isError || cancel.isError) && (
        <p className="mt-2 text-xs text-red-600">
          {apiMessage(markPaid.error ?? cancel.error)}
        </p>
      )}
    </Card>
  );
}

/**
 * Upravljanje platforme — samo za `super_admin`.
 * Izdaja aktivacijskih kod in pregled naročnin vseh društev.
 */
export function PlatformPage() {
  const [fresh, setFresh] = useState<RegistrationCode[]>([]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Platforma</h1>
        <p className="text-sm text-gray-500">
          Aktivacijske kode in naročnine društev.
        </p>
      </div>

      <IssueCodesCard onIssued={setFresh} />
      <FreshCodes codes={fresh} />
      <OrganizationsCard />
      <InvoicesCard />
      <CodesCard />
    </div>
  );
}
