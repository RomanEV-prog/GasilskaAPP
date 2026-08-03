import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { errorMessage } from '../../api/client';
import { Button, PasswordInput } from '../../components/ui';

/** Nastavitev novega gesla prek žetona iz e-poštne povezave (?token=...). */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Geslo mora imeti vsaj 8 znakov.');
      return;
    }
    if (password !== confirm) {
      setError('Gesli se ne ujemata.');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      navigate('/login', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
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
          <h1 className="mt-2 text-2xl font-bold">Novo geslo</h1>
        </div>

        {!token ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Povezava je nepopolna — manjka žeton. Uporabite povezavo iz
              e-poštnega sporočila ali zahtevajte novo.
            </p>
            <Link
              to="/forgot-password"
              className="block text-center text-sm text-primary hover:underline"
            >
              Zahtevaj novo povezavo
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <PasswordInput
              label="Novo geslo"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordInput
              label="Ponovi novo geslo"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={submitting || !password || !confirm}
              className="w-full"
            >
              {submitting ? 'Shranjevanje ...' : 'Nastavi novo geslo'}
            </Button>
            <Link
              to="/login"
              className="block text-center text-sm text-gray-500 hover:underline"
            >
              Nazaj na prijavo
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
