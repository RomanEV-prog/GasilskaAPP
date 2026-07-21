import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { errorMessage } from '../../api/client';
import { usersApi } from '../../api/users.api';
import { vehiclesApi } from '../../api/vehicles.api';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Spinner,
} from '../../components/ui';
import {
  VEHICLE_OZNAKA_GROUPS,
  vehicleTypeLabel,
  type Vehicle,
  type VehicleWrite,
} from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Vnesite naziv vozila.'),
  vehicleType: z.string(),
  licensePlate: z.string(),
  vin: z.string(),
  year: z.string(),
  mileage: z.string(),
  registrationExpires: z.string(),
  insuranceExpires: z.string(),
  serviceDue: z.string(),
  serviceMileage: z.string(),
  notes: z.string(),
});

type FormData = z.infer<typeof schema>;

export function VehicleFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');
  const [newDriverId, setNewDriverId] = useState('');

  const { data: existing, isLoading } = useQuery({
    queryKey: ['vehicles', id],
    queryFn: () => vehiclesApi.get(id!),
    enabled: isEdit,
  });

  const { data: members } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicleType: 'GVC-1',
      licensePlate: '',
      vin: '',
      year: '',
      mileage: '',
      registrationExpires: '',
      insuranceExpires: '',
      serviceDue: '',
      serviceMileage: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        vehicleType: existing.vehicleType,
        licensePlate: existing.licensePlate ?? '',
        vin: existing.vin ?? '',
        year: existing.year?.toString() ?? '',
        mileage: existing.mileage?.toString() ?? '',
        registrationExpires: existing.registrationExpires ?? '',
        insuranceExpires: existing.insuranceExpires ?? '',
        serviceDue: existing.serviceDue ?? '',
        serviceMileage: existing.serviceMileage?.toString() ?? '',
        notes: existing.notes ?? '',
      });
    }
  }, [existing, reset]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  };

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      // Datumska/številska polja rokov pošlji kot `null`, kadar so prazna —
      // tako se obstoječi rok IZBRIŠE. `undefined` bi backend izpustil in
      // stari datum bi ostal (hrošč: vnesenega servisnega datuma ni bilo
      // mogoče počistiti).
      const payload: VehicleWrite = {
        name: data.name,
        vehicleType: data.vehicleType as Vehicle['vehicleType'],
        licensePlate: data.licensePlate || undefined,
        vin: data.vin || undefined,
        year: data.year ? parseInt(data.year, 10) : undefined,
        mileage: data.mileage ? parseInt(data.mileage, 10) : undefined,
        registrationExpires: data.registrationExpires || null,
        insuranceExpires: data.insuranceExpires || null,
        serviceDue: data.serviceDue || null,
        serviceMileage: data.serviceMileage
          ? parseInt(data.serviceMileage, 10)
          : null,
        notes: data.notes || undefined,
      };
      return isEdit
        ? vehiclesApi.update(id!, payload)
        : vehiclesApi.create(payload);
    },
    onSuccess: () => {
      invalidate();
      navigate('/vehicles');
    },
    onError: (err) => setServerError(errorMessage(err)),
  });

  const addDriver = useMutation({
    mutationFn: () => vehiclesApi.addDriver(id!, newDriverId),
    onSuccess: () => {
      setNewDriverId('');
      queryClient.invalidateQueries({ queryKey: ['vehicles', id] });
      invalidate();
    },
    onError: (err) => setServerError(errorMessage(err)),
  });

  const removeDriver = useMutation({
    mutationFn: (userId: string) => vehiclesApi.removeDriver(id!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', id] });
      invalidate();
    },
    onError: (err) => setServerError(errorMessage(err)),
  });

  const deactivate = useMutation({
    mutationFn: () => vehiclesApi.deactivate(id!),
    onSuccess: () => {
      invalidate();
      navigate('/vehicles');
    },
    onError: (err) => setServerError(errorMessage(err)),
  });

  if (isEdit && isLoading) return <Spinner />;

  const driverIds = new Set(existing?.drivers?.map((d) => d.userId) ?? []);
  const candidates =
    members?.filter((m) => m.isActive && !driverIds.has(m.id)) ?? [];

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">
        {isEdit ? `Uredi vozilo — ${existing?.name ?? ''}` : 'Dodaj vozilo'}
      </h1>

      <form
        onSubmit={handleSubmit((d) => {
          setServerError('');
          mutation.mutate(d);
        })}
        className="space-y-6"
      >
        <Card title="Osnovni podatki">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Naziv *"
              placeholder="GVC 16/25"
              error={errors.name?.message}
              {...register('name')}
            />
            <Select label="Oznaka (tipizacija)" {...register('vehicleType')}>
              {/* Stara vrednost obstoječega vozila ostane izbirna, dokler je ne zamenjaš. */}
              {existing &&
                !VEHICLE_OZNAKA_GROUPS.some((g) =>
                  g.oznake.some((o) => o.value === existing.vehicleType),
                ) && (
                  <option value={existing.vehicleType}>
                    {vehicleTypeLabel(existing.vehicleType)}
                  </option>
                )}
              {VEHICLE_OZNAKA_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.oznake.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
            <Input
              label="Registrska označba"
              placeholder="MB AB-123"
              {...register('licensePlate')}
            />
            <Input label="Št. šasije (VIN)" {...register('vin')} />
            <Input label="Letnik" type="number" {...register('year')} />
            <Input
              label="Prevoženi km"
              type="number"
              {...register('mileage')}
            />
          </div>
        </Card>

        <Card title="Roki (za opomnike)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Registracija poteče"
              type="date"
              {...register('registrationExpires')}
            />
            <Input
              label="Zavarovanje poteče"
              type="date"
              {...register('insuranceExpires')}
            />
            <Input
              label="Servis do"
              type="date"
              {...register('serviceDue')}
            />
            <Input
              label="Servis pri km"
              type="number"
              {...register('serviceMileage')}
            />
          </div>
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Opombe
            </span>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
              {...register('notes')}
            />
          </label>
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
            onClick={() => navigate('/vehicles')}
          >
            Prekliči
          </Button>
          {isEdit && existing?.isActive && (
            <Button
              type="button"
              variant="danger"
              className="ml-auto"
              onClick={() => {
                if (confirm('Res želiš deaktivirati to vozilo?')) {
                  deactivate.mutate();
                }
              }}
            >
              Deaktiviraj
            </Button>
          )}
        </div>
      </form>

      {/* Vozniki — samo pri urejanju */}
      {isEdit && (
        <div className="mt-6">
          <Card title="Vozniki">
            {!existing?.drivers || existing.drivers.length === 0 ? (
              <EmptyState message="Vozilo še nima dodeljenih voznikov." />
            ) : (
              existing.drivers.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0"
                >
                  <p className="text-sm">
                    {d.user
                      ? `${d.user.firstName} ${d.user.lastName}`
                      : d.userId}
                    {d.user?.phone && (
                      <span className="ml-2 text-xs text-gray-400">
                        {d.user.phone}
                      </span>
                    )}
                  </p>
                  <button
                    onClick={() => removeDriver.mutate(d.userId)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Odstrani
                  </button>
                </div>
              ))
            )}

            <div className="mt-4 flex gap-2">
              <div className="flex-1">
                <Select
                  value={newDriverId}
                  onChange={(e) => setNewDriverId(e.target.value)}
                >
                  <option value="">Izberi člana ...</option>
                  {candidates.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.lastName} {m.firstName}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={!newDriverId || addDriver.isPending}
                onClick={() => addDriver.mutate()}
              >
                Dodaj voznika
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
