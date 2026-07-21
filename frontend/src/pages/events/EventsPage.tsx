import { useQuery } from '@tanstack/react-query';
import { format, isPast } from 'date-fns';
import { sl } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventsApi } from '../../api/events.api';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Select,
  Spinner,
} from '../../components/ui';
import { useAuth } from '../../stores/auth.store';
import { EVENT_TYPE_LABELS, type Event, type RsvpStatus } from '../../types';

const typeColor: Record<string, 'blue' | 'red' | 'green' | 'yellow' | 'gray'> =
  {
    drill: 'blue',
    intervention: 'red',
    competition: 'green',
    meeting: 'yellow',
  };

// Usklajeno z EventDetailPage (isti izbor barv/oznak za odziv).
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

function EventCard({ event }: { event: Event }) {
  const past = isPast(new Date(event.startsAt));
  return (
    <Link
      to={`/events/${event.id}`}
      className={`block rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${
        event.isCancelled || past ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">
            {event.title}
            {event.isCancelled && (
              <span className="ml-2 text-xs font-normal text-red-600">
                ODPOVEDANO
              </span>
            )}
          </p>
          <p className="mt-0.5 text-sm text-gray-500">
            {format(new Date(event.startsAt), 'EEEE, d. MMMM yyyy · HH:mm', {
              locale: sl,
            })}
            {event.location ? ` · ${event.location}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge color={typeColor[event.eventType] ?? 'gray'}>
            {EVENT_TYPE_LABELS[event.eventType]}
          </Badge>
          {/* Moj odziv, viden brez odpiranja dogodka. */}
          {event.requiresRsvp && !event.isCancelled && (
            <Badge color={event.myRsvpStatus ? rsvpBadge[event.myRsvpStatus] : 'gray'}>
              {event.myRsvpStatus ? rsvpLabel[event.myRsvpStatus] : 'Brez odziva'}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}

export function EventsPage() {
  const { isLeadership } = useAuth();
  const [type, setType] = useState('');
  const [showPast, setShowPast] = useState(false);

  const { data: events, isLoading, isError, refetch } = useQuery({
    queryKey: ['events', { includeCancelled: true }],
    queryFn: () => eventsApi.list({ includeCancelled: 'true' }),
  });

  const groups = useMemo(() => {
    if (!events) return [];
    const now = Date.now();
    const filtered = events.filter((e) => {
      if (type && e.eventType !== type) return false;
      if (!showPast && new Date(e.startsAt).getTime() < now - 864e5)
        return false;
      return true;
    });
    // Grupiraj po mesecih
    const byMonth = new Map<string, Event[]>();
    for (const e of filtered) {
      const key = format(new Date(e.startsAt), 'LLLL yyyy', { locale: sl });
      byMonth.set(key, [...(byMonth.get(key) ?? []), e]);
    }
    return [...byMonth.entries()];
  }, [events, type, showPast]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dogodki</h1>
        {isLeadership && (
          <Link to="/events/new">
            <Button>+ Nov dogodek</Button>
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Vsi tipi</option>
            {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showPast}
            onChange={(e) => setShowPast(e.target.checked)}
          />
          Prikaži pretekle
        </label>
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState
          message="Dogodkov ni bilo mogoče naložiti."
          onRetry={() => refetch()}
        />
      ) : groups.length === 0 ? (
        <EmptyState message="Ni dogodkov." />
      ) : (
        <div className="space-y-6">
          {groups.map(([month, list]) => (
            <div key={month}>
              <h2 className="mb-2 text-sm font-semibold uppercase text-gray-400">
                {month}
              </h2>
              <div className="space-y-2">
                {list.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
