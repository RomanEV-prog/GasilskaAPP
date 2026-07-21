import type { Vehicle, VehicleWrite } from '../types';
import api from './client';

export const vehiclesApi = {
  list: (): Promise<Vehicle[]> => api.get('/vehicles'),

  get: (id: string): Promise<Vehicle> => api.get(`/vehicles/${id}`),

  expiring: (days = 30): Promise<Vehicle[]> =>
    api.get('/vehicles/expiring', { params: { days } }),

  create: (data: VehicleWrite): Promise<Vehicle> =>
    api.post('/vehicles', data),

  update: (id: string, data: VehicleWrite): Promise<Vehicle> =>
    api.patch(`/vehicles/${id}`, data),

  deactivate: (id: string): Promise<Vehicle> => api.delete(`/vehicles/${id}`),

  addDriver: (id: string, userId: string): Promise<unknown> =>
    api.post(`/vehicles/${id}/drivers`, { userId }),

  removeDriver: (id: string, userId: string): Promise<unknown> =>
    api.delete(`/vehicles/${id}/drivers/${userId}`),
};
