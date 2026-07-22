import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sl } from 'date-fns/locale';
import { spinApi, type SpinIntervention } from '../../api/spin.api';
import { Badge, EmptyState, ErrorState, Spinner } from '../../components/ui';

function InterventionCard({ it }: { it: SpinIntervention }) {
  const kraj = it.obcina;
  const time = it.occurredAt
    ? format(new Date(it.occurredAt), 'd. MMMM yyyy · HH:mm', { locale: sl })
    : null;
  const body = (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">
            🚨 {it.spinType ?? 'Intervencija'}
            {kraj && <span className="font-normal text-gray-500"> — {kraj}</span>}
          </p>
          {time && <p className="mt-0.5 text-sm text-gray-500">{time}</p>}
        </div>
        <Badge color="red">SPIN</Badge>
      </div>
      {it.description && it.description !== kraj && (
        <p className="mt-2 whitespace-pre-line text-sm text-gray-700">
          {it.description}
        </p>
      )}
    </div>
  );
  // Povezava na SPIN portal (če obstaja) odpre podrobnosti v novem zavihku.
  return it.link ? (
    <a href={it.link} target="_blank" rel="noopener noreferrer" className="block">
      {body}
    </a>
  ) : (
    body
  );
}

export function SpinPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['spin', 'interventions'],
    queryFn: spinApi.interventions,
    // Feed se osvežuje pogosto; podatki naj ne bodo predolgo stari.
    refetchInterval: 2 * 60 * 1000,
  });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">SPIN — intervencije</h1>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Nedavne intervencije iz portala SPIN za občine vašega društva. Občine
        nastavite v <span className="font-medium">Nastavitve → Društvo</span>.
      </p>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState
          message="Intervencij ni bilo mogoče naložiti."
          onRetry={() => refetch()}
        />
      ) : !data || data.length === 0 ? (
        <EmptyState message="Ni nedavnih intervencij za izbrane občine. (Če jih pričakujete, preverite izbrane občine v nastavitvah društva.)" />
      ) : (
        <div className="space-y-2">
          {data.map((it) => (
            <InterventionCard key={it.id} it={it} />
          ))}
        </div>
      )}
    </div>
  );
}
