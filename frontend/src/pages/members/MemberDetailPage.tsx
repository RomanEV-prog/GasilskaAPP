import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { trainingsApi } from '../../api/trainings.api';
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
  MEMBERSHIP_LABELS,
  ROLE_LABELS,
} from '../../types';

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase text-gray-400">{label}</p>
      <p className="text-sm">{value || '—'}</p>
    </div>
  );
}

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isLeadership, user: me } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.get(id!),
    enabled: !!id,
  });

  const { data: trainings } = useQuery({
    queryKey: ['trainings', 'user', id],
    queryFn: () => trainingsApi.byUser(id!),
    enabled: !!id && isLeadership,
  });

  const deactivate = useMutation({
    mutationFn: () => usersApi.deactivate(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      navigate('/members');
    },
  });

  if (isError)
    return (
      <Card title="Član">
        <ErrorState
          message="Podatkov o članu ni bilo mogoče naložiti."
          onRetry={() => refetch()}
        />
      </Card>
    );
  if (isLoading || !user) return <Spinner />;

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {user.firstName} {user.lastName}
        </h1>
        {isLeadership && (
          <div className="flex gap-2">
            <Link to={`/members/${user.id}/edit`}>
              <Button variant="secondary">Uredi</Button>
            </Link>
            {user.isActive && user.id !== me?.id && (
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm('Res želiš deaktivirati tega člana?')) {
                    deactivate.mutate();
                  }
                }}
              >
                Deaktiviraj
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <Card title="Osnovni podatki">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Field label="Uporabniško ime" value={user.username} />
            <Field label="E-pošta" value={user.email ?? "—"} />
            <Field label="Telefon" value={user.phone} />
            <Field label="Naslov" value={user.address} />
            <Field label="Kraj" value={user.city} />
            <Field label="Datum rojstva" value={user.dateOfBirth} />
            <Field label="Član od" value={user.joinedAt} />
            <Field label="Čin" value={user.rank} />
            <Field label="Št. izkaznice" value={user.membershipNumber} />
          </div>
        </Card>

        <Card title="Status">
          <div className="flex flex-wrap gap-2">
            <Badge color="blue">{MEMBERSHIP_LABELS[user.membershipStatus]}</Badge>
            <Badge color={user.isActive ? 'green' : 'red'}>
              {user.isActive ? 'Aktiven' : 'Neaktiven'}
            </Badge>
            {user.roles?.map((r) => (
              <Badge key={r} color="yellow">
                {ROLE_LABELS[r]}
              </Badge>
            ))}
          </div>
        </Card>

        {isLeadership && (
          <Card title="Usposabljanja">
            {!trainings || trainings.length === 0 ? (
              <EmptyState message="Ni evidentiranih usposabljanj." />
            ) : (
              trainings.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-gray-500">
                      {t.provider ?? ''} · opravljeno {t.completedAt}
                    </p>
                  </div>
                  {t.expiresAt ? (
                    <Badge
                      color={
                        new Date(t.expiresAt) < new Date() ? 'red' : 'green'
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
        )}
      </div>
    </div>
  );
}
