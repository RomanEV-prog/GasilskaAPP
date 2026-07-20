import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { equipmentApi } from '../../api/equipment.api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Spinner,
} from '../../components/ui';
import { useAuth } from '../../stores/auth.store';
import {
  EQUIPMENT_CONDITION_LABELS,
  EQUIPMENT_MANAGE_ROLES,
  type EquipmentCondition,
} from '../../types';
import { AssignEquipmentModal } from './AssignEquipmentModal';

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

/** Slovensko sklanjanje let: 1 leto, 2 leti, 3–4 leta, 5+ let. */
function letaOblika(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 === 1 || (mod10 === 1 && mod100 !== 11)) return `${n} leto`;
  if (mod100 === 2 || (mod10 === 2 && mod100 !== 12)) return `${n} leti`;
  if (mod10 === 3 || mod10 === 4) return `${n} leta`;
  return `${n} let`;
}

/** Starost opreme iz datuma nabave; brez njega ne ugibamo. */
function starost(purchaseDate?: string): string {
  if (!purchaseDate) return '—';
  const months = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(purchaseDate).getTime()) /
        (1000 * 60 * 60 * 24 * 30.44),
    ),
  );
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} mes.`;
  return rest === 0
    ? letaOblika(years)
    : `${letaOblika(years)} ${rest} mes.`;
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-2 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-medium">{children}</span>
    </div>
  );
}

export function EquipmentDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const canManage =
    user?.roles.some((r) => EQUIPMENT_MANAGE_ROLES.includes(r)) ?? false;

  const [modal, setModal] = useState<'issue' | 'return' | null>(null);

  const {
    data: equipment,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => equipmentApi.get(id),
  });

  // Zgodovina je samo za upravljavce — brez pravic je klic 403.
  const { data: history } = useQuery({
    queryKey: ['equipment-assignments', id],
    queryFn: () => equipmentApi.assignments(id),
    enabled: canManage && !!id,
  });

  if (isLoading) return <Spinner />;
  if (isError || !equipment)
    return (
      <ErrorState
        message="Podatkov o opremi ni bilo mogoče naložiti."
        onRetry={() => refetch()}
      />
    );

  const holder = equipment.currentHolder;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{equipment.name}</h1>
          <p className="text-sm text-gray-500">
            {equipment.category ?? 'Brez kategorije'}
            {equipment.inventoryNumber && ` · ${equipment.inventoryNumber}`}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            {holder ? (
              <Button onClick={() => setModal('return')}>Vrni opremo</Button>
            ) : (
              <Button onClick={() => setModal('issue')}>Zadolži opremo</Button>
            )}
            <Link to={`/equipment/${equipment.id}/edit`}>
              <Button variant="secondary">Uredi</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Trenutna zadolžitev — glavni podatek ob skeniranju */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">
          Trenutno zadolženo
        </h2>
        {holder ? (
          <p className="text-lg font-medium">
            {holder.lastName} {holder.firstName}
            <span className="ml-2 text-sm font-normal text-gray-500">
              od {dt(equipment.issuedAt)}
            </span>
          </p>
        ) : (
          <p className="text-lg text-gray-400">Prosto</p>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">
            Podatki
          </h2>
          <Row label="Stanje">
            <Badge color={conditionColor[equipment.condition]}>
              {EQUIPMENT_CONDITION_LABELS[equipment.condition]}
            </Badge>
          </Row>
          <Row label="Lokacija">{equipment.location ?? '—'}</Row>
          <Row label="Vozilo">{equipment.vehicle?.name ?? '—'}</Row>
          <Row label="Datum nabave">{dt(equipment.purchaseDate)}</Row>
          <Row label="Starost">{starost(equipment.purchaseDate)}</Row>
          <Row label="Zadnji pregled">{dt(equipment.lastInspection)}</Row>
          <Row label="Naslednji pregled">{dt(equipment.nextInspection)}</Row>
          <Row label="Rok veljave">{dt(equipment.expiryDate)}</Row>
        </Card>

        <Card>
          <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">
            Oznake
          </h2>
          <Row label="QR koda">{equipment.qrCode ?? '—'}</Row>
          <Row label="NFC oznaka">
            {equipment.nfcUid ?? (
              <span className="text-gray-400">ni povezana</span>
            )}
          </Row>
          {equipment.notes && (
            <div className="pt-3">
              <p className="mb-1 text-sm text-gray-500">Opombe</p>
              <p className="text-sm whitespace-pre-line">{equipment.notes}</p>
            </div>
          )}
          <p className="pt-3 text-xs text-gray-400">
            NFC oznako povežete z mobilno aplikacijo (Oprema → Poveži NFC
            oznako).
          </p>
        </Card>
      </div>

      {canManage && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">
            Zgodovina zadolžitev
          </h2>
          {!history || history.length === 0 ? (
            <EmptyState message="Ta kos opreme še ni bil zadolžen." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-2 pr-4">Član</th>
                    <th className="py-2 pr-4">Zadolženo</th>
                    <th className="py-2 pr-4">Vrnjeno</th>
                    <th className="py-2 pr-4">Ob prevzemu</th>
                    <th className="py-2 pr-4">Ob vračilu</th>
                    <th className="py-2">Opombe</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="py-2 pr-4 font-medium">
                        {a.user
                          ? `${a.user.lastName} ${a.user.firstName}`
                          : '—'}
                      </td>
                      <td className="py-2 pr-4">{dt(a.issuedAt)}</td>
                      <td className="py-2 pr-4">
                        {a.returnedAt ? (
                          dt(a.returnedAt)
                        ) : (
                          <Badge color="yellow">še zadolženo</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-gray-600">
                        {a.conditionAtIssue
                          ? EQUIPMENT_CONDITION_LABELS[a.conditionAtIssue]
                          : '—'}
                      </td>
                      <td className="py-2 pr-4 text-gray-600">
                        {a.conditionAtReturn
                          ? EQUIPMENT_CONDITION_LABELS[a.conditionAtReturn]
                          : '—'}
                      </td>
                      <td className="py-2 text-gray-600">
                        {[a.issueNotes, a.returnNotes]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {modal && (
        <AssignEquipmentModal
          equipment={equipment}
          mode={modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
