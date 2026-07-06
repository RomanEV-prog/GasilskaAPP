import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usersApi } from '../../api/users.api';
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Select,
  Spinner,
} from '../../components/ui';
import { useAuth } from '../../stores/auth.store';
import {
  AVAILABILITY_LABELS,
  MEMBERSHIP_LABELS,
  type MembershipStatus,
} from '../../types';

const availabilityColor: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
  available: 'green',
  at_home: 'yellow',
  at_work: 'yellow',
  on_leave: 'gray',
  sick: 'red',
  unavailable: 'red',
};

export function MembersPage() {
  const { isLeadership } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  // Razpoložljivostni filter se sinhronizira z URL (?availability=available),
  // da lahko nanj kaže gumb "Trenutno dosegljivih" z nadzorne plošče.
  const availability = searchParams.get('availability') ?? '';

  const setAvailability = (value: string) => {
    setSearchParams(
      (prev) => {
        if (value) prev.set('availability', value);
        else prev.delete('availability');
        return prev;
      },
      { replace: true },
    );
  };

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.toLowerCase();
    return users.filter((u) => {
      if (!showInactive && !u.isActive) return false;
      if (status && u.membershipStatus !== status) return false;
      if (availability && u.availability !== availability) return false;
      if (
        q &&
        !`${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [users, search, status, availability, showInactive]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Člani</h1>
        {isLeadership && (
          <Link to="/members/new">
            <Button>+ Dodaj člana</Button>
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Input
            placeholder="Išči po imenu ali e-pošti ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Vsi statusi</option>
            {Object.entries(MEMBERSHIP_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <Select
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
          >
            <option value="">Vsa razpoložljivost</option>
            {Object.entries(AVAILABILITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Prikaži neaktivne
        </label>
      </div>

      {isLoading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState message="Ni članov, ki bi ustrezali filtrom." />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Ime</th>
                <th className="px-4 py-3">E-pošta</th>
                <th className="px-4 py-3">Telefon</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Razpoložljivost</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${
                    u.isActive ? '' : 'opacity-50'
                  }`}
                >
                  <td className="px-4 py-3 font-medium">
                    {u.lastName} {u.firstName}
                    {!u.isActive && (
                      <span className="ml-2 text-xs text-gray-400">
                        (neaktiven)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600">{u.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge color="blue">
                      {MEMBERSHIP_LABELS[u.membershipStatus]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={availabilityColor[u.availability] ?? 'gray'}>
                      {AVAILABILITY_LABELS[u.availability]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/members/${u.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Profil
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        {filtered.length} od {users?.length ?? 0} članov
      </p>
    </div>
  );
}

export type { MembershipStatus };
