import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { equipmentApi } from '../../api/equipment.api';
import { usersApi } from '../../api/users.api';
import { Button, Input, Select } from '../../components/ui';
import {
  EQUIPMENT_CONDITION_LABELS,
  type Equipment,
  type EquipmentCondition,
} from '../../types';

/** Napaka iz axios interceptorja — sporočilo je že v slovenščini z backenda. */
function errorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string } } })?.response
    ?.data?.message;
  return typeof msg === 'string' ? msg : fallback;
}

/**
 * Zadolžitev ali vračilo kosa opreme. Isti obrazec pokriva oboje —
 * razlikuje se le v poljih in klicu.
 */
export function AssignEquipmentModal({
  equipment,
  mode,
  onClose,
}: {
  equipment: Equipment;
  mode: 'issue' | 'return';
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');
  const [condition, setCondition] = useState<EquipmentCondition | ''>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Seznam članov je za navadne člane skrčen, a ta obrazec vidijo le upravljavci.
  const { data: members } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
    enabled: mode === 'issue',
  });

  const mutation = useMutation({
    mutationFn: () =>
      mode === 'issue'
        ? equipmentApi.issue(equipment.id, {
            userId,
            conditionAtIssue: condition || undefined,
            issueNotes: notes || undefined,
          })
        : equipmentApi.returnItem(equipment.id, {
            conditionAtReturn: condition || undefined,
            returnNotes: notes || undefined,
          }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['equipment'] });
      await qc.invalidateQueries({ queryKey: ['equipment', equipment.id] });
      await qc.invalidateQueries({
        queryKey: ['equipment-assignments', equipment.id],
      });
      onClose();
    },
    onError: (err) =>
      setError(
        errorMessage(
          err,
          mode === 'issue'
            ? 'Zadolžitve ni bilo mogoče shraniti.'
            : 'Vračila ni bilo mogoče shraniti.',
        ),
      ),
  });

  const isIssue = mode === 'issue';
  const canSubmit = isIssue ? userId !== '' : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-bold">
          {isIssue ? 'Zadolži opremo' : 'Vrni opremo'}
        </h2>
        <p className="mb-4 text-sm text-gray-500">{equipment.name}</p>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="space-y-3">
          {isIssue && (
            <div>
              <label className="mb-1 block text-sm font-medium">Član</label>
              <Select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              >
                <option value="">— izberi člana —</option>
                {members?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.lastName} {m.firstName}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">
              {isIssue ? 'Stanje ob prevzemu' : 'Stanje ob vračilu'}
            </label>
            <Select
              value={condition}
              onChange={(e) =>
                setCondition(e.target.value as EquipmentCondition | '')
              }
            >
              <option value="">— brez spremembe —</option>
              {Object.entries(EQUIPMENT_CONDITION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Opomba</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isIssue ? 'npr. predano ob vaji' : 'npr. vrnjeno poškodovano'
              }
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Prekliči
          </Button>
          <Button
            onClick={() => {
              setError('');
              mutation.mutate();
            }}
            disabled={!canSubmit || mutation.isPending}
          >
            {mutation.isPending
              ? 'Shranjujem …'
              : isIssue
                ? 'Zadolži'
                : 'Vrni'}
          </Button>
        </div>
      </div>
    </div>
  );
}
