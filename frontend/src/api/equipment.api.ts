import type {
  Equipment,
  EquipmentAssignment,
  EquipmentCondition,
  MyEquipmentAssignment,
} from '../types';
import api from './client';

export const equipmentApi = {
  list: (params?: {
    category?: string;
    condition?: string;
    vehicleId?: string;
  }): Promise<Equipment[]> => api.get('/equipment', { params }),

  get: (id: string): Promise<Equipment> => api.get(`/equipment/${id}`),

  inspectionsDue: (days = 30): Promise<Equipment[]> =>
    api.get('/equipment/inspections-due', { params: { days } }),

  create: (data: Partial<Equipment>): Promise<Equipment> =>
    api.post('/equipment', data),

  update: (id: string, data: Partial<Equipment>): Promise<Equipment> =>
    api.patch(`/equipment/${id}`, data),

  deactivate: (id: string): Promise<Equipment> =>
    api.delete(`/equipment/${id}`),

  // ── Zadolžitve ──────────────────────────────────────────────────────────

  /** Moja zadolžena oprema — dostopno vsakemu prijavljenemu članu. */
  myAssignments: (): Promise<MyEquipmentAssignment[]> =>
    api.get('/equipment/my-assignments'),

  /** Zgodovina zadolžitev kosa opreme — samo upravljavci. */
  assignments: (id: string): Promise<EquipmentAssignment[]> =>
    api.get(`/equipment/${id}/assignments`),

  issue: (
    id: string,
    data: {
      userId: string;
      issuedAt?: string;
      conditionAtIssue?: EquipmentCondition;
      issueNotes?: string;
    },
  ): Promise<EquipmentAssignment> =>
    api.post(`/equipment/${id}/assignments`, data),

  returnItem: (
    id: string,
    data: {
      returnedAt?: string;
      conditionAtReturn?: EquipmentCondition;
      returnNotes?: string;
    },
  ): Promise<EquipmentAssignment> =>
    api.post(`/equipment/${id}/assignments/return`, data),
};
