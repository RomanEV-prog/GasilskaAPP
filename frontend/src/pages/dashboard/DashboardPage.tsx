import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sl } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboard.api';
import { organizationsApi } from '../../api/organizations.api';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Spinner,
} from '../../components/ui';
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
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: dashboardApi.admin,
  });

  if (isError)
    return (
      <ErrorState
        message="Nadzorne plošče ni bilo mogoče naložiti."
        onRetry={() => refetch()}
      />
    );
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
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'member'],
    queryFn: dashboardApi.member,
  });

  if (isError)
    return (
      <ErrorState
        message="Nadzorne plošče ni bilo mogoče naložiti."
        onRetry={() => refetch()}
      />
    );
  if (isLoading || !data) return <Spinner />;

  // Dedup (feedback Darjan): prijave (RSVP) so odslej vidne v zavihku Dogodki
  // in v koledarju, obvestila v svojem zavihku — nadzorna plošča kaže povzetek.
  const unread = data.myNotifications.filter((n) => !n.isRead).length;

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

        <Link
          to="/notifications"
          className="block rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="text-sm font-semibold text-gray-700">Obvestila</p>
          {unread > 0 ? (
            <p className="mt-2 text-sm">
              <Badge color="red">{unread} neprebranih</Badge>
            </p>
          ) : (
            <p className="mt-2 text-sm text-gray-500">Ni novih obvestil.</p>
          )}
          <p className="mt-2 text-xs text-gray-400">Odpri zavihek Obvestila →</p>
        </Link>

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
      </div>
    </div>
  );
}

/** Gumb za skupni foto-album društva (če je admin nastavil povezavo). */
function PhotoLinkCard() {
  const { data: org } = useQuery({
    queryKey: ['organization', 'me'],
    queryFn: organizationsApi.getMine,
  });
  const link = org?.photoUploadLink?.trim();
  if (!link) return null;
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <span className="text-2xl">📷</span>
      <div>
        <p className="text-sm font-semibold text-gray-700">Fotografije</p>
        <p className="text-xs text-gray-400">
          Odpri skupni album društva (gledanje in nalaganje slik) →
        </p>
      </div>
    </a>
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
      <div className="mt-6">
        <PhotoLinkCard />
      </div>
    </div>
  );
}
