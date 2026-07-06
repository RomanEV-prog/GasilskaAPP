import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
});

// Avtomatično dodaj JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Izvleči .data iz { success, data } + redirect na login ob 401
api.interceptors.response.use(
  (res) => res.data.data,
  (err) => {
    if (
      err.response?.status === 401 &&
      !window.location.pathname.startsWith('/login')
    ) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data ?? err);
  },
);

export default api;

/** Sporočilo napake iz backend odgovora (string ali seznam validacij). */
export function errorMessage(err: unknown): string {
  const e = err as { message?: string | string[] };
  if (Array.isArray(e?.message)) return e.message.join(' ');
  return e?.message ?? 'Prišlo je do napake.';
}
