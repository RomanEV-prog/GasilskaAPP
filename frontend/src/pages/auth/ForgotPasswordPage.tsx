import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { errorMessage } from '../../api/client';
import { Button, Input } from '../../components/ui';

/**
 * Zahteva za ponastavitev gesla. Odgovor je vedno enak — brez razkrivanja,
 * ali račun obstaja (backend to zagotavlja, tu ga le ne zaobidemo).
 */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
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
          <h1 className="mt-2 text-2xl font-bold">Pozabljeno geslo</h1>
        </div>

        {sent ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              Če račun obstaja, smo na vpisani naslov poslali navodila za
              ponastavitev gesla. Preverite tudi mapo z neželeno pošto.
            </p>
            <Link
              to="/login"
              className="block text-center text-sm text-primary hover:underline"
            >
              Nazaj na prijavo
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-gray-600">
              Vnesite e-poštni naslov svojega računa in poslali vam bomo
              povezavo za ponastavitev gesla.
            </p>
            <Input
              label="E-poštni naslov"
              type="email"
              autoComplete="email"
              placeholder="ime@primer.si"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={submitting || !email.includes('@')}
              className="w-full"
            >
              {submitting ? 'Pošiljanje ...' : 'Pošlji povezavo'}
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
