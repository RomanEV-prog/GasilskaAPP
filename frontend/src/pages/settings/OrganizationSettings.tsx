import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { errorMessage } from '../../api/client';
import { organizationsApi } from '../../api/organizations.api';
import { spinApi } from '../../api/spin.api';
import { Button, Card, Input, Select, Spinner } from '../../components/ui';
import { useAuth } from '../../stores/auth.store';
import type { Organization } from '../../types';

type FormData = {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  spinObcina: string;
};

function LogoBlock({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const { data: logoUrl, isLoading } = useQuery({
    queryKey: ['organization', 'logo'],
    queryFn: organizationsApi.getLogoBlobUrl,
  });

  const upload = useMutation({
    mutationFn: (file: File) => organizationsApi.uploadLogo(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'logo'] });
      queryClient.invalidateQueries({ queryKey: ['organization', 'me'] });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  return (
    <div className="flex items-center gap-5">
      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        {isLoading ? (
          <span className="text-xs text-gray-400">...</span>
        ) : logoUrl ? (
          <img
            src={logoUrl}
            alt="Logotip društva"
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-3xl">🔥</span>
        )}
      </div>
      {canEdit && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setError('');
                upload.mutate(file);
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
          >
            {upload.isPending ? 'Nalaganje ...' : 'Naloži logotip'}
          </Button>
          <p className="mt-1 text-xs text-gray-400">PNG, JPEG ali SVG, do 2 MB.</p>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

export function OrganizationSettings() {
  const { isLeadership } = useAuth();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');
  const [saved, setSaved] = useState(false);

  const { data: org, isLoading } = useQuery({
    queryKey: ['organization', 'me'],
    queryFn: organizationsApi.getMine,
  });

  const { data: obcine } = useQuery({
    queryKey: ['spin', 'obcine'],
    queryFn: spinApi.obcine,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  useEffect(() => {
    if (org) {
      reset({
        name: org.name ?? '',
        address: org.address ?? '',
        city: org.city ?? '',
        postalCode: org.postalCode ?? '',
        phone: org.phone ?? '',
        email: org.email ?? '',
        website: org.website ?? '',
        spinObcina: org.spinObcina ?? '',
      });
    }
  }, [org, reset]);

  const mutation = useMutation({
    mutationFn: (data: Partial<Organization>) =>
      organizationsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'me'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (err) => setServerError(errorMessage(err)),
  });

  if (isLoading || !org) {
    return (
      <Card title="Društvo">
        <Spinner />
      </Card>
    );
  }

  const readOnly = !isLeadership;

  return (
    <Card title="Društvo">
      <div className="mb-6">
        <LogoBlock canEdit={isLeadership} />
      </div>

      <form
        onSubmit={handleSubmit((d) => {
          setServerError('');
          const match = obcine?.find((o) => o.naziv === d.spinObcina);
          // Pošlji null (ne undefined) ob izbiri "brez obveščanja", da backend
          // dejansko počisti občino (Object.assign preskoči izpuščene ključe).
          mutation.mutate({
            ...d,
            spinObcina: d.spinObcina || null,
            spinObcinaId: d.spinObcina ? match?.id ?? null : null,
          });
        })}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Naziv" readOnly={readOnly} {...register('name')} />
          <Input
            label="Oznaka (slug)"
            value={org.slug}
            readOnly
            disabled
          />
          <Input label="Naslov" readOnly={readOnly} {...register('address')} />
          <Input label="Kraj" readOnly={readOnly} {...register('city')} />
          <Input
            label="Poštna številka"
            readOnly={readOnly}
            {...register('postalCode')}
          />
          <Input label="Telefon" readOnly={readOnly} {...register('phone')} />
          <Input
            label="E-pošta"
            type="email"
            readOnly={readOnly}
            error={errors.email?.message}
            {...register('email')}
          />
          <Input label="Spletna stran" readOnly={readOnly} {...register('website')} />
          <Select
            label="Občina (obveščanje o intervencijah SPIN)"
            disabled={readOnly}
            {...register('spinObcina')}
          >
            <option value="">— brez obveščanja —</option>
            {obcine?.map((o) => (
              <option key={o.id} value={o.naziv}>
                {o.naziv} ({o.regija})
              </option>
            ))}
          </Select>
        </div>
        <p className="-mt-2 text-xs text-gray-400">
          Ob izbiri občine bodo operativni člani prejeli obvestilo ob vsaki novi
          intervenciji SPIN v tej občini (vir: spin3.sos112.si).
        </p>

        {serverError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}

        {isLeadership ? (
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Shranjevanje ...' : 'Shrani spremembe'}
            </Button>
            {saved && (
              <span className="text-sm text-green-700">✓ Shranjeno</span>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            Podatke društva lahko urejata administrator in predsednik.
          </p>
        )}
      </form>
    </Card>
  );
}
