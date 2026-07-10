import { useQuery } from '@tanstack/react-query';
import { differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { vehiclesApi } from '../../api/vehicles.api';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Spinner,
} from '../../components/ui';
import { useAuth } from '../../stores/auth.store';
import { VEHICLE_TYPE_LABELS, type Vehicle } from '../../types';

/** Barva glede na oddaljenost roka: rdeča ≤ 7 dni / potekel, rumena ≤ 30, zelena sicer. */
function deadlineBadge(label: string, date?: string) {
  if (!date) return null;
  const days = differenceInDays(new Date(date), new Date());
  const color = days < 7 ? 'red' : days <= 30 ? 'yellow' : 'green';
  return (
    <Badge key={label} color={color}>
      {label}: {date}
      {days < 0 ? ' (POTEKLO!)' : days <= 30 ? ` (${days} dni)` : ''}
    </Badge>
  );
}

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  return (
    <Link
      to={`/vehicles/${vehicle.id}/edit`}
      className={`block rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
        vehicle.isActive ? '' : 'opacity-50'
      }`}
    >
      <div className="mb-1 flex items-start justify-between">
        <h2 className="font-semibold">
          🚒 {vehicle.name}
          {!vehicle.isActive && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              (neaktivno)
            </span>
          )}
        </h2>
        {vehicle.licensePlate && (
          <span className="rounded border border-gray-300 bg-gray-50 px-2 py-0.5 font-mono text-xs">
            {vehicle.licensePlate}
          </span>
        )}
      </div>
      <p className="mb-3 text-sm text-gray-500">
        {VEHICLE_TYPE_LABELS[vehicle.vehicleType]}
        {vehicle.year ? ` · ${vehicle.year}` : ''}
        {vehicle.mileage ? ` · ${vehicle.mileage.toLocaleString('sl')} km` : ''}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {deadlineBadge('Registracija', vehicle.registrationExpires)}
        {deadlineBadge('Zavarovanje', vehicle.insuranceExpires)}
        {deadlineBadge('Servis', vehicle.serviceDue)}
      </div>
      {vehicle.drivers && vehicle.drivers.length > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          Vozniki:{' '}
          {vehicle.drivers
            .map((d) => (d.user ? `${d.user.firstName} ${d.user.lastName}` : ''))
            .filter(Boolean)
            .join(', ')}
        </p>
      )}
    </Link>
  );
}

export function VehiclesPage() {
  const { isLeadership } = useAuth();
  const { data: vehicles, isLoading, isError, refetch } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesApi.list,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vozila</h1>
        {isLeadership && (
          <Link to="/vehicles/new">
            <Button>+ Dodaj vozilo</Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState
          message="Seznama vozil ni bilo mogoče naložiti."
          onRetry={() => refetch()}
        />
      ) : !vehicles || vehicles.length === 0 ? (
        <EmptyState message="Ni vozil. Dodaj prvo vozilo." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((v) => (
            <VehicleCard key={v.id} vehicle={v} />
          ))}
        </div>
      )}
    </div>
  );
}
