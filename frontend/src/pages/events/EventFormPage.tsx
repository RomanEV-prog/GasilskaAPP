import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { errorMessage } from '../../api/client';
import { eventsApi } from '../../api/events.api';
import { usersApi } from '../../api/users.api';
import { Button, Card, Input, Select, Spinner } from '../../components/ui';
import {
  EVENT_TYPE_LABELS,
  MEMBERSHIP_LABELS,
  REMINDER_OFFSET_OPTIONS,
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
  const [targetUserIds, setTargetUserIds] = useState<string[]>([]);
  const [onlySelected, setOnlySelected] = useState(false);
  const [reminderOffsets, setReminderOffsets] = useState<number[]>([]);

  const { data: existing, isLoading } = useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsApi.get(id!),
    enabled: isEdit,
  });

  const { data: members } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
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
      });
      setTargetGroup(existing.targetGroup ?? []);
      setTargetUserIds(existing.targetUserIds ?? []);
      setOnlySelected((existing.targetUserIds ?? []).length > 0);
      setReminderOffsets(existing.reminderOffsets ?? []);
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
        targetUserIds: onlySelected && targetUserIds.length ? targetUserIds : [],
        requiresRsvp: data.requiresRsvp,
        sendNotification: data.sendNotification,
        reminderOffsets,
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

          <label className="mb-2 flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={onlySelected}
              onChange={(e) => setOnlySelected(e.target.checked)}
            />
            Obvesti samo izbrane člane
          </label>
          {onlySelected && (
            <div className="mb-4 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
              {members
                ?.filter((m) => m.isActive)
                .map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={targetUserIds.includes(m.id)}
                      onChange={() =>
                        setTargetUserIds((prev) =>
                          prev.includes(m.id)
                            ? prev.filter((x) => x !== m.id)
                            : [...prev, m.id],
                        )
                      }
                    />
                    {m.lastName} {m.firstName}
                  </label>
                ))}
              <p className="px-2 pt-1 text-xs text-gray-400">
                Izbranih: {targetUserIds.length}. Obvestilo in opomniki gredo
                samo tem članom.
              </p>
            </div>
          )}

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('requiresRsvp')} />
              Člani naj potrdijo udeležbo (pridem / ne pridem)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('sendNotification')} />
              Pošlji obvestilo ob objavi
            </label>
          </div>

          <p className="mb-2 text-sm font-medium text-gray-700">
            Opomniki pred dogodkom
          </p>
          <div className="flex flex-wrap gap-3">
            {REMINDER_OFFSET_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-1.5 text-sm"
              >
                <input
                  type="checkbox"
                  checked={reminderOffsets.includes(opt.value)}
                  onChange={() =>
                    setReminderOffsets((prev) =>
                      prev.includes(opt.value)
                        ? prev.filter((x) => x !== opt.value)
                        : [...prev, opt.value],
                    )
                  }
                />
                {opt.label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Ob izbranih časih pred začetkom dobijo udeleženci push obvestilo.
          </p>
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
