import type { AvailabilityStatus, User } from '../types';
import api from './client';

export const usersApi = {
  list: (params?: {
    membershipStatus?: string;
    isActive?: string;
  }): Promise<User[]> => api.get('/users', { params }),

  get: (id: string): Promise<User> => api.get(`/users/${id}`),

  create: (data: Partial<User> & { password: string }): Promise<User> =>
    api.post('/users', data),

  update: (id: string, data: Partial<User>): Promise<User> =>
    api.patch(`/users/${id}`, data),

  deactivate: (id: string): Promise<User> => api.delete(`/users/${id}`),

  updateMyAvailability: (availability: AvailabilityStatus): Promise<User> =>
    api.patch('/users/me/availability', { availability }),

  availabilityBreakdown: (): Promise<Record<string, number>> =>
    api.get('/users/availability'),
};
