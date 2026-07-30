import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { authApi } from '../../api/auth.api';
import { errorMessage } from '../../api/client';
import { Button, Card, Input } from '../../components/ui';

/**
 * Dvojna avtentikacija (2FA): vklop s QR kodo in potrditvijo TOTP kode,
 * enkraten prikaz rezervnih kod, izklop z geslom + kodo.
 */
export function TwoFactorCard() {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Vklop
  const [setup, setSetup] = useState<{
    secret: string;
    qrDataUrl: string;
  } | null>(null);
  const [enableCode, setEnableCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Izklop
  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  const { data: status } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: authApi.get2faStatus,
  });

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const setupMutation = useMutation({
    mutationFn: authApi.setup2fa,
    onSuccess: (res) => {
      clearMessages();
      setSetup({ secret: res.secret, qrDataUrl: res.qrDataUrl });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const enableMutation = useMutation({
    mutationFn: () => authApi.enable2fa(enableCode),
    onSuccess: (res) => {
      clearMessages();
      setSetup(null);
      setEnableCode('');
      setBackupCodes(res.backupCodes);
      setSuccess(res.message);
      void queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const disableMutation = useMutation({
    mutationFn: () => authApi.disable2fa(disablePassword, disableCode),
    onSuccess: (res) => {
      clearMessages();
      setDisableOpen(false);
      setDisablePassword('');
      setDisableCode('');
      setBackupCodes([]);
      setSuccess(res.message);
      void queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  return (
    <Card title="Dvojna avtentikacija (2FA)">
      <div className="max-w-lg space-y-4">
        <p className="text-sm text-gray-600">
          Ob prijavi bo poleg gesla potrebna še 6-mestna koda iz avtentikacijske
          aplikacije (Google Authenticator, Aegis, 1Password ...). To zaščiti
          račun tudi, če geslo pride v napačne roke.
        </p>

        {status?.enabled && !disableOpen && (
          <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            2FA je <strong>vklopljena</strong>
            {status.enabledAt &&
              ` od ${new Date(status.enabledAt).toLocaleDateString('sl-SI')}`}
            . Neporabljenih rezervnih kod: {status.backupCodesRemaining}.
          </div>
        )}

        {/* Enkraten prikaz rezervnih kod po vklopu */}
        {backupCodes.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="mb-2 text-sm font-semibold text-amber-800">
              Rezervne kode — shranite jih na varno! Prikazane so samo enkrat.
            </p>
            <p className="mb-3 text-xs text-amber-700">
              Vsaka koda deluje enkrat, če izgubite dostop do avtentikacijske
              aplikacije.
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((c) => (
                <span key={c} className="rounded bg-white px-2 py-1">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Vklop: QR + potrditvena koda */}
        {!status?.enabled && setup && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              1. Skenirajte QR kodo z avtentikacijsko aplikacijo:
            </p>
            <img
              src={setup.qrDataUrl}
              alt="QR koda za 2FA"
              className="h-44 w-44 rounded-lg border"
            />
            <p className="text-xs text-gray-400">
              Ročni vnos: <span className="font-mono">{setup.secret}</span>
            </p>
            <p className="text-sm text-gray-600">
              2. Vnesite kodo iz aplikacije za potrditev:
            </p>
            <div className="flex items-end gap-2">
              <Input
                label="Koda"
                inputMode="numeric"
                placeholder="123456"
                value={enableCode}
                onChange={(e) => setEnableCode(e.target.value)}
              />
              <Button
                onClick={() => enableMutation.mutate()}
                disabled={
                  enableMutation.isPending || enableCode.trim().length < 6
                }
              >
                {enableMutation.isPending ? 'Preverjanje ...' : 'Vklopi 2FA'}
              </Button>
            </div>
          </div>
        )}

        {/* Izklop: geslo + koda */}
        {status?.enabled && disableOpen && (
          <div className="space-y-4">
            <Input
              label="Trenutno geslo"
              type="password"
              autoComplete="current-password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
            />
            <Input
              label="Koda iz aplikacije (ali rezervna koda)"
              inputMode="numeric"
              placeholder="123456"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => disableMutation.mutate()}
                disabled={
                  disableMutation.isPending ||
                  !disablePassword ||
                  disableCode.trim().length < 6
                }
              >
                {disableMutation.isPending ? 'Izklapljanje ...' : 'Izklopi 2FA'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setDisableOpen(false);
                  clearMessages();
                }}
              >
                Prekliči
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </p>
        )}

        {!status?.enabled && !setup && (
          <Button
            onClick={() => setupMutation.mutate()}
            disabled={setupMutation.isPending}
          >
            {setupMutation.isPending ? 'Pripravljanje ...' : 'Vklopi 2FA'}
          </Button>
        )}
        {status?.enabled && !disableOpen && (
          <Button
            variant="secondary"
            onClick={() => {
              setDisableOpen(true);
              clearMessages();
              setBackupCodes([]);
            }}
          >
            Izklopi 2FA
          </Button>
        )}
      </div>
    </Card>
  );
}
