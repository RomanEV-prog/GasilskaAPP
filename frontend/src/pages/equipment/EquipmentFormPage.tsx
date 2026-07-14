import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { errorMessage } from '../../api/client';
import { equipmentApi } from '../../api/equipment.api';
import { vehiclesApi } from '../../api/vehicles.api';
import { QrCode } from '../../components/QrCode';
import { Button, Card, Input, Select, Spinner } from '../../components/ui';
import { useAuth } from '../../stores/auth.store';
import {
  EQUIPMENT_CONDITION_LABELS,
  type Equipment,
} from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Vnesite naziv opreme.'),
  category: z.string(),
  inventoryNumber: z.string(),
  location: z.string(),
  vehicleId: z.string(),
  condition: z.string(),
  lastInspection: z.string(),
  nextInspection: z.string(),
  notes: z.string(),
});

type FormData = z.infer<typeof schema>;

export function EquipmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.roles.includes('org_admin') ?? false;
  const [serverError, setServerError] = useState('');

  const { data: existing, isLoading } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => equipmentApi.get(id!),
    enabled: isEdit,
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesApi.list,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: '',
      inventoryNumber: '',
      location: '',
      vehicleId: '',
      condition: 'good',
      lastInspection: '',
      nextInspection: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        category: existing.category ?? '',
        inventoryNumber: existing.inventoryNumber ?? '',
        location: existing.location ?? '',
        vehicleId: existing.vehicleId ?? '',
        condition: existing.condition,
        lastInspection: existing.lastInspection ?? '',
        nextInspection: existing.nextInspection ?? '',
        notes: existing.notes ?? '',
      });
    }
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload: Partial<Equipment> = {
        name: data.name,
        category: data.category || undefined,
        inventoryNumber: data.inventoryNumber || undefined,
        location: data.location || undefined,
        vehicleId: data.vehicleId || undefined,
        condition: data.condition as Equipment['condition'],
        lastInspection: data.lastInspection || undefined,
        nextInspection: data.nextInspection || undefined,
        notes: data.notes || undefined,
      };
      return isEdit
        ? equipmentApi.update(id!, payload)
        : equipmentApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      navigate('/equipment');
    },
    onError: (err) => setServerError(errorMessage(err)),
  });

  const deactivate = useMutation({
    mutationFn: () => equipmentApi.deactivate(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      navigate('/equipment');
    },
    onError: (err) => setServerError(errorMessage(err)),
  });

  if (isEdit && isLoading) return <Spinner />;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">
        {isEdit ? `Uredi opremo — ${existing?.name ?? ''}` : 'Dodaj opremo'}
      </h1>

      <form
        onSubmit={handleSubmit((d) => {
          setServerError('');
          mutation.mutate(d);
        })}
        className="space-y-6"
      >
        <Card title="Podatki">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Naziv *"
              placeholder="Izolirni dihalni aparat"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Kategorija"
              placeholder="Zaščitna oprema"
              {...register('category')}
            />
            <Input
              label="Inventarna številka"
              placeholder="IDA-001"
              {...register('inventoryNumber')}
            />
            <Input
              label="Lokacija"
              placeholder="Garaža — omara 3"
              {...register('location')}
            />
            <Select label="Stanje" {...register('condition')}>
              {Object.entries(EQUIPMENT_CONDITION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
            <Select label="Na vozilu" {...register('vehicleId')}>
              <option value="">— ni na vozilu —</option>
              {vehicles?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
            <Input
              label="Zadnji pregled"
              type="date"
              {...register('lastInspection')}
            />
            <Input
              label="Naslednji pregled"
              type="date"
              {...register('nextInspection')}
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

        {/* QR koda — samo pri urejanju z inventarno številko */}
        {isEdit && existing?.qrCode && (
          <Card title="QR koda">
            <div className="flex items-center gap-5">
              <QrCode value={existing.qrCode} />
              <div>
                <p className="font-mono text-sm">{existing.qrCode}</p>
                <p className="mt-1 text-xs text-gray-400">
                  Natisni in nalepi na opremo za hitro skeniranje.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => window.print()}
                >
                  Natisni
                </Button>
              </div>
            </div>
          </Card>
        )}

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
            onClick={() => navigate('/equipment')}
          >
            Prekliči
          </Button>
          {isEdit && isAdmin && existing?.isActive && (
            <Button
              type="button"
              variant="danger"
              className="ml-auto"
              onClick={() => {
                if (confirm('Res želiš deaktivirati to opremo?')) {
                  deactivate.mutate();
                }
              }}
            >
              Deaktiviraj
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
