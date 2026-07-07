import { useMutation, useQuery } from '@tanstack/react-query';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { sl } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventsApi } from '../../api/events.api';
import { Badge, Card, EmptyState, Spinner } from '../../components/ui';
import {
  EVENT_TYPE_LABELS,
  type Event,
  type RsvpStatus,
} from '../../types';

// Brez "Morda" — usklajeno z mobilno aplikacijo.
const RSVP_OPTIONS: { value: RsvpStatus; label: string; color: string }[] = [
  { value: 'attending', label: 'Pridem', color: 'bg-green-600' },
  { value: 'late', label: 'Zamudim', color: 'bg-yellow-600' },
  { value: 'not_attending', label: 'Ne pridem', color: 'bg-red-600' },
];

const WEEKDAYS = ['pon', 'tor', 'sre', 'čet', 'pet', 'sob', 'ned'];

/** Gumbi za RSVP na posameznem dogodku (izbira se obarva po kliku). */
function RsvpButtons({ eventId }: { eventId: string }) {
  const [selected, setSelected] = useState<RsvpStatus | null>(null);
  const mutation = useMutation({
    mutationFn: (status: RsvpStatus) => eventsApi.rsvp(eventId, status),
    onSuccess: (_data, status) => setSelected(status),
  });

  return (
    <div className="flex flex-wrap gap-2">
      {RSVP_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(opt.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            selected === opt.value
              ? `${opt.color} text-white`
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
      {selected && (
        <span className="self-center text-xs text-green-700">✓ zabeleženo</span>
      )}
    </div>
  );
}

export function CalendarPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  // Dogodki za celotno prikazano mrežo (vključno z robnimi dnevi sosednjih mesecev).
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });

  const { data: events, isLoading } = useQuery({
    queryKey: ['events', 'calendar', format(month, 'yyyy-MM')],
    queryFn: () =>
      eventsApi.list({
        from: gridStart.toISOString(),
        to: gridEnd.toISOString(),
      }),
  });

  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [month],
  );

  const eventsByDay = (day: Date): Event[] =>
    (events ?? []).filter((e) => isSameDay(new Date(e.startsAt), day));

  const selectedEvents = eventsByDay(selectedDay);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Koledar</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mesečna mreža */}
        <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, -1))}
              className="rounded-lg px-3 py-1 text-lg hover:bg-gray-100"
              aria-label="Prejšnji mesec"
            >
              ‹
            </button>
            <p className="text-lg font-semibold capitalize">
              {format(month, 'LLLL yyyy', { locale: sl })}
            </p>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="rounded-lg px-3 py-1 text-lg hover:bg-gray-100"
              aria-label="Naslednji mesec"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-medium uppercase text-gray-400">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {isLoading ? (
            <Spinner />
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const dayEvents = eventsByDay(day);
                const selected = isSameDay(day, selectedDay);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`relative flex h-14 flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                      selected
                        ? 'bg-primary text-white'
                        : isToday(day)
                          ? 'bg-red-50 font-semibold text-primary'
                          : isSameMonth(day, month)
                            ? 'hover:bg-gray-100'
                            : 'text-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {format(day, 'd')}
                    {dayEvents.length > 0 && (
                      <span className="mt-1 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((e) => (
                          <span
                            key={e.id}
                            className={`h-1.5 w-1.5 rounded-full ${
                              selected ? 'bg-white' : 'bg-primary'
                            }`}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Dogodki izbranega dne */}
        <Card
          title={format(selectedDay, 'EEEE, d. MMMM', { locale: sl })}
          className="lg:col-span-1"
        >
          {selectedEvents.length === 0 ? (
            <EmptyState message="Na ta dan ni dogodkov." />
          ) : (
            <div className="space-y-4">
              {selectedEvents.map((e) => (
                <div
                  key={e.id}
                  className="rounded-lg border border-gray-100 p-3"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <Link
                      to={`/events/${e.id}`}
                      className="text-sm font-semibold hover:text-primary hover:underline"
                    >
                      {e.title}
                    </Link>
                    <Badge color="blue">{EVENT_TYPE_LABELS[e.eventType]}</Badge>
                  </div>
                  <p className="mb-2 text-xs text-gray-500">
                    {format(new Date(e.startsAt), 'HH:mm')}
                    {e.location ? ` · ${e.location}` : ''}
                    {e.isCancelled ? ' · ODPOVEDAN' : ''}
                  </p>
                  {e.requiresRsvp && !e.isCancelled && (
                    <RsvpButtons eventId={e.id} />
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
