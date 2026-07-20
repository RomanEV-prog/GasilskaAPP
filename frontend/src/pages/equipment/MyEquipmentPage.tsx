import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { equipmentApi } from '../../api/equipment.api';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Spinner,
} from '../../components/ui';
import {
  EQUIPMENT_CONDITION_LABELS,
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

const dt = (v?: string | null) =>
  v ? format(new Date(v), 'd. M. yyyy') : '—';

/**
 * Oprema, ki jo ima prijavljeni član trenutno zadolženo.
 * Dostopno vsem članom — vsak vidi samo svoje.
 */
export function MyEquipmentPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-equipment'],
    queryFn: equipmentApi.myAssignments,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Moja zadolžena oprema</h1>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState
          message="Podatkov ni bilo mogoče naložiti."
          onRetry={() => refetch()}
        />
      ) : !data || data.length === 0 ? (
        <EmptyState message="Trenutno nimate zadolžene opreme." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((a) => (
            <Card key={a.id}>
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{a.equipment?.name ?? '—'}</p>
                  <p className="text-sm text-gray-500">
                    {a.equipment?.category ?? 'Brez kategorije'}
                    {a.equipment?.inventoryNumber &&
                      ` · ${a.equipment.inventoryNumber}`}
                  </p>
                </div>
                {a.equipment && (
                  <Badge color={conditionColor[a.equipment.condition]}>
                    {EQUIPMENT_CONDITION_LABELS[a.equipment.condition]}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Zadolženo od {dt(a.issuedAt)}
              </p>
              {a.equipment?.nextInspection && (
                <p className="text-sm text-gray-600">
                  Naslednji pregled: {dt(a.equipment.nextInspection)}
                </p>
              )}
              {a.equipment?.expiryDate && (
                <p className="text-sm text-gray-600">
                  Rok veljave: {dt(a.equipment.expiryDate)}
                </p>
              )}
              {a.issueNotes && (
                <p className="mt-2 text-sm text-gray-500">{a.issueNotes}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
