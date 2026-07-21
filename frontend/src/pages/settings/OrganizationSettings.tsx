import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { errorMessage } from '../../api/client';
import { organizationsApi } from '../../api/organizations.api';
import { spinApi } from '../../api/spin.api';
import {
  Button,
  Card,
  ErrorState,
  Input,
  Select,
  Spinner,
} from '../../components/ui';
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
  photoUploadLink: string;
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
  // Izbrane občine za SPIN obveščanje (seznam — zunaj react-hook-form).
  const [selectedObcine, setSelectedObcine] = useState<string[]>([]);

  const { data: org, isLoading, isError, refetch } = useQuery({
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
        photoUploadLink: org.photoUploadLink ?? '',
      });
      setSelectedObcine(org.spinObcine ?? []);
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

  if (isError) {
    return (
      <Card title="Društvo">
        <ErrorState
          message="Podatkov o društvu ni bilo mogoče naložiti."
          onRetry={() => refetch()}
        />
      </Card>
    );
  }

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
          // Vedno pošlji seznam (tudi prazen), da backend počisti občine ob
          // odstranitvi zadnje (Object.assign preskoči izpuščene ključe).
          mutation.mutate({ ...d, spinObcine: selectedObcine });
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
          <Input
            label="Povezava za fotografije"
            placeholder="https://photos.google.com/share/..."
            readOnly={readOnly}
            {...register('photoUploadLink')}
          />
        </div>
        {!readOnly && (
          <p className="-mt-2 text-xs text-gray-400">
            Povezava do skupnega albuma (npr. Google Foto, OneDrive), kjer člani
            gledajo in nalagajo slike. V aplikaciji se odpre v brskalniku.
          </p>
        )}

        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700">
            Občine za obveščanje o intervencijah (SPIN)
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            Izberi svojo občino in po želji sosednje občine, s katerimi društvo
            sodeluje. Operativni člani prejmejo obvestilo ob vsaki novi
            intervenciji SPIN v teh občinah (vir: spin3.sos112.si).
          </p>

          {selectedObcine.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedObcine.map((naziv) => (
                <span
                  key={naziv}
                  className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-sm text-red-700"
                >
                  {naziv}
                  {!readOnly && (
                    <button
                      type="button"
                      aria-label={`Odstrani ${naziv}`}
                      className="ml-0.5 text-red-500 hover:text-red-800"
                      onClick={() =>
                        setSelectedObcine((prev) =>
                          prev.filter((n) => n !== naziv),
                        )
                      }
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-400">
              Ni izbranih občin — obveščanje je izklopljeno.
            </p>
          )}

          {!readOnly && (
            <div className="mt-3 max-w-xs">
              <Select
                label="Dodaj občino"
                value=""
                onChange={(e) => {
                  const naziv = e.target.value;
                  if (naziv && !selectedObcine.includes(naziv)) {
                    setSelectedObcine((prev) => [...prev, naziv]);
                  }
                }}
              >
                <option value="">— izberi občino —</option>
                {obcine
                  ?.filter((o) => !selectedObcine.includes(o.naziv))
                  .map((o) => (
                    <option key={o.id} value={o.naziv}>
                      {o.naziv} ({o.regija})
                    </option>
                  ))}
              </Select>
            </div>
          )}
        </div>

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
