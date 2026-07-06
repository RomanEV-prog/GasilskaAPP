import type { AppNotification, NotificationTarget } from '../types';
import api from './client';

export const notificationsApi = {
  mine: (): Promise<AppNotification[]> => api.get('/notifications'),

  all: (): Promise<AppNotification[]> => api.get('/notifications/all'),

  create: (data: {
    title: string;
    body: string;
    type?: string;
    target?: NotificationTarget;
    targetUserIds?: string[];
  }): Promise<AppNotification> => api.post('/notifications', data),

  markRead: (id: string): Promise<unknown> =>
    api.patch(`/notifications/${id}/read`),

  reads: (
    id: string,
  ): Promise<
    { readAt: string; user: { id: string; firstName: string; lastName: string } | null }[]
  > => api.get(`/notifications/${id}/reads`),
};
