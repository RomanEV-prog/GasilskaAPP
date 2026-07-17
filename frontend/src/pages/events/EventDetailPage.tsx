import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sl } from 'date-fns/locale';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { errorMessage } from '../../api/client';
import { eventsApi } from '../../api/events.api';
import { usersApi } from '../../api/users.api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Spinner,
} from '../../components/ui';
import { useAuth } from '../../stores/auth.store';
import {
  EVENT_TYPE_LABELS,
  MEMBERSHIP_LABELS,
  type RsvpStatus,
} from '../../types';

// Brez "Morda" — usklajeno z mobilno aplikacijo (stari 'maybe' zapisi se še prikažejo).
const RSVP_OPTIONS: { value: RsvpStatus; label: string; color: string }[] = [
  { value: 'attending', label: 'Pridem', color: 'bg-green-600' },
  { value: 'late', label: 'Zamudim', color: 'bg-yellow-600' },
  { value: 'not_attending', label: 'Ne pridem', color: 'bg-red-600' },
];

const rsvpBadge: Record<RsvpStatus, 'green' | 'yellow' | 'red' | 'gray'> = {
  attending: 'green',
  late: 'yellow',
  maybe: 'gray',
  not_attending: 'red',
};

const rsvpLabel: Record<RsvpStatus, string> = {
  attending: 'Pridem',
  late: 'Zamudim',
  maybe: 'Morda',
  not_attending: 'Ne pridem',
};

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isLeadership } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState('');
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [showAttendance, setShowAttendance] = useState(false);

  const {
    data: event,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsApi.get(id!),
    enabled: !!id,
  });

  const { data: rsvps } = useQuery({
    queryKey: ['events', id, 'rsvps'],
    queryFn: () => eventsApi.rsvps(id!),
    enabled: !!id && isLeadership,
  });

  const { data: members } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
    enabled: isLeadership && showAttendance,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const rsvpMutation = useMutation({
    mutationFn: (status: RsvpStatus) => eventsApi.rsvp(id!, status),
    onSuccess: invalidate,
    onError: (err) => setActionError(errorMessage(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: () => eventsApi.cancel(id!),
    onSuccess: invalidate,
    onError: (err) => setActionError(errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => eventsApi.remove(id!),
    onSuccess: () => {
      invalidate();
      navigate('/events');
    },
    onError: (err) => setActionError(errorMessage(err)),
  });

  const attendanceMutation = useMutation({
    mutationFn: () =>
      eventsApi.markAttendance(
        id!,
        Object.entries(attendance).map(([userId, present]) => ({
          userId,
          present,
        })),
      ),
    onSuccess: () => {
      setShowAttendance(false);
      invalidate();
    },
    onError: (err) => setActionError(errorMessage(err)),
  });

  if (isError)
    return (
      <ErrorState
        message="Dogodka ni bilo mogoče naložiti."
        onRetry={() => refetch()}
      />
    );
  if (isLoading || !event) return <Spinner />;

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {event.title}
            {event.isCancelled && (
              <span className="ml-3 align-middle text-sm font-semibold text-red-600">
                ODPOVEDANO
              </span>
            )}
          </h1>
          <p className="mt-1 text-gray-500">
            {format(new Date(event.startsAt), 'EEEE, d. MMMM yyyy · HH:mm', {
              locale: sl,
            })}
            {event.endsAt
              ? ` – ${format(new Date(event.endsAt), 'HH:mm')}`
              : ''}
            {event.location ? ` · ${event.location}` : ''}
          </p>
        </div>
        <Badge color="blue">{EVENT_TYPE_LABELS[event.eventType]}</Badge>
      </div>

      {actionError && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="space-y-6">
        {event.description && (
          <Card title="Opis">
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {event.description}
            </p>
          </Card>
        )}

        {event.targetGroup && event.targetGroup.length > 0 && (
          <Card title="Ciljna skupina">
            <div className="flex gap-2">
              {event.targetGroup.map((g) => (
                <Badge key={g} color="blue">
                  {MEMBERSHIP_LABELS[g]}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Moja prijava */}
        {event.requiresRsvp && !event.isCancelled && (
          <Card title="Moja udeležba">
            <div className="flex flex-wrap gap-2">
              {RSVP_OPTIONS.map((opt) => {
                const selected = event.myRsvpStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setActionError('');
                      rsvpMutation.mutate(opt.value);
                    }}
                    disabled={rsvpMutation.isPending}
                    className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${opt.color} ${
                      selected
                        ? 'ring-2 ring-gray-800 ring-offset-2'
                        : event.myRsvpStatus
                          ? 'opacity-50'
                          : ''
                    }`}
                  >
                    {selected ? `✓ ${opt.label}` : opt.label}
                  </button>
                );
              })}
            </div>
            {rsvpMutation.isSuccess && (
              <p className="mt-2 text-sm text-green-700">
                Tvoja prijava je zabeležena.
              </p>
            )}
          </Card>
        )}

        {/* Odzivi — vodstvo */}
        {isLeadership && (
          <Card
            title={`Odzivi (${rsvps?.length ?? 0})`}
            actions={
              <span className="text-xs text-gray-400">
                pridem:{' '}
                {rsvps?.filter((r) => r.status === 'attending').length ?? 0}
              </span>
            }
          >
            {!rsvps || rsvps.length === 0 ? (
              <EmptyState message="Še ni odzivov." />
            ) : (
              rsvps.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {r.user
                        ? `${r.user.firstName} ${r.user.lastName}`
                        : 'Neznan'}
                    </p>
                    {r.note && (
                      <p className="text-xs text-gray-500">{r.note}</p>
                    )}
                  </div>
                  <Badge color={rsvpBadge[r.status]}>
                    {rsvpLabel[r.status]}
                  </Badge>
                </div>
              ))
            )}
          </Card>
        )}

        {/* Prisotnost — vodstvo */}
        {isLeadership && !event.isCancelled && (
          <Card
            title="Prisotnost"
            actions={
              !showAttendance && (
                <Button
                  variant="secondary"
                  onClick={() => setShowAttendance(true)}
                >
                  Označi prisotnost
                </Button>
              )
            }
          >
            {showAttendance ? (
              <div>
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {members
                    ?.filter((m) => m.isActive)
                    .map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={attendance[m.id] ?? false}
                          onChange={(e) =>
                            setAttendance((prev) => ({
                              ...prev,
                              [m.id]: e.target.checked,
                            }))
                          }
                        />
                        {m.lastName} {m.firstName}
                      </label>
                    ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={() => attendanceMutation.mutate()}
                    disabled={
                      attendanceMutation.isPending ||
                      Object.keys(attendance).length === 0
                    }
                  >
                    Shrani prisotnost
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowAttendance(false)}
                  >
                    Prekliči
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Klikni »Označi prisotnost« za vodenje evidence.
              </p>
            )}
          </Card>
        )}

        {/* Akcije vodstva */}
        {isLeadership && (
          <div className="flex gap-3">
            {!event.isCancelled && (
              <>
                <Link to={`/events/${event.id}/edit`}>
                  <Button variant="secondary">Uredi</Button>
                </Link>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm('Res želiš odpovedati dogodek?')) {
                      setActionError('');
                      cancelMutation.mutate();
                    }
                  }}
                  disabled={cancelMutation.isPending}
                >
                  Odpovej dogodek
                </Button>
              </>
            )}
            {/* Brisanje — samo pretekli ali odpovedani dogodki (zrcali backend). */}
            {(event.isCancelled ||
              new Date(event.endsAt ?? event.startsAt) < new Date()) && (
              <Button
                variant="danger"
                onClick={() => {
                  if (
                    confirm(
                      'Res želiš trajno izbrisati dogodek? Izbrišejo se tudi odzivi in evidenca prisotnosti.',
                    )
                  ) {
                    setActionError('');
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                Izbriši dogodek
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
