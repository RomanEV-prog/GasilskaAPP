import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { errorMessage } from '../../api/client';
import { Button, Input } from '../../components/ui';
import { useAuth } from '../../stores/auth.store';

/** Pretvori naziv društva v veljaven slug (č/š/ž → c/s/z, presledki → -). */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/č/g, 'c')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const schema = z.object({
  organizationName: z.string().min(1, 'Vnesite naziv društva.'),
  organizationSlug: z
    .string()
    .min(1, 'Vnesite oznako društva.')
    .regex(/^[a-z0-9-]+$/, 'Oznaka: le male črke, številke in vezaji.'),
  firstName: z.string().min(1, 'Vnesite ime.'),
  lastName: z.string().min(1, 'Vnesite priimek.'),
  email: z.string().email('Vnesite veljaven e-poštni naslov.'),
  password: z.string().min(8, 'Geslo mora imeti vsaj 8 znakov.'),
});

type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const { register: registerOrg } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const slug = watch('organizationSlug');

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      await registerOrg(data);
      navigate('/');
    } catch (err) {
      setServerError(errorMessage(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F8F8] py-8">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
          <span className="text-4xl">🔥</span>
          <h1 className="mt-2 text-2xl font-bold">Registracija društva</h1>
          <p className="text-sm text-gray-500">
            Ustvari nov račun za svoje gasilsko društvo
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Naziv društva"
            placeholder="PGD Pekre"
            error={errors.organizationName?.message}
            {...register('organizationName', {
              onChange: (e) => {
                if (!slugEdited) {
                  setValue('organizationSlug', slugify(e.target.value), {
                    shouldValidate: true,
                  });
                }
              },
            })}
          />
          <Input
            label="Oznaka (za povezavo)"
            placeholder="pgd-pekre"
            error={errors.organizationSlug?.message}
            {...register('organizationSlug', {
              onChange: () => setSlugEdited(true),
            })}
          />
          {slug && !errors.organizationSlug && (
            <p className="-mt-2 text-xs text-gray-400">
              Vaš portal: gasilapp.si/{slug}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ime"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Priimek"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>

          <Input
            label="E-pošta"
            type="email"
            autoComplete="email"
            placeholder="ime@drustvo.si"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Geslo"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />

          {serverError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverError}
            </p>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Ustvarjanje ...' : 'Ustvari društvo'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Že imate račun?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Prijava
          </Link>
        </p>
      </div>
    </div>
  );
}
