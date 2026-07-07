import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { authApi } from '../../api/auth.api';
import { errorMessage } from '../../api/client';
import { Button, Input, Select } from '../../components/ui';
import { useAuth } from '../../stores/auth.store';

const schema = z
  .object({
    organizationId: z.string(),
    username: z.string().min(1, 'Vnesite uporabniško ime.'),
    password: z.string().min(1, 'Vnesite geslo.'),
  })
  .refine((d) => d.username.includes('@') || d.organizationId, {
    path: ['organizationId'],
    message: 'Izberite svoje društvo.',
  });

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  // Javni seznam društev; zadnja izbira se zapomni za naslednjič.
  const { data: organizations } = useQuery({
    queryKey: ['public-organizations'],
    queryFn: authApi.publicOrganizations,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: localStorage.getItem('lastOrganizationId') ?? '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      await login(
        data.username,
        data.password,
        data.organizationId || undefined,
      );
      if (data.organizationId) {
        localStorage.setItem('lastOrganizationId', data.organizationId);
      }
      navigate('/');
    } catch (err) {
      setServerError(errorMessage(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F8F8]">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
          <span className="text-4xl">🔥</span>
          <h1 className="mt-2 text-2xl font-bold">GasilApp</h1>
          <p className="text-sm text-gray-500">
            Portal za gasilska društva
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Društvo"
            error={errors.organizationId?.message}
            {...register('organizationId')}
          >
            <option value="">— izberite društvo —</option>
            {organizations?.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
          <Input
            label="Uporabniško ime"
            autoComplete="username"
            placeholder="ime.priimek"
            error={errors.username?.message}
            {...register('username')}
          />
          <Input
            label="Geslo"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          {serverError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverError}
            </p>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Prijavljanje ...' : 'Prijava'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Nimate računa?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Registrirajte društvo
          </Link>
        </p>
      </div>
    </div>
  );
}
