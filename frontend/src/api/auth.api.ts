import type { LoginResponse } from '../types';
import api from './client';

export const authApi = {
  login: (email: string, password: string): Promise<LoginResponse> =>
    api.post('/auth/login', { email, password }),

  register: (data: {
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
