import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { differenceInDays } from 'date-fns';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { errorMessage } from '../../api/client';
import { trainingsApi } from '../../api/trainings.api';
import { usersApi } from '../../api/users.api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Spinner,
} from '../../components/ui';
import { useAuth } from '../../stores/auth.store';
import type { Training } from '../../types';

/** Zelena > 60 dni, rumena ≤ 60, rdeča poteklo; siva = trajno. */
function expiryBadge(expiresAt?: string) {
  if (!expiresAt) return <Badge color="gray">trajno</Badge>;
  const days = differenceInDays(new Date(expiresAt), new Date());
  if (days < 0) return <Badge color="red">poteklo {expiresAt}</Badge>;
  if (days <= 60)
    return (
      <Badge color="yellow">
        do {expiresAt} ({days} dni)
      </Badge>
    );
  return <Badge color="green">do {expiresAt}</Badge>;
}

const schema = z.object({
  userId: z.string().min(1, 'Izberite člana.'),
  name: z.string().min(1, 'Vnesite naziv usposabljanja.'),
  provider: z.string(),
  completedAt: z.string().min(1, 'Vnesite datum opravljanja.'),
  expiresAt: z.string(),
  notes: z.string(),
});

type FormData = z.infer<typeof schema>;

function AddTrainingForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

  const { data: members } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { provider: '', expiresAt: '', notes: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      trainingsApi.create({
        userId: data.userId,
        name: data.name,
        provider: data.provider || undefined,
        completedAt: data.completedAt,
        expiresAt: data.expiresAt || undefined,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      reset();
      onDone();
    },
    onError: (err) => setServerError(errorMessage(err)),
  });

  return (
    <Card title="Dodaj usposabljanje">
      <form
        onSubmit={handleSubmit((d) => {
          setServerError('');
          mutation.mutate(d);
        })}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Član *"
            error={errors.userId?.message}
            {...register('userId')}
          >
            <option value="">Izberi ...</option>
            {members
              ?.filter((m) => m.isActive)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.lastName} {m.firstName}
                </option>
              ))}
          </Select>
          <Input
            label="Naziv *"
            placeholder="Prva pomoč"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Izvajalec"
            placeholder="Rdeči križ"
            {...register('provider')}
          />
          <Input
            label="Opravljeno *"
            type="date"
            error={errors.completedAt?.message}
            {...register('completedAt')}
          />
          <Input label="Velja do" type="date" {...register('expiresAt')} />
          <Input label="Opombe" {...register('notes')} />
        </div>

        {serverError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Shranjevanje ...' : 'Shrani'}
          </Button>
          <Button type="button" variant="secondary" onClick={onDone}>
            Prekliči
          </Button>
        </div>
      </form>
    </Card>
  );
}

function TrainingsTable({
  trainings,
  showUser,
  canDelete,
}: {
  trainings: Training[];
  showUser: boolean;
  canDelete: boolean;
}) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: (id: string) => trainingsApi.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['trainings'] }),
  });

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
          <tr>
            {showUser && <th className="px-4 py-3">Član</th>}
            <th className="px-4 py-3">Usposabljanje</th>
            <th className="px-4 py-3">Izvajalec</th>
            <th className="px-4 py-3">Opravljeno</th>
            <th className="px-4 py-3">Veljavnost</th>
            {canDelete && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {trainings.map((t) => (
            <tr
              key={t.id}
              className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
            >
              {showUser && (
                <td className="px-4 py-3 font-medium">
                  {t.user ? `${t.user.lastName} ${t.user.firstName}` : '—'}
                </td>
              )}
              <td className="px-4 py-3">{t.name}</td>
              <td className="px-4 py-3 text-gray-600">{t.provider ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{t.completedAt}</td>
              <td className="px-4 py-3">{expiryBadge(t.expiresAt)}</td>
              {canDelete && (
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      if (confirm('Res želiš izbrisati to usposabljanje?')) {
                        remove.mutate(t.id);
                      }
                    }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Izbriši
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TrainingsPage() {
  const { isLeadership, user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const isAdmin = user?.roles.includes('org_admin') ?? false;

  const { data: trainings, isLoading, isError, refetch } = useQuery({
    queryKey: ['trainings', isLeadership ? 'all' : 'mine'],
    queryFn: () => (isLeadership ? trainingsApi.list() : trainingsApi.mine()),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isLeadership ? 'Usposabljanja' : 'Moja usposabljanja'}
        </h1>
        {isLeadership && !showForm && (
          <Button onClick={() => setShowForm(true)}>
            + Dodaj usposabljanje
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <AddTrainingForm onDone={() => setShowForm(false)} />
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState
          message="Usposabljanj ni bilo mogoče naložiti."
          onRetry={() => refetch()}
        />
      ) : !trainings || trainings.length === 0 ? (
        <EmptyState message="Ni evidentiranih usposabljanj." />
      ) : (
        <TrainingsTable
          trainings={trainings}
          showUser={isLeadership}
          canDelete={isAdmin}
        />
      )}
    </div>
  );
}
