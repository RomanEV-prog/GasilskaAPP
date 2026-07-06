import axios from 'axios';
import type { Organization } from '../types';
import api from './client';

const baseURL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const organizationsApi = {
  getMine: (): Promise<Organization> => api.get('/organizations/me'),

  update: (data: Partial<Organization>): Promise<Organization> =>
    api.patch('/organizations/me', data),

  uploadLogo: (file: File): Promise<Organization> => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/organizations/me/logo', fd);
  },

  /**
   * Logotip zahteva JWT (ni javen), zato ga <img> ne more naložiti neposredno.
   * Prenesemo kot blob z avtorizacijo in vrnemo object URL (ali null, če ga ni).
   */
  getLogoBlobUrl: async (): Promise<string | null> => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await axios.get(`${baseURL}/organizations/me/logo`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        responseType: 'blob',
      });
      return URL.createObjectURL(res.data as Blob);
    } catch {
      return null; // društvo nima logotipa
    }
  },
};
