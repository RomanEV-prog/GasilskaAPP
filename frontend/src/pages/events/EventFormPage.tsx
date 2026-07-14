import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { errorMessage } from '../../api/client';
import { eventsApi } from '../../api/events.api';
import { Button, Card, Input, Select, Spinner } from '../../components/ui';
import {
  EVENT_TYPE_LABELS,
  MEMBERSHIP_LABELS,
  type Event,
  type MembershipStatus,
} from '../../types';

const schema = z.object({
  title: z.string().min(1, 'Vnesite naziv dogodka.'),
  description: z.string(),
  location: z.string(),
  eventType: z.string(),
  startsAt: z.string().min(1, 'Vnesite začetek.'),
  endsAt: z.string(),
  requiresRsvp: z.boolean(),
  sendNotification: z.boolean(),
  reminderMinutes: z.coerce.number().min(0),
});

type FormData = z.infer<typeof schema>;

/** datetime-local vrednost ↔ ISO */
function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');
  const [targetGroup, setTargetGroup] = useState<MembershipStatus[]>([]);

  const { data: existing, isLoading } = useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsApi.get(id!),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: '',
      location: '',
      eventType: 'drill',
      endsAt: '',
      requiresRsvp: true,
      sendNotification: true,
      reminderMinutes: 60,
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        title: existing.title,
        description: existing.description ?? '',
        location: existing.location ?? '',
        eventType: existing.eventType,
        startsAt: toLocalInput(existing.startsAt),
        endsAt: toLocalInput(existing.endsAt),
        requiresRsvp: existing.requiresRsvp,
        sendNotification: existing.sendNotification,
        reminderMinutes: existing.reminderMinutes,
      });
      setTargetGroup(existing.targetGroup ?? []);
    }
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload: Partial<Event> = {
        title: data.title,
        description: data.description || undefined,
        location: data.location || undefined,
        eventType: data.eventType as Event['eventType'],
        startsAt: new Date(data.startsAt).toISOString(),
        endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : undefined,
        targetGroup: targetGroup.length ? targetGroup : undefined,
        requiresRsvp: data.requiresRsvp,
        sendNotification: data.sendNotification,
        reminderMinutes: data.reminderMinutes,
      };
      return isEdit
        ? eventsApi.update(id!, payload)
        : eventsApi.create(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      navigate(`/events/${saved.id}`);
    },
    onError: (err) => setServerError(errorMessage(err)),
  });

  const toggleGroup = (g: MembershipStatus) =>
    setTargetGroup((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );

  if (isEdit && isLoading) return <Spinner />;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">
        {isEdit ? 'Uredi dogodek' : 'Nov dogodek'}
      </h1>

      <form
        onSubmit={handleSubmit((d) => {
          setServerError('');
          mutation.mutate(d);
        })}
        className="space-y-6"
      >
        <Card>
          <div className="space-y-4">
            <Input
              label="Naziv *"
              error={errors.title?.message}
              {...register('title')}
            />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Opis
              </span>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                {...register('description')}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Lokacija" {...register('location')} />
              <Select label="Tip dogodka" {...register('eventType')}>
                {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Input
                label="Začetek *"
                type="datetime-local"
                error={errors.startsAt?.message}
                {...register('startsAt')}
              />
              <Input
                label="Konec"
                type="datetime-local"
                {...register('endsAt')}
              />
            </div>
          </div>
        </Card>

        <Card title="Ciljna skupina in obvestila">
          <p className="mb-2 text-sm text-gray-500">
            Prazno = vsi člani. Sicer samo izbrane skupine.
          </p>
          <div className="mb-4 flex flex-wrap gap-3">
            {Object.entries(MEMBERSHIP_LABELS).map(([value, label]) => (
              <label key={value} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={targetGroup.includes(value as MembershipStatus)}
                  onChange={() => toggleGroup(value as MembershipStatus)}
                />
                {label}
              </label>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('requiresRsvp')} />
              Zahtevaj prijavo (RSVP)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('sendNotification')} />
              Pošlji obvestilo članom
            </label>
            <Input
              label="Opomnik (minut prej)"
              type="number"
              min={0}
              {...register('reminderMinutes')}
            />
          </div>
        </Card>

        {serverError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting || mutation.isPending}>
            {mutation.isPending ? 'Shranjevanje ...' : 'Shrani'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(-1)}
          >
            Prekliči
          </Button>
        </div>
      </form>
    </div>
  );
}
