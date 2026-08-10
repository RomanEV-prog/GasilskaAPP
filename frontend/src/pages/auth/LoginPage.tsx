import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { errorMessage } from '../../api/client';
import { IosInstallHint } from '../../components/IosInstallHint';
import { Button, Input, PasswordInput, Select } from '../../components/ui';
import { isOrganizationChoice } from '../../types';
import { useAuth } from '../../stores/auth.store';

const schema = z.object({
  username: z.string().min(1, 'Vnesite e-pošto ali uporabniško ime.'),
  password: z.string().min(1, 'Vnesite geslo.'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const { login, verify2fa } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  // 2FA drugi korak: po pravilnem geslu backend vrne vmesni žeton.
  const [pendingToken, setPendingToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  // Redek primer: isti podatki veljajo v več društvih → uporabnik izbere.
  const [orgChoices, setOrgChoices] = useState<
    { id: string; name: string }[] | null
  >(null);
  const [chosenOrg, setChosenOrg] = useState('');

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData, organizationId?: string) => {
    setServerError('');
    try {
      const challenge = await login(data.username, data.password, organizationId);
      if (challenge && isOrganizationChoice(challenge)) {
        setOrgChoices(challenge.organizations);
        return;
      }
      setOrgChoices(null);
      if (challenge) {
        setPendingToken(challenge.pendingToken);
        return;
      }
      navigate('/');
    } catch (err) {
      setServerError(errorMessage(err));
    }
  };

  const onVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    setVerifying(true);
    try {
      await verify2fa(pendingToken, totpCode);
      navigate('/');
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F8F8] p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-md sm:p-8">
        <div className="mb-6 text-center">
          <img
            src="/plamen-icon.png"
            alt="Plamen"
            className="mx-auto h-16 w-16 rounded-2xl shadow-sm"
          />
          <h1 className="mt-2 text-2xl font-bold">Plamen</h1>
          <p className="text-sm text-gray-500">
            Portal za gasilska društva
          </p>
        </div>

        {pendingToken ? (
          <form onSubmit={onVerify2fa} className="space-y-4">
            <p className="text-sm text-gray-600">
              Vnesite 6-mestno kodo iz avtentikacijske aplikacije (ali rezervno
              kodo).
            </p>
            <Input
              label="Koda"
              autoComplete="one-time-code"
              inputMode="numeric"
              placeholder="123456"
              autoFocus
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
            />
            {serverError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {serverError}
              </p>
            )}
            <Button
              type="submit"
              disabled={verifying || totpCode.trim().length < 6}
              className="w-full"
            >
              {verifying ? 'Preverjanje ...' : 'Potrdi'}
            </Button>
            <button
              type="button"
              className="w-full text-center text-sm text-gray-500 hover:underline"
              onClick={() => {
                setPendingToken('');
                setTotpCode('');
                setServerError('');
              }}
            >
              Nazaj na prijavo
            </button>
          </form>
        ) : (
        <form
          onSubmit={handleSubmit((d) => onSubmit(d))}
          className="space-y-4"
        >
          <Input
            label="E-pošta ali uporabniško ime"
            autoComplete="username"
            placeholder="ime.priimek ali ime@drustvo.si"
            error={errors.username?.message}
            {...register('username')}
          />
          <PasswordInput
            label="Geslo"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          {orgChoices && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Vaš račun obstaja v več društvih — izberite, v katerega se
                prijavljate.
              </p>
              <Select
                label="Društvo"
                value={chosenOrg}
                onChange={(e) => setChosenOrg(e.target.value)}
              >
                <option value="">— izberite društvo —</option>
                {orgChoices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {serverError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverError}
            </p>
          )}

          {orgChoices ? (
            <Button
              type="button"
              disabled={!chosenOrg || isSubmitting}
              className="w-full"
              onClick={() => onSubmit(getValues(), chosenOrg)}
            >
              {isSubmitting ? 'Prijavljanje ...' : 'Prijava v izbrano društvo'}
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Prijavljanje ...' : 'Prijava'}
            </Button>
          )}
        </form>
        )}

        <p className="mt-4 text-center text-sm">
          <Link
            to="/forgot-password"
            className="text-gray-500 hover:underline"
          >
            Pozabljeno geslo?
          </Link>
        </p>

        <p className="mt-3 text-center text-sm text-gray-500">
          Nimate računa?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Registrirajte društvo
          </Link>
        </p>

        <IosInstallHint />

        <a
          href="https://www.cloudflare.com/"
          target="_blank"
          rel="noreferrer"
          className="mt-5 flex items-center justify-center gap-1.5 text-xs text-gray-400"
          title="Stran ščiti Cloudflare"
        >
          <span>Zaščiteno s</span>
          <img src="/cf-badge.svg" alt="Cloudflare" className="h-7" />
        </a>

        <p className="mt-2 text-center text-xs text-gray-400">
          <a href="/zasebnost.html" className="hover:underline">
            Politika zasebnosti
          </a>
          {' · '}
          <a href="/pogoji.html" className="hover:underline">
            Pogoji uporabe
          </a>
        </p>
      </div>
    </div>
  );
}
