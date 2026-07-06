import type { AdminDashboard, MemberDashboard } from '../types';
import api from './client';

export const dashboardApi = {
  admin: (): Promise<AdminDashboard> => api.get('/dashboard/admin'),
  member: (): Promise<MemberDashboard> => api.get('/dashboard/member'),
};
