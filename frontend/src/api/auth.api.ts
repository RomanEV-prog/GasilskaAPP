import type { LoginResponse } from '../types';
import api from './client';

export const authApi = {
  login: (
    username: string,
    password: string,
    organizationId?: string,
  ): Promise<LoginResponse> =>
    api.post('/auth/login', { username, password, organizationId }),

  publicOrganizations: (): Promise<{ id: string; name: string }[]> =>
    api.get('/auth/organizations'),

  changePassword: (
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> =>
    api.post('/auth/change-password', { currentPassword, newPassword }),

  register: (data: {
    activationCode: string;
    organizationName: string;
    organizationSlug: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<LoginResponse> => api.post('/auth/register', data),

  updateFcmToken: (fcmToken: string): Promise<unknown> =>
    api.patch('/auth/fcm-token', { fcmToken }),
};
