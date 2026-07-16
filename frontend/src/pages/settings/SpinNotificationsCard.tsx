import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { errorMessage } from '../../api/client';
import { usersApi } from '../../api/users.api';
import { Card, Spinner } from '../../components/ui';

/** Osebna nastavitev: prejemanje SPIN obvestil o intervencijah. */
export function SpinNotificationsCard() {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const { data: me, isLoading } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: usersApi.me,
  });

  const mutation = useMutation({
    mutationFn: (enabled: boolean) => usersApi.updateSpinNotifications(enabled),
    onSuccess: (updated) => {
      queryClient.setQueryData(['users', 'me'], updated);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  return (
    <Card title="SPIN obvestila">
      {isLoading || !me ? (
        <Spinner />
      ) : (
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span className="text-sm text-gray-700">
            Prejemaj obvestila o intervencijah (SPIN) v občinah društva.
          </span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-primary"
            checked={me.spinNotifications}
            disabled={mutation.isPending}
            onChange={(e) => {
              setError('');
              mutation.mutate(e.target.checked);
            }}
          />
        </label>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <p className="mt-3 text-xs text-gray-400">
        Nastavitev velja zate osebno — v spletnem portalu in mobilni aplikaciji.
      </p>
    </Card>
  );
}
