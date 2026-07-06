import type { Event, EventRsvpEntry, RsvpStatus } from '../types';
import api from './client';

export const eventsApi = {
  list: (params?: {
    eventType?: string;
    from?: string;
    to?: string;
    includeCancelled?: string;
  }): Promise<Event[]> => api.get('/events', { params }),

  upcoming: (): Promise<Event[]> => api.get('/events/upcoming'),

  get: (id: string): Promise<Event> => api.get(`/events/${id}`),

  create: (data: Partial<Event>): Promise<Event> => api.post('/events', data),

  update: (id: string, data: Partial<Event>): Promise<Event> =>
    api.patch(`/events/${id}`, data),

  cancel: (id: string): Promise<Event> => api.patch(`/events/${id}/cancel`),

  rsvp: (id: string, status: RsvpStatus, note?: string): Promise<unknown> =>
    api.post(`/events/${id}/rsvp`, { status, note }),

  rsvps: (id: string): Promise<EventRsvpEntry[]> =>
    api.get(`/events/${id}/rsvps`),

  markAttendance: (
    id: string,
    entries: { userId: string; present: boolean }[],
  ): Promise<unknown> => api.post(`/events/${id}/attendance`, { entries }),
};
