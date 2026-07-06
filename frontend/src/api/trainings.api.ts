import type { Training } from '../types';
import api from './client';

export const trainingsApi = {
  list: (): Promise<Training[]> => api.get('/trainings'),

  mine: (): Promise<Training[]> => api.get('/trainings/me'),

  expiring: (days = 60): Promise<Training[]> =>
    api.get('/trainings/expiring', { params: { days } }),

  byUser: (userId: string): Promise<Training[]> =>
    api.get(`/trainings/user/${userId}`),

  create: (data: Partial<Training>): Promise<Training> =>
    api.post('/trainings', data),

  update: (id: string, data: Partial<Training>): Promise<Training> =>
    api.patch(`/trainings/${id}`, data),

  remove: (id: string): Promise<void> => api.delete(`/trainings/${id}`),
};
