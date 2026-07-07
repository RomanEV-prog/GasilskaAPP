import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { authApi } from '../../api/auth.api';
import { errorMessage } from '../../api/client';
import { Button, Card, Input } from '../../components/ui';

/** Prijavljeni uporabnik si spremeni geslo (zahteva trenutno geslo). */
export function ChangePasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: (res) => {
      setSuccess(res.message);
      setCurrent('');
      setNext('');
      setConfirm('');
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (next.length < 8) {
      setError('Novo geslo mora imeti vsaj 8 znakov.');
      return;
    }
    if (next !== confirm) {
      setError('Novi gesli se ne ujemata.');
      return;
    }
    mutation.mutate();
  };

  return (
    <Card title="Sprememba gesla">
      <form onSubmit={submit} className="max-w-sm space-y-4">
        <Input
          label="Trenutno geslo"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <Input
          label="Novo geslo"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <Input
          label="Ponovi novo geslo"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
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
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Shranjevanje ...' : 'Spremeni geslo'}
        </Button>
      </form>
    </Card>
  );
}
