import type { Equipment } from '../types';
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
};
