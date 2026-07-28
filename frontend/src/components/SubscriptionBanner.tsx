import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { organizationsApi } from '../api/organizations.api';
import { redeemCode } from '../api/platform.api';
import { useAuth } from '../stores/auth.store';
import { Button, Input } from './ui';

/** Koliko dni pred potekom začnemo opozarjati. */
const WARN_DAYS = 30;

/** Dni do datuma (negativno = že mimo). */
function daysUntil(iso: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / msPerDay);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sl-SI');
}

/**
 * Opozorilo o naročnini: rdeče po poteku (dostop samo za branje), rumeno
 * zadnjih 30 dni. Administrator lahko naročnino podaljša kar tu — vnese
 * aktivacijsko kodo, ki jo je prejel od upravitelja platforme.
 */
export function SubscriptionBanner() {
  const { isLeadership } = useAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');

  const { data: org } = useQuery({
    queryKey: ['organization', 'me'],
    queryFn: organizationsApi.getMine,
    staleTime: 5 * 60 * 1000,
  });

  const redeem = useMutation({
    mutationFn: () => redeemCode(code.trim()),
    onSuccess: () => {
      setCode('');
      // Osveži tudi ostale poglede — zaklep na branje je s tem odpravljen.
      queryClient.invalidateQueries();
    },
  });

  const expiresAt = org?.subscriptionExpiresAt;
  if (!expiresAt) return null; // neomejena naročnina

  const left = daysUntil(expiresAt);
  if (left > WARN_DAYS) return null;

  const expired = left <= 0;
  const tone = expired
    ? 'border-red-200 bg-red-50 text-red-900'
    : 'border-yellow-200 bg-yellow-50 text-yellow-900';

  const message = expired
    ? `Naročnina društva je potekla ${formatDate(expiresAt)}. Podatki ostajajo vidni, vnašanje in urejanje je onemogočeno.`
    : left === 1
      ? `Naročnina društva poteče jutri (${formatDate(expiresAt)}).`
      : `Naročnina društva poteče čez ${left} dni (${formatDate(expiresAt)}).`;

  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${tone}`}>
      <p className="font-medium">
        {expired ? '🔒' : '⏳'} {message}
      </p>

      {isLeadership ? (
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) redeem.mutate();
          }}
        >
          <Input
            label="Aktivacijska koda za podaljšanje"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="GASIL-XXXX-XXXX"
            className="w-56 font-mono"
          />
          <Button type="submit" disabled={!code.trim() || redeem.isPending}>
            {redeem.isPending ? 'Podaljšujem …' : 'Podaljšaj'}
          </Button>
          {redeem.isError && (
            <span className="w-full text-xs text-red-700">
              {(redeem.error as { response?: { data?: { message?: string } } })
                ?.response?.data?.message ?? 'Kode ni bilo mogoče unovčiti.'}
            </span>
          )}
          {redeem.isSuccess && (
            <span className="w-full text-xs text-green-700">
              Naročnina je podaljšana.
            </span>
          )}
        </form>
      ) : (
        <p className="mt-1 text-xs">
          Za podaljšanje se obrnite na administratorja društva.
        </p>
      )}
    </div>
  );
}
