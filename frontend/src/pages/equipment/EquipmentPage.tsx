import { useQuery } from '@tanstack/react-query';
import { differenceInDays } from 'date-fns';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { equipmentApi } from '../../api/equipment.api';
import { vehiclesApi } from '../../api/vehicles.api';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Spinner,
} from '../../components/ui';
import { useAuth } from '../../stores/auth.store';
import {
  EQUIPMENT_CONDITION_LABELS,
  EQUIPMENT_MANAGE_ROLES,
  type EquipmentCondition,
} from '../../types';

const conditionColor: Record<
  EquipmentCondition,
  'green' | 'yellow' | 'red' | 'gray'
> = {
  excellent: 'green',
  good: 'green',
  fair: 'yellow',
  poor: 'red',
  out_of_service: 'red',
};

/** Barva roka naslednjega pregleda. */
function inspectionBadge(date?: string) {
  if (!date) return <span className="text-gray-300">—</span>;
  const days = differenceInDays(new Date(date), new Date());
  const color = days < 0 ? 'red' : days <= 30 ? 'yellow' : 'green';
  return (
    <Badge color={color}>
      {date}
      {days < 0 ? ' (zamujeno)' : days <= 30 ? ` (${days} dni)` : ''}
    </Badge>
  );
}

export function EquipmentPage() {
  const { user } = useAuth();
  const canManage =
    user?.roles.some((r) => EQUIPMENT_MANAGE_ROLES.includes(r)) ?? false;

  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState('');
  const [category, setCategory] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const { data: equipment, isLoading, isError, refetch } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => equipmentApi.list(),
  });
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesApi.list,
  });

  // Kategorije, ki se dejansko uporabljajo — za spustni filter.
  const categories = useMemo(
    () =>
      [...new Set((equipment ?? []).map((e) => e.category).filter(Boolean))]
        .sort((a, b) => a!.localeCompare(b!, 'sl')) as string[],
    [equipment],
  );

  const filtered = useMemo(() => {
    if (!equipment) return [];
    const q = search.toLowerCase();
    return equipment.filter((e) => {
      if (!showInactive && !e.isActive) return false;
      if (condition && e.condition !== condition) return false;
      if (category && e.category !== category) return false;
      if (vehicleId && e.vehicleId !== vehicleId) return false;
      if (
        q &&
        !`${e.name} ${e.category ?? ''} ${e.inventoryNumber ?? ''}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [equipment, search, condition, category, vehicleId, showInactive]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Oprema</h1>
        {canManage && (
          <Link to="/equipment/new">
            <Button>+ Dodaj opremo</Button>
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Input
            placeholder="Išči po nazivu, kategoriji, inv. št. ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          >
            <option value="">Vsa stanja</option>
            {Object.entries(EQUIPMENT_CONDITION_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Vse kategorije</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <Select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
          >
            <option value="">Vsa vozila</option>
            {vehicles?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
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
          Prikaži neaktivno
        </label>
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState
          message="Seznama opreme ni bilo mogoče naložiti."
          onRetry={() => refetch()}
        />
      ) : filtered.length === 0 ? (
        <EmptyState message="Ni opreme, ki bi ustrezala filtrom." />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Naziv</th>
                <th className="px-4 py-3">Kategorija</th>
                <th className="px-4 py-3">Inv. št.</th>
                <th className="px-4 py-3">Lokacija</th>
                <th className="px-4 py-3">Stanje</th>
                <th className="px-4 py-3">Naslednji pregled</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${
                    e.isActive ? '' : 'opacity-50'
                  }`}
                >
                  <td className="px-4 py-3 font-medium">{e.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {e.category ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {e.inventoryNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {e.location ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={conditionColor[e.condition]}>
                      {EQUIPMENT_CONDITION_LABELS[e.condition]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {inspectionBadge(e.nextInspection)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage && (
                      <Link
                        to={`/equipment/${e.id}/edit`}
                        className="text-sm text-primary hover:underline"
                      >
                        Uredi
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        {filtered.length} od {equipment?.length ?? 0} kosov opreme
      </p>
    </div>
  );
}
