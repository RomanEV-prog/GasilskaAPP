import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sl } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboard.api';
import { Badge, Card, EmptyState, Spinner } from '../../components/ui';
import { useAuth } from '../../stores/auth.store';
import { EVENT_TYPE_LABELS, type Event } from '../../types';

function formatDate(iso: string) {
  return format(new Date(iso), 'd. M. yyyy HH:mm', { locale: sl });
}

function EventRow({ event }: { event: Event }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0">
      <div>
        <p className="text-sm font-medium">{event.title}</p>
        <p className="text-xs text-gray-500">
          {formatDate(event.startsAt)}
          {event.location ? ` · ${event.location}` : ''}
        </p>
      </div>
      <Badge color="blue">{EVENT_TYPE_LABELS[event.eventType]}</Badge>
    </div>
  );
}

function StatTile({
  label,
  value,
  to,
}: {
  label: string;
  value: number;
  to?: string;
}) {
  const content = (
    <>
      <p className="text-3xl font-bold text-primary">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </>
  );
  if (to) {
    return (
      <Link
        to={to}
        className="block rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
      >
        {content}
      </Link>
    );
  }
  return <div className="rounded-xl bg-white p-5 shadow-sm">{content}</div>;
}

function AdminDashboardView() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: dashboardApi.admin,
  });

  if (isLoading || !data) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Vseh članov" value={data.members.total} />
        <StatTile label="Aktivnih" value={data.members.active} />
        <StatTile label="Operativcev" value={data.members.operatives} />
        <StatTile
          label="Prihajajočih dogodkov"
          value={data.upcomingEvents.length}
          to="/calendar"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Prihajajoči dogodki">
          {data.upcomingEvents.length === 0 ? (
            <EmptyState message="Ni prihajajočih dogodkov." />
          ) : (
            data.upcomingEvents.map((e) => <EventRow key={e.id} event={e} />)
          )}
        </Card>

        <Card title="Potekajoča usposabljanja (60 dni)">
          {data.expiringTrainings.length === 0 ? (
            <EmptyState message="Nič ne poteče v naslednjih 60 dneh." />
          ) : (
            data.expiringTrainings.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-gray-500">
                    {t.user ? `${t.user.firstName} ${t.user.lastName}` : ''}
                  </p>
                </div>
                <Badge color="yellow">poteče {t.expiresAt}</Badge>
              </div>
            ))
          )}
        </Card>

        <Card title="Vozila s potekajočimi roki (30 dni)">
          {data.expiringVehicles.length === 0 ? (
            <EmptyState message="Vsi roki vozil so v redu." />
          ) : (
            data.expiringVehicles.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0"
              >
                <p className="text-sm font-medium">{v.name}</p>
                <Badge color="red">
                  {[
                    v.registrationExpires && `reg. ${v.registrationExpires}`,
                    v.insuranceExpires && `zav. ${v.insuranceExpires}`,
                    v.serviceDue && `servis ${v.serviceDue}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Badge>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

function MemberDashboardView() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'member'],
    queryFn: dashboardApi.member,
  });

  if (isLoading || !data) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Prihajajoči dogodki">
          {data.upcomingEvents.length === 0 ? (
            <EmptyState message="Ni prihajajočih dogodkov." />
          ) : (
            data.upcomingEvents.map((e) => <EventRow key={e.id} event={e} />)
          )}
        </Card>

        <Card title="Moje prijave (RSVP)">
          {data.myRsvps.length === 0 ? (
            <EmptyState message="Ni prijav na dogodke." />
          ) : (
            data.myRsvps.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0"
              >
                <p className="text-sm font-medium">{r.event?.title}</p>
                <Badge
                  color={
                    r.status === 'attending'
                      ? 'green'
                      : r.status === 'not_attending'
                        ? 'red'
                        : 'yellow'
                  }
                >
                  {r.status === 'attending'
                    ? 'Pridem'
                    : r.status === 'not_attending'
                      ? 'Ne pridem'
                      : r.status === 'late'
                        ? 'Zamudim'
                        : 'Morda'}
                </Badge>
              </div>
            ))
          )}
        </Card>

        <Card title="Moja usposabljanja">
          {data.myTrainings.length === 0 ? (
            <EmptyState message="Ni evidentiranih usposabljanj." />
          ) : (
            data.myTrainings.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0"
              >
                <p className="text-sm font-medium">{t.name}</p>
                {t.expiresAt ? (
                  <Badge
                    color={
                      new Date(t.expiresAt) < new Date()
                        ? 'red'
                        : new Date(t.expiresAt).getTime() - Date.now() <
                            60 * 864e5
                          ? 'yellow'
                          : 'green'
                    }
                  >
                    do {t.expiresAt}
                  </Badge>
                ) : (
                  <Badge color="gray">trajno</Badge>
                )}
              </div>
            ))
          )}
        </Card>

        <Card title="Obvestila">
          {data.myNotifications.length === 0 ? (
            <EmptyState message="Ni obvestil." />
          ) : (
            data.myNotifications.map((n) => (
              <div
                key={n.id}
                className="border-b border-gray-100 py-2 last:border-0"
              >
                <p className={`text-sm ${n.isRead ? '' : 'font-semibold'}`}>
                  {n.title}
                </p>
                <p className="text-xs text-gray-500">{n.body}</p>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user, isLeadership } = useAuth();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">
        Pozdravljen, {user?.firstName}!
      </h1>
      {isLeadership ? <AdminDashboardView /> : <MemberDashboardView />}
    </div>
  );
}
