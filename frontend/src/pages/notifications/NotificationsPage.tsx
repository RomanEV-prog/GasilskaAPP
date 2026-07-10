import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sl } from 'date-fns/locale';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { errorMessage } from '../../api/client';
import { notificationsApi } from '../../api/notifications.api';
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
import type { NotificationTarget } from '../../types';

const TARGET_LABELS: Record<NotificationTarget, string> = {
  all: 'Vsi člani',
  operative: 'Operativci',
  youth: 'Mladina',
  leadership: 'Vodstvo',
  specific: 'Izbrani člani',
};

const schema = z.object({
  title: z.string().min(1, 'Vnesite naslov.'),
  body: z.string().min(1, 'Vnesite besedilo obvestila.'),
  target: z.string(),
});

type FormData = z.infer<typeof schema>;

function SendForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { target: 'all' },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      notificationsApi.create({
        title: data.title,
        body: data.body,
        target: data.target as NotificationTarget,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      reset();
      onDone();
    },
    onError: (err) => setServerError(errorMessage(err)),
  });

  return (
    <Card title="Novo obvestilo">
      <form
        onSubmit={handleSubmit((d) => {
          setServerError('');
          mutation.mutate(d);
        })}
        className="space-y-4"
      >
        <Input
          label="Naslov *"
          error={errors.title?.message}
          {...register('title')}
        />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Besedilo *
          </span>
          <textarea
            rows={3}
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary ${
              errors.body ? 'border-red-400' : 'border-gray-300'
            }`}
            {...register('body')}
          />
          {errors.body && (
            <span className="mt-1 block text-xs text-red-600">
              {errors.body.message}
            </span>
          )}
        </label>
        <div className="max-w-xs">
          <Select label="Prejemniki" {...register('target')}>
            {(['all', 'operative', 'youth', 'leadership'] as const).map(
              (t) => (
                <option key={t} value={t}>
                  {TARGET_LABELS[t]}
                </option>
              ),
            )}
          </Select>
        </div>

        {serverError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Pošiljanje ...' : 'Pošlji obvestilo'}
          </Button>
          <Button type="button" variant="secondary" onClick={onDone}>
            Prekliči
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function NotificationsPage() {
  const { isLeadership } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: notifications, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications', 'mine'],
    queryFn: notificationsApi.mine,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Obvestila
          {unreadCount > 0 && (
            <span className="ml-3 align-middle">
              <Badge color="red">{unreadCount} neprebranih</Badge>
            </span>
          )}
        </h1>
        {isLeadership && !showForm && (
          <Button onClick={() => setShowForm(true)}>+ Novo obvestilo</Button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <SendForm onDone={() => setShowForm(false)} />
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState
          message="Obvestil ni bilo mogoče naložiti."
          onRetry={() => refetch()}
        />
      ) : !notifications || notifications.length === 0 ? (
        <EmptyState message="Ni obvestil." />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                if (!n.isRead) markRead.mutate(n.id);
              }}
              className={`block w-full rounded-xl bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md ${
                n.isRead ? 'opacity-70' : 'border-l-4 border-primary'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className={`text-sm ${n.isRead ? '' : 'font-semibold'}`}
                  >
                    {n.title}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-600">
                    {n.body}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {format(new Date(n.createdAt), 'd. M. yyyy HH:mm', {
                      locale: sl,
                    })}
                  </p>
                </div>
                <Badge color={n.target === 'all' ? 'gray' : 'blue'}>
                  {TARGET_LABELS[n.target]}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
