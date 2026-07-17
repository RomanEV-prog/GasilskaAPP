import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { errorMessage } from '../../api/client';
import { usersApi } from '../../api/users.api';
import { Button, Card, Input, Select, Spinner } from '../../components/ui';
import {
  MEMBERSHIP_LABELS,
  ROLE_LABELS,
  type SystemRole,
  type User,
} from '../../types';

const schema = z.object({
  firstName: z.string().min(1, 'Vnesite ime.'),
  lastName: z.string().min(1, 'Vnesite priimek.'),
  // Neobvezna — prijava poteka z uporabniškim imenom (ime.priimek).
  email: z
    .string()
    .refine((v) => v === '' || z.string().email().safeParse(v).success, {
      message: 'Vnesite veljaven e-poštni naslov.',
    }),
  password: z
    .string()
    .refine((v) => v === '' || v.length >= 8, {
      message: 'Geslo mora imeti vsaj 8 znakov.',
    }),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  dateOfBirth: z.string(),
  // Obvezna izrecna izbira — prej so bili vsi novi člani tiho "operativec".
  membershipStatus: z.string().min(1, 'Izberite status članstva.'),
  rank: z.string(),
  membershipNumber: z.string(),
  joinedAt: z.string(),
});

type FormData = z.infer<typeof schema>;

/** Vloge, ki jih lahko dodeli org admin (brez super_admin). */
const ASSIGNABLE_ROLES = Object.keys(ROLE_LABELS).filter(
  (r) => r !== 'super_admin',
) as SystemRole[];

function toPayload(data: FormData, roles: SystemRole[]) {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email || undefined,
    ...(data.password ? { password: data.password } : {}),
    phone: data.phone || undefined,
    address: data.address || undefined,
    city: data.city || undefined,
    dateOfBirth: data.dateOfBirth || undefined,
    membershipStatus: data.membershipStatus as User['membershipStatus'],
    rank: data.rank || undefined,
    membershipNumber: data.membershipNumber || undefined,
    joinedAt: data.joinedAt || undefined,
    roles,
  };
}

export function MemberFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');
  const [roles, setRoles] = useState<SystemRole[]>(['member']);

  const { data: existing, isLoading } = useQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.get(id!),
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
      membershipStatus: '',
      password: '',
      phone: '',
      address: '',
      city: '',
      dateOfBirth: '',
      rank: '',
      membershipNumber: '',
      joinedAt: '',
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email ?? '',
        password: '',
        phone: existing.phone ?? '',
        address: existing.address ?? '',
        city: existing.city ?? '',
        dateOfBirth: existing.dateOfBirth ?? '',
        membershipStatus: existing.membershipStatus,
        rank: existing.rank ?? '',
        membershipNumber: existing.membershipNumber ?? '',
        joinedAt: existing.joinedAt ?? '',
      });
      if (existing.roles?.length) setRoles(existing.roles);
    }
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit
        ? usersApi.update(id!, toPayload(data, roles))
        : usersApi.create({
            ...toPayload(data, roles),
            password: data.password,
          } as Parameters<typeof usersApi.create>[0]),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      navigate(`/members/${saved.id}`);
    },
    onError: (err) => setServerError(errorMessage(err)),
  });

  const onSubmit = (data: FormData) => {
    setServerError('');
    if (!isEdit && !data.password) {
      setServerError('Za novega člana je geslo obvezno.');
      return;
    }
    mutation.mutate(data);
  };

  const toggleRole = (role: SystemRole) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  if (isEdit && isLoading) return <Spinner />;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">
        {isEdit ? 'Uredi člana' : 'Dodaj člana'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card title="Osnovni podatki">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Ime *"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Priimek *"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
            <Input
              label="E-pošta (neobvezno)"
              type="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label={isEdit ? 'Novo geslo (pusti prazno)' : 'Geslo *'}
              type="password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Input label="Telefon" {...register('phone')} />
            <Input
              label="Datum rojstva"
              type="date"
              {...register('dateOfBirth')}
            />
            <Input label="Naslov" {...register('address')} />
            <Input label="Kraj" {...register('city')} />
          </div>
        </Card>

        <Card title="Članstvo">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Status članstva *"
              error={errors.membershipStatus?.message}
              {...register('membershipStatus')}
            >
              <option value="">— izberi status —</option>
              {Object.entries(MEMBERSHIP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Input label="Čin" {...register('rank')} />
            <Input label="Št. izkaznice" {...register('membershipNumber')} />
            <Input label="Član od" type="date" {...register('joinedAt')} />
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-gray-700">Vloge</p>
            <div className="flex flex-wrap gap-3">
              {ASSIGNABLE_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={roles.includes(role)}
                    onChange={() => toggleRole(role)}
                  />
                  {ROLE_LABELS[role]}
                </label>
              ))}
            </div>
          </div>
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
            onClick={() => navigate(-1)}
          >
            Prekliči
          </Button>
        </div>
      </form>
    </div>
  );
}
