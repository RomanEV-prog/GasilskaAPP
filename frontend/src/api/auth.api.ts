import type {
  LoginResponse,
  LoginResult,
  TwoFactorStatus,
} from '../types';
import api from './client';

export const authApi = {
  login: (
    username: string,
    password: string,
    organizationId?: string,
  ): Promise<LoginResult> =>
    api.post('/auth/login', { username, password, organizationId }),

  verify2fa: (pendingToken: string, code: string): Promise<LoginResponse> =>
    api.post('/auth/2fa/verify', { pendingToken, code }),

  get2faStatus: (): Promise<TwoFactorStatus> => api.get('/auth/2fa/status'),

  setup2fa: (): Promise<{
    secret: string;
    otpauthUrl: string;
    qrDataUrl: string;
  }> => api.post('/auth/2fa/setup'),

  enable2fa: (
    code: string,
  ): Promise<{ message: string; backupCodes: string[] }> =>
    api.post('/auth/2fa/enable', { code }),

  disable2fa: (password: string, code: string): Promise<{ message: string }> =>
    api.post('/auth/2fa/disable', { password, code }),

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
